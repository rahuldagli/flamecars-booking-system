import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';
import { syncDriverToTbms } from '@/lib/tbms';
import { getAppBaseUrl } from '@/lib/mailgun';
import { requireAdminAuth } from '@/lib/auth';

export async function POST(req: Request) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const { appId, forceSync } = await req.json();

    let app = applicationStore.get(appId);
    if (!app) {
      app = await applicationStore.getAsync(appId);
    }
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

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

    const prevSyncStatus = app.tbmsSyncStatus;
    app.tbmsSyncStatus = 'PENDING';
    await applicationStore.saveAsync(app);

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
      // Fix H5: Resolve PENDING status rather than leaving it stuck
      app.tbmsSyncStatus = app.tbmsDriverId ? 'SYNCED' : (prevSyncStatus === 'SYNCED' ? 'SYNCED' : 'FAILED');
      app.tbmsSyncError =
        'Mobile number is already registered in TBMS dispatch. CreateDriver.php cannot update existing drivers.';
    } else {
      app.tbmsSyncStatus = 'FAILED';
      app.tbmsSyncError = tbmsResult.error || 'Failed to sync with TBMS';
    }

    app.updatedAt = new Date().toISOString();
    const saved = await applicationStore.saveAsync(app);

    if (tbmsResult.success && tbmsResult.driverId) {
      return NextResponse.json({
        success: true,
        message: `Driver approved & activated in TBMS Dispatch (Driver ID: ${saved.tbmsDriverId})`,
        application: saved,
      });
    }

    if (tbmsResult.alreadyExists) {
      return NextResponse.json(
        {
          success: false,
          alreadyExists: true,
          error:
            "TBMS dispatch rejected update: 'Mobile number is already in use.' TBMS CreateDriver.php is insert-only and cannot overwrite existing drivers automatically. Please update the driver name directly in the TBMS Admin Console.",
          application: saved,
        },
        { status: 400 }
      );
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
