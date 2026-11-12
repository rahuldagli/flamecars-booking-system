import { NextResponse } from 'next/server';
import { applicationStore, stripOversizedData } from '@/lib/serverStore';
import { DocumentType } from '@/types/onboarding';
import { requireAdminAuth } from '@/lib/auth';

export async function POST(req: Request) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await req.json();
    const { appId, docType, action, reason, application: clientApp } = body;

    let app = await applicationStore.getAsync(appId);

    // Fallback: If not found in server store, restore from sanitized clientApp
    if (!app && clientApp) {
      app = await applicationStore.saveAsync(stripOversizedData(clientApp));
    }

    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!app.documents) {
      app.documents = {} as any;
    }

    let doc = app.documents[docType as DocumentType];
    if (!doc) {
      doc = {
        id: 'doc_' + Math.random().toString(36).substring(2, 9),
        type: docType as DocumentType,
        title: docType,
        filename: 'document',
        fileSize: 0,
        mimeType: 'application/octet-stream',
        status: 'PENDING',
        uploadedAt: new Date().toISOString(),
      };
      app.documents[docType as DocumentType] = doc;
    }

    if (action === 'APPROVE') {
      doc.status = 'APPROVED';
      doc.rejectionReason = undefined;

      const mandatoryKeys: DocumentType[] = [
        'TFL_PHV_DRIVER_BADGE_FRONT',
        'DVLA_DRIVING_LICENCE_FRONT',
        'TFL_PHV_VEHICLE_LICENCE',
        'HIRE_REWARD_INSURANCE',
      ];
      const allApproved = mandatoryKeys.every((k) => app!.documents[k]?.status === 'APPROVED');
      if (allApproved && (app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW')) {
        app.status = 'APPROVED_PENDING_TBMS';
      }
    } else if (action === 'REJECT') {
      doc.status = 'REJECTED';
      doc.rejectionReason = reason || 'Document rejected by compliance reviewer.';
      app.status = 'ACTION_REQUIRED';
    }

    const saved = await applicationStore.saveAsync(app);

    return NextResponse.json({
      success: true,
      message: `Document ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
      application: saved,
    });
  } catch (error) {
    console.error('Admin Document Review Error:', error);
    return NextResponse.json({ error: 'Failed to update document status' }, { status: 500 });
  }
}
