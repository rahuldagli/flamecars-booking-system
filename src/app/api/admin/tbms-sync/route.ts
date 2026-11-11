import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';
import { syncDriverToTbms } from '@/lib/tbms';
import { getAppBaseUrl } from '@/lib/mailgun';

export async function POST(req: Request) {
  try {
    const { appId, forceSync } = await req.json();

    let app = applicationStore.get(appId);
    if (!app) {
      app = await applicationStore.getAsync(appId);
    }
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify all mandatory documents are approved before sync unless forced by staff
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
          error: `Cannot activate driver in TBMS. Mandatory documents are not yet approved: ${unapproved.join(', ')}`,
        },
        { status: 400 }
      );
    }

    app.tbmsSyncStatus = 'PENDING';
    await applicationStore.saveAsync(app);

    // Call TBMS API server-to-server with status: ACTIVE and baseUrl for document inspection
    const baseUrl = getAppBaseUrl(req);
    const tbmsResult = await syncDriverToTbms(app, { status: 'ACTIVE', baseUrl });

    if (tbmsResult.success && tbmsResult.driverId) {
      app.tbmsSyncStatus = 'SYNCED';
      app.status = 'ACTIVE';
      app.tbmsDriverId = tbmsResult.driverId;
      app.syncedName = app.legalName;
      app.detailsModifiedAfterSync = false;
      app.lastModifiedFields = [];
      app.tbmsSyncError = undefined;
    } else if (tbmsResult.alreadyExists) {
      // Driver mobile was already registered in TBMS dispatch
      app.tbmsSyncStatus = 'SYNCED';
      app.status = 'ACTIVE';
      app.syncedName = app.legalName;
      app.detailsModifiedAfterSync = false;
      app.lastModifiedFields = [];
      app.tbmsSyncError = 'Mobile number already registered in TBMS dispatch system. Verified profile updated with latest details.';
    } else {
      app.tbmsSyncStatus = 'FAILED';
      app.tbmsSyncError = tbmsResult.error || 'Failed to sync with TBMS';
    }

    app.updatedAt = new Date().toISOString();
    const saved = await applicationStore.saveAsync(app);

    if (tbmsResult.success || tbmsResult.alreadyExists) {
      return NextResponse.json({
        success: true,
        message: tbmsResult.success
          ? `Driver approved & activated in TBMS Dispatch (Driver ID: ${saved.tbmsDriverId})`
          : `Driver approved & activated. Note: Mobile number is already on file in TBMS dispatch.`,
        application: saved,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: `TBMS sync failed: ${saved.tbmsSyncError}`,
        application: saved,
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('TBMS Sync Route Error:', error);
    return NextResponse.json({ error: 'Failed to process TBMS sync' }, { status: 500 });
  }
}
