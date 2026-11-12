import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';
import { sendDriverRegistrationEmail, getAppBaseUrl } from '@/lib/mailgun';
import { requireAdminAuth } from '@/lib/auth';

export async function POST(req: Request) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const { appId } = await req.json();
    if (!appId) {
      return NextResponse.json({ error: 'Applicant ID is required' }, { status: 400 });
    }

    let app = applicationStore.get(appId);
    if (!app) {
      app = await applicationStore.getAsync(appId);
    }
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!app.email) {
      return NextResponse.json({ error: 'Application does not have an email address' }, { status: 400 });
    }

    const baseUrl = getAppBaseUrl(req);
    const previewUrl = `${baseUrl}/?ref=${encodeURIComponent(app.referenceNumber || app.id)}`;

    const emailResult = await sendDriverRegistrationEmail(app, previewUrl);

    if (emailResult.success) {
      app.emailNotificationSent = true;
      app.emailNotificationAt = new Date().toISOString();
      app.emailNotificationError = undefined;
      app.updatedAt = new Date().toISOString();
      await applicationStore.saveAsync(app);

      return NextResponse.json({
        success: true,
        message: `Registration notification email dispatched to ${app.email} ✓`,
        messageId: emailResult.messageId,
        application: app,
      });
    }

    app.emailNotificationSent = false;
    app.emailNotificationError = emailResult.error;
    await applicationStore.saveAsync(app);

    return NextResponse.json(
      {
        success: false,
        error: emailResult.error || 'Failed to dispatch email',
        application: app,
      },
      { status: 500 }
    );
  } catch (error: any) {
    console.error('Resend Email Route Error:', error);
    return NextResponse.json({ error: error?.message || 'Failed to resend email' }, { status: 500 });
  }
}
