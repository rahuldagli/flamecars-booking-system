import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';
import { DriverApplication } from '@/types/onboarding';
import { detectNameDiscrepancies } from '@/lib/nameCheck';
import { syncDriverToTbms } from '@/lib/tbms';

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
    application.submittedAt = new Date().toISOString();
    application.currentStep = 6;

    // Automatically sync driver into TBMS Dispatch System on new registration
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

    const saved = applicationStore.save(application);

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: saved,
      referenceNumber: saved.referenceNumber,
      tbmsSyncStatus: saved.tbmsSyncStatus,
      tbmsDriverId: saved.tbmsDriverId,
    });
  } catch (error) {
    console.error('Submission Error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
