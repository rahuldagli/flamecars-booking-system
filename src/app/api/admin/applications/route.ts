import { NextResponse } from 'next/server';
import { applicationStore, stripOversizedData } from '@/lib/serverStore';
import { requireAdminAuth } from '@/lib/auth';

export async function GET(req: Request) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const rawApps = await applicationStore.getAllAsync();
    const applications = rawApps.map(stripOversizedData);

    const isTrash = (a: any) => a.status === 'TRASH' || Boolean(a.isDeleted);

    const counts = {
      TOTAL: applications.filter((a) => !isTrash(a)).length,
      DRAFT: applications.filter((a) => a.status === 'DRAFT' && !isTrash(a)).length,
      SUBMITTED: applications.filter((a) => a.status === 'SUBMITTED' && !isTrash(a)).length,
      UNDER_REVIEW: applications.filter((a) => a.status === 'UNDER_REVIEW' && !isTrash(a)).length,
      ACTION_REQUIRED: applications.filter((a) => a.status === 'ACTION_REQUIRED' && !isTrash(a)).length,
      APPROVED_PENDING_TBMS: applications.filter((a) => a.status === 'APPROVED_PENDING_TBMS' && !isTrash(a)).length,
      ACTIVE: applications.filter((a) => a.status === 'ACTIVE' && !isTrash(a)).length,
      SUSPENDED: applications.filter((a) => a.status === 'SUSPENDED' && !isTrash(a)).length,
      REJECTED: applications.filter((a) => a.status === 'REJECTED' && !isTrash(a)).length,
      TRASH: applications.filter((a) => isTrash(a)).length,
    };

    return NextResponse.json({
      success: true,
      counts,
      applications,
    });
  } catch (error) {
    console.error('Admin Applications List Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve applications' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await req.json();
    let importedCount = 0;

    if (Array.isArray(body)) {
      for (const item of body) {
        if (item && (item.id || item.referenceNumber || item.mobileNumber || item.legalName)) {
          await applicationStore.saveAsync(stripOversizedData(item));
          importedCount++;
        }
      }
    } else if (body && (body.id || body.referenceNumber || body.mobileNumber || body.legalName)) {
      await applicationStore.saveAsync(stripOversizedData(body));
      importedCount = 1;
    }

    const applications = (await applicationStore.getAllAsync()).map(stripOversizedData);
    return NextResponse.json({
      success: true,
      count: applications.length,
      importedCount,
      applications,
    });
  } catch (error) {
    console.error('Admin Applications Sync Error:', error);
    return NextResponse.json({ error: 'Failed to sync applications' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action') || 'trash'; // 'trash' | 'restore' | 'permanent' | 'empty-trash'

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      // Body is optional for DELETE
    }

    const targetId = id || body?.id;
    const targetAction = body?.action || action;

    // 1. Empty all items in Trash
    if (targetAction === 'empty-trash') {
      const allApps = await applicationStore.getAllAsync();
      const trashApps = allApps.filter((a) => a.status === 'TRASH' || a.isDeleted);
      for (const app of trashApps) {
        await applicationStore.deleteAsync(app.id);
      }
      const remaining = (await applicationStore.getAllAsync()).map(stripOversizedData);
      return NextResponse.json({
        success: true,
        message: `Permanently deleted ${trashApps.length} item(s) from Trash`,
        count: remaining.length,
        applications: remaining,
      });
    }

    if (!targetId) {
      return NextResponse.json({ error: 'Driver application ID is required' }, { status: 400 });
    }

    let app = applicationStore.get(targetId);
    if (!app) {
      app = await applicationStore.getAsync(targetId);
    }

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // 2. Permanently delete from database & cache
    if (targetAction === 'permanent') {
      await applicationStore.deleteAsync(app.id);
      const remaining = (await applicationStore.getAllAsync()).map(stripOversizedData);
      return NextResponse.json({
        success: true,
        message: `Driver application ${app.referenceNumber || app.id} permanently deleted`,
        applications: remaining,
      });
    }

    // 3. Restore from Trash back to active/under review
    if (targetAction === 'restore') {
      app.isDeleted = false;
      app.deletedAt = undefined;
      app.status = app.previousStatus || 'UNDER_REVIEW';
      app.previousStatus = undefined;
      app.updatedAt = new Date().toISOString();
      const saved = await applicationStore.saveAsync(app);
      const all = (await applicationStore.getAllAsync()).map(stripOversizedData);
      return NextResponse.json({
        success: true,
        message: `Driver application ${saved.referenceNumber || saved.id} restored successfully`,
        application: saved,
        applications: all,
      });
    }

    // 4. Default: Move to Trash (Soft delete)
    app.isDeleted = true;
    app.deletedAt = new Date().toISOString();
    app.previousStatus = app.status !== 'TRASH' ? app.status : (app.previousStatus || 'UNDER_REVIEW');
    app.status = 'TRASH';
    app.updatedAt = new Date().toISOString();
    const saved = await applicationStore.saveAsync(app);
    const all = (await applicationStore.getAllAsync()).map(stripOversizedData);

    return NextResponse.json({
      success: true,
      message: `Driver application ${saved.referenceNumber || saved.id} moved to Trash`,
      application: saved,
      applications: all,
    });
  } catch (error) {
    console.error('Admin Applications Delete Error:', error);
    return NextResponse.json({ error: 'Failed to process delete request' }, { status: 500 });
  }
}
