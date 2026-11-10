import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';
import { syncDriverToTbms } from '@/lib/tbms';

export async function POST(req: Request) {
  try {
    const { appId, forceSync } = await req.json();

    const app = applicationStore.get(appId);
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify all mandatory documents are approved before sync unless forced
    const mandatoryKeys = [
      'TFL_PHV_DRIVER_BADGE_FRONT',
      'DVLA_DRIVING_LICENCE_FRONT',
      'TFL_PHV_VEHICLE_LICENCE',
      'HIRE_REWARD_INSURANCE',
    ] as const;

    const unapproved = mandatoryKeys.filter((k) => app.documents[k]?.status !== 'APPROVED');
    if (unapproved.length > 0 && !forceSync) {
      return NextResponse.json(
        {
          error: `Cannot sync to TBMS. Mandatory documents are not approved: ${unapproved.join(', ')}`,
        },
        { status: 400 }
      );
    }

    app.tbmsSyncStatus = 'PENDING';
    applicationStore.save(app);

    // Call TBMS API server-to-server
    const tbmsResult = await syncDriverToTbms(app);

    if (tbmsResult.success && tbmsResult.driverId) {
      app.tbmsSyncStatus = 'SYNCED';
      app.status = 'ACTIVE';
      app.tbmsDriverId = tbmsResult.driverId;
      app.tbmsSyncError = undefined;
    } else {
      app.tbmsSyncStatus = 'FAILED';
      app.tbmsSyncError = tbmsResult.error || 'Failed to sync with TBMS';
    }

    applicationStore.save(app);

    return NextResponse.json({
      success: tbmsResult.success,
      message: tbmsResult.success
        ? `Driver synchronized with TBMS: Status is now ${app.status} (ID: ${app.tbmsDriverId})`
        : `TBMS sync failed: ${app.tbmsSyncError}`,
      application: app,
    });
  } catch (error) {
    console.error('TBMS Sync Route Error:', error);
    return NextResponse.json({ error: 'Failed to process TBMS sync' }, { status: 500 });
  }
}
