import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import {
  getDiscountCodes,
  saveDiscountCode,
  deleteDiscountCode,
  getPricingAuditLogs,
} from '@/lib/fareConfig';
import { DiscountCode } from '@/types/booking';

export async function GET(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const discounts = getDiscountCodes();
    return NextResponse.json({ success: true, discounts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch discounts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminAuth(req);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await req.json();
    const { action, discount, id } = body;
    const staffEmail = auth.user.email || 'staff@flamecars.co.uk';

    if (action === 'delete') {
      if (!id) {
        return NextResponse.json({ error: 'Promotion ID is required for deletion' }, { status: 400 });
      }
      const success = deleteDiscountCode(id, staffEmail);
      return NextResponse.json({
        success,
        discounts: getDiscountCodes(),
        auditLogs: getPricingAuditLogs(),
        message: 'Promotion code removed.',
      });
    }

    if (action === 'save' || action === 'create' || action === 'update') {
      if (!discount || !discount.code) {
        return NextResponse.json({ error: 'Promo code is required.' }, { status: 400 });
      }

      const val = Number(discount.discountValue);
      if (isNaN(val) || val <= 0) {
        return NextResponse.json({ error: 'Discount value must be greater than 0.' }, { status: 400 });
      }

      if (discount.discountType === 'PERCENTAGE' && val > 90) {
        return NextResponse.json(
          { error: 'Percentage discount cannot exceed 90%.' },
          { status: 400 }
        );
      }

      const saved = saveDiscountCode(discount as DiscountCode, staffEmail);
      return NextResponse.json({
        success: true,
        discount: saved,
        discounts: getDiscountCodes(),
        auditLogs: getPricingAuditLogs(),
        message: `Promotion code '${saved.code}' saved successfully.`,
      });
    }

    if (action === 'toggle') {
      if (!id) {
        return NextResponse.json({ error: 'Promotion ID is required' }, { status: 400 });
      }
      const list = getDiscountCodes();
      const target = list.find((d) => d.id === id || d.code.toUpperCase() === id.toUpperCase());
      if (!target) {
        return NextResponse.json({ error: 'Promotion code not found' }, { status: 404 });
      }

      const updated = saveDiscountCode(
        { ...target, isActive: !target.isActive },
        staffEmail
      );

      return NextResponse.json({
        success: true,
        discount: updated,
        discounts: getDiscountCodes(),
        auditLogs: getPricingAuditLogs(),
        message: `Promotion code '${updated.code}' is now ${updated.isActive ? 'active' : 'disabled'}.`,
      });
    }

    return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Operation failed' }, { status: 500 });
  }
}
