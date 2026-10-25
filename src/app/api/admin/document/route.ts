import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';
import { DocumentType } from '@/types/onboarding';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { appId, docType, action, reason } = body;

    const app = applicationStore.get(appId);
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    const doc = app.documents[docType as DocumentType];
    if (!doc) {
      return NextResponse.json({ error: 'Document not found on application' }, { status: 404 });
    }

    if (action === 'APPROVE') {
      doc.status = 'APPROVED';
      doc.rejectionReason = undefined;
    } else if (action === 'REJECT') {
      doc.status = 'REJECTED';
      doc.rejectionReason = reason || 'Document rejected by compliance reviewer.';
      app.status = 'ACTION_REQUIRED'; // Automatically update status
    }

    applicationStore.save(app);

    return NextResponse.json({
      success: true,
      message: `Document ${action === 'APPROVE' ? 'approved' : 'rejected'}`,
      application: app,
    });
  } catch (error) {
    console.error('Admin Document Review Error:', error);
    return NextResponse.json({ error: 'Failed to update document status' }, { status: 500 });
  }
}
