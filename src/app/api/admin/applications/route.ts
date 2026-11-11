import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';

export async function GET() {
  try {
    const applications = await applicationStore.getAllAsync();

    const counts = {
      TOTAL: applications.length,
      DRAFT: applications.filter((a) => a.status === 'DRAFT').length,
      SUBMITTED: applications.filter((a) => a.status === 'SUBMITTED').length,
      UNDER_REVIEW: applications.filter((a) => a.status === 'UNDER_REVIEW').length,
      ACTION_REQUIRED: applications.filter((a) => a.status === 'ACTION_REQUIRED').length,
      APPROVED_PENDING_TBMS: applications.filter((a) => a.status === 'APPROVED_PENDING_TBMS').length,
      ACTIVE: applications.filter((a) => a.status === 'ACTIVE').length,
      SUSPENDED: applications.filter((a) => a.status === 'SUSPENDED').length,
      REJECTED: applications.filter((a) => a.status === 'REJECTED').length,
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
  try {
    const body = await req.json();
    if (Array.isArray(body)) {
      for (const item of body) {
        if (item && (item.id || item.referenceNumber || item.mobileNumber)) {
          await applicationStore.saveAsync(item);
        }
      }
    } else if (body && (body.id || body.referenceNumber || body.mobileNumber)) {
      await applicationStore.saveAsync(body);
    }
    const applications = await applicationStore.getAllAsync();
    return NextResponse.json({ success: true, count: applications.length, applications });
  } catch (error) {
    console.error('Admin Applications Sync Error:', error);
    return NextResponse.json({ error: 'Failed to sync applications' }, { status: 500 });
  }
}
