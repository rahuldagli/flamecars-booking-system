import { NextResponse } from 'next/server';
import { applicationStore } from '@/lib/serverStore';
import { DriverApplication } from '@/types/onboarding';

export async function POST(req: Request) {
  try {
    const application: DriverApplication = await req.json();

    if (!application.legalName || !application.mobileNumber || !application.email) {
      return NextResponse.json({ error: 'Personal details are incomplete' }, { status: 400 });
    }

    if (!application.vrm || !application.tflPhvVehicleLicence) {
      return NextResponse.json({ error: 'Vehicle details are incomplete' }, { status: 400 });
    }

    if (!application.termsAccepted) {
      return NextResponse.json({ error: 'You must accept the independent driver agreement' }, { status: 400 });
    }

    // Set submitted status
    application.status = 'SUBMITTED';
    application.submittedAt = new Date().toISOString();
    application.currentStep = 5;

    const saved = applicationStore.save(application);

    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: saved,
      referenceNumber: saved.referenceNumber,
    });
  } catch (error) {
    console.error('Submission Error:', error);
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 });
  }
}
