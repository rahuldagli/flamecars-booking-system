import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';
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

    // Set initial registration status to UNDER_REVIEW (Inactive)
    // Business Rule: By default, the driver remains inactive and is NOT activated in TBMS
    // until compliance staff reviews uploaded documents and approves the profile.
    application.status = 'UNDER_REVIEW';
    application.submittedAt = application.submittedAt || new Date().toISOString();
    application.currentStep = 6;
    application.tbmsSyncStatus = 'NOT_SYNCED';

    // Save application to server store immediately
    let saved = await applicationStore.saveAsync(application);

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
