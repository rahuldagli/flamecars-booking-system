import { NextResponse } from 'next/server';
import { applicationStore, stripOversizedData } from '@/lib/serverStore';
import { DriverApplication } from '@/types/onboarding';
import { getAuthenticatedStaff } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const application: DriverApplication = await req.json();
    if (!application) {
      return NextResponse.json({ error: 'Missing application data' }, { status: 400 });
    }

    const saved = await applicationStore.saveAsync(stripOversizedData(application));
    return NextResponse.json({ success: true, application: saved });
  } catch (error) {
    console.error('Draft Save Error:', error);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get('identifier')?.trim();
    const emailParam = searchParams.get('email')?.trim().toLowerCase();

    if (!identifier) {
      return NextResponse.json({ error: 'Identifier is required' }, { status: 400 });
    }

    const clean = identifier.replace(/\s+/g, '');
    const isAdmin = Boolean(await getAuthenticatedStaff(req));
    const isRefOrId = /^(flm-drv-|app_)/i.test(clean);

    // Fix H4: Prevent unauthenticated PII enumeration via mobile number alone.
    // Unauthenticated callers can look up by high-entropy reference code, or by mobile + matching email.
    if (!isAdmin && !isRefOrId && !emailParam) {
      return NextResponse.json(
        { error: 'Please provide your registered email address alongside your mobile number, or use your FLM-DRV reference code.' },
        { status: 400 }
      );
    }

    const found = await applicationStore.getAsync(clean);

    if (!found) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    if (!isAdmin && !isRefOrId) {
      const storedEmail = (found.email || '').trim().toLowerCase();
      if (!storedEmail || storedEmail !== emailParam) {
        return NextResponse.json({ error: 'Application not found or email does not match.' }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, application: found });
  } catch (error) {
    console.error('Draft Retrieve Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve draft' }, { status: 500 });
  }
}
