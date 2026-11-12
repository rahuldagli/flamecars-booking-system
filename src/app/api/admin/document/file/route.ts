import { NextResponse } from 'next/server';
import { documentFileStore } from '@/lib/serverStore';
import { requireAdminAuth } from '@/lib/auth';

export async function GET(req: Request) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get('appId');
    const docType = searchParams.get('docType');

    if (!appId || !docType) {
      return NextResponse.json({ error: 'appId and docType are required' }, { status: 400 });
    }

    const file = await documentFileStore.getAsync(appId, docType);
    if (!file) {
      return NextResponse.json({ error: 'Document file not found in server storage' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      file,
    });
  } catch (error) {
    console.error('Admin Document File Fetch Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve document file' }, { status: 500 });
  }
}

