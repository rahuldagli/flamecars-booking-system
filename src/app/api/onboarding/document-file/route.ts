import { NextResponse } from 'next/server';
import { documentFileStore } from '@/lib/serverStore';

export async function POST(req: Request) {
  try {
    const { appId, docType, filename, mimeType, dataUrl } = await req.json();

    if (!appId || !docType || !dataUrl) {
      return NextResponse.json({ error: 'Missing appId, docType, or dataUrl' }, { status: 400 });
    }

    // Cap single document file payload at 8 MB to protect Worker CPU/memory limits
    if (typeof dataUrl !== 'string' || dataUrl.length > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Document file too large (max 6 MB binary / 8 MB encoded)' }, { status: 413 });
    }

    await documentFileStore.saveAsync({
      appId: String(appId),
      docType: String(docType),
      filename: String(filename || 'document'),
      mimeType: String(mimeType || 'application/octet-stream'),
      dataUrl,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Document File Upload Error:', error);
    return NextResponse.json({ error: 'Failed to store document file' }, { status: 500 });
  }
}

