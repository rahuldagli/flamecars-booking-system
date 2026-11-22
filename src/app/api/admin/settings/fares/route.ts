import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import {
  getFareSettings,
  updateFareSettings,
  getDiscountCodes,
  getPricingAuditLogs,
} from '@/lib/fareConfig';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const settings = getFareSettings();
    const discountCodes = getDiscountCodes();
    const auditLogs = getPricingAuditLogs();

    return NextResponse.json({
      success: true,
      settings,
      discountCodes,
      auditLogs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to retrieve fare settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await req.json();
    const changedBy = auth.user.email || 'staff@flamecars.co.uk';
    const auditSummary = body.summary || undefined;

    const updated = updateFareSettings(body, changedBy, auditSummary);
    const auditLogs = getPricingAuditLogs();

    return NextResponse.json({
      success: true,
      settings: updated,
      auditLogs,
      message: 'Pricing configuration successfully saved and applied to new quotations.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update fare settings' }, { status: 500 });
  }
}
