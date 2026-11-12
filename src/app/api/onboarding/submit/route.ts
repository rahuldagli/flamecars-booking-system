import { NextResponse } from 'next/server';
import { applicationStore, stripOversizedData } from '@/lib/serverStore';
import { DriverApplication } from '@/types/onboarding';
import { detectNameDiscrepancies } from '@/lib/nameCheck';
import { sendDriverRegistrationEmail, getAppBaseUrl, SendEmailResult } from '@/lib/mailgun';

export async function POST(req: Request) {
  try {
    const application: DriverApplication = await req.json();

    if (!application.legalName || !application.mobileNumber || !application.email) {
      return NextResponse.json({ error: 'Personal details are incomplete' }, { status: 400 });
    }

    if (!application.vrm) {
      return NextResponse.json({ error: 'Vehicle details are incomplete' }, { status: 400 });
    }

    if (!application.bankAccountName || !application.bankAccountNumber || !application.bankSortCode) {
      return NextResponse.json(
        { error: 'Bank account details are required for driver fare disbursements' },
        { status: 400 }
      );
    }

    if (!application.termsAccepted) {
      return NextResponse.json(
        { error: 'You must accept the independent driver agreement' },
        { status: 400 }
      );
    }

    // Enforce name discrepancy confirmation if third-party documentation is attached
    const discrepancies = detectNameDiscrepancies(application);
    if (discrepancies.length > 0 && !application.nameMismatchConfirmed) {
      return NextResponse.json(
        {
          error:
            'Document Name Discrepancy: You have attached documentation with different name details. Please review and confirm the name discrepancy on the review screen before submitting.',
          discrepancies,
        },
        { status: 400 }
      );
    }

    // Query existing record to preserve IDs and detect changes
    let existing = (application.id ? applicationStore.get(application.id) : undefined)
      || (application.referenceNumber ? applicationStore.get(application.referenceNumber) : undefined)
      || (application.mobileNumber ? applicationStore.get(application.mobileNumber) : undefined);

    if (!existing) {
      if (application.id) existing = await applicationStore.getAsync(application.id);
      if (!existing && application.referenceNumber) existing = await applicationStore.getAsync(application.referenceNumber);
      if (!existing && application.mobileNumber) existing = await applicationStore.getAsync(application.mobileNumber);
    }

    if (existing) {
      application.id = existing.id;
      application.referenceNumber = existing.referenceNumber;
      if (existing.tbmsDriverId) {
        application.tbmsDriverId = existing.tbmsDriverId;
        const syncedName = existing.syncedName || existing.legalName;
        application.syncedName = syncedName;
        if (application.legalName.trim() !== syncedName.trim()) {
          application.detailsModifiedAfterSync = true;
          application.lastModifiedFields = [
            `Legal Name updated: "${application.legalName.trim()}" (synced in TBMS as "${syncedName.trim()}")`,
          ];
        }
      }
      // If already active in TBMS, keep active status; if not, keep under review
      application.status = existing.status === 'ACTIVE' ? 'ACTIVE' : 'UNDER_REVIEW';
      application.tbmsSyncStatus = existing.tbmsSyncStatus || 'NOT_SYNCED';
    } else {
      // New registration: Set initial registration status to UNDER_REVIEW (Inactive)
      // Business Rule: By default, the driver remains inactive and is NOT activated in TBMS
      // until compliance staff reviews uploaded documents and approves the profile.
      application.status = 'UNDER_REVIEW';
      application.tbmsSyncStatus = 'NOT_SYNCED';
    }

    application.submittedAt = application.submittedAt || new Date().toISOString();
    application.updatedAt = new Date().toISOString();
    application.currentStep = 6;

    // Save lightweight application to server store immediately (stripping oversized raw base64 data)
    let saved = await applicationStore.saveAsync(stripOversizedData(application));

    // Compute preview & modify URL for driver email
    const baseUrl = getAppBaseUrl(req);
    const previewUrl = `${baseUrl}/?ref=${encodeURIComponent(saved.referenceNumber)}`;

    // Dispatch email notification to driver via Mailgun
    let emailResult: SendEmailResult = { success: false, skipped: true, error: 'Not initiated' };
    try {
      emailResult = await sendDriverRegistrationEmail(saved, previewUrl);
      if (emailResult.success) {
        saved.emailNotificationSent = true;
        saved.emailNotificationAt = new Date().toISOString();
        saved.emailNotificationError = undefined;
        saved = await applicationStore.saveAsync(saved);
      } else if (!emailResult.skipped) {
        saved.emailNotificationSent = false;
        saved.emailNotificationError = emailResult.error;
        saved = await applicationStore.saveAsync(saved);
      }
    } catch (emailErr: any) {
      console.error('[MAILGUN] Unexpected exception dispatching email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message:
        'Registration submitted successfully! Your application is under compliance review. Your driver profile remains inactive pending staff approval.',
      status: 'UNDER_REVIEW',
      application: saved,
      referenceNumber: saved.referenceNumber,
      previewUrl,
      tbmsSyncStatus: 'NOT_SYNCED',
      emailNotification: emailResult,
    });
  } catch (error) {
    console.error('Submission Error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
