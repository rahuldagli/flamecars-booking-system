import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';
import { DriverApplication } from '@/types/onboarding';
import { detectNameDiscrepancies } from '@/lib/nameCheck';
import { syncDriverToTbms } from '@/lib/tbms';
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
      return NextResponse.json({ error: 'Bank account details are required for driver fare disbursements' }, { status: 400 });
    }

    if (!application.termsAccepted) {
      return NextResponse.json({ error: 'You must accept the independent driver agreement' }, { status: 400 });
    }

    // Enforce name discrepancy confirmation if different person documentation is attached
    const discrepancies = detectNameDiscrepancies(application);
    if (discrepancies.length > 0 && !application.nameMismatchConfirmed) {
      return NextResponse.json(
        {
          error:
            'Document Name Discrepancy: You have attached documentation for a different person. Please review and confirm the name discrepancy on the review screen before submitting.',
          discrepancies,
        },
        { status: 400 }
      );
    }

    // Set submitted status
    application.status = 'SUBMITTED';
    application.submittedAt = application.submittedAt || new Date().toISOString();
    application.currentStep = 6;

    // Automatically sync driver into TBMS Dispatch System on registration
    try {
      const tbmsResult = await syncDriverToTbms(application);
      if (tbmsResult.success && tbmsResult.driverId) {
        application.tbmsDriverId = tbmsResult.driverId;
        application.tbmsSyncStatus = 'SYNCED';
        application.tbmsSyncError = undefined;
        console.log(`[TBMS AUTO-SYNC] Successfully created driver in TBMS (Driver ID: ${tbmsResult.driverId})`);
      } else {
        application.tbmsSyncStatus = 'FAILED';
        application.tbmsSyncError = tbmsResult.error;
        console.warn(`[TBMS AUTO-SYNC] Sync deferred:`, tbmsResult.error);
      }
    } catch (tbmsErr: any) {
      application.tbmsSyncStatus = 'FAILED';
      application.tbmsSyncError = tbmsErr?.message || 'TBMS connection failed';
      console.error('[TBMS AUTO-SYNC] Exception:', tbmsErr);
    }

    // Save application to ensure ID and reference number are finalized
    let saved = applicationStore.save(application);

    // Compute preview & modify URL for driver
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
        saved = applicationStore.save(saved);
      } else if (!emailResult.skipped) {
        saved.emailNotificationSent = false;
        saved.emailNotificationError = emailResult.error;
        saved = applicationStore.save(saved);
      }
    } catch (emailErr: any) {
      console.error('[MAILGUN] Unexpected exception dispatching email:', emailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: saved,
      referenceNumber: saved.referenceNumber,
      previewUrl,
      tbmsSyncStatus: saved.tbmsSyncStatus,
      tbmsDriverId: saved.tbmsDriverId,
      emailNotification: emailResult,
    });
  } catch (error) {
    console.error('Submission Error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
