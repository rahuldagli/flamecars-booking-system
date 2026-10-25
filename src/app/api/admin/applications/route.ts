import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';

export async function GET() {
  try {
    const applications = applicationStore.getAll();

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
