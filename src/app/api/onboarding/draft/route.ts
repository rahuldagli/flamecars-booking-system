import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';
import { DriverApplication } from '@/types/onboarding';

export async function POST(req: Request) {
  try {
    const application: DriverApplication = await req.json();
    if (!application) {
      return NextResponse.json({ error: 'Missing application data' }, { status: 400 });
    }

    const saved = applicationStore.save(application);
    return NextResponse.json({ success: true, application: saved });
  } catch (error) {
    console.error('Draft Save Error:', error);
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = searchParams.get('identifier'); // can be mobile, ref, or ID

    if (!identifier) {
      return NextResponse.json({ error: 'Identifier is required' }, { status: 400 });
    }

    const clean = identifier.replace(/\s+/g, '');
    const found = applicationStore.get(clean);

    if (!found) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, application: found });
  } catch (error) {
    console.error('Draft Retrieve Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve draft' }, { status: 500 });
  }
}
