const BASE_URL = 'http://localhost:3000';

interface TestCase {
  name: string;
  run: () => Promise<void>;
}

let passedCount = 0;
let failedCount = 0;
let staffToken: string = '';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    failedCount++;
    throw new Error(message);
  } else {
    console.log(`  ✅ PASSED: ${message}`);
    passedCount++;
  }
}

async function loginAsStaff(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@flamecars.co.uk',
      password: 'FlameCars#Admin2026!Sec',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.token) {
    throw new Error('Staff login failed in test runner: ' + (data.error || res.statusText));
  }
  return data.token;
}

async function adminSaveDiscount(token: string, discount: Record<string, any>) {
  const res = await fetch(`${BASE_URL}/api/admin/settings/discounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'save', discount }),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function adminDeleteDiscount(token: string, id: string) {
  const res = await fetch(`${BASE_URL}/api/admin/settings/discounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'delete', id }),
  });
  return await res.json();
}

async function testApiValidate(payload: Record<string, any>) {
  const res = await fetch(`${BASE_URL}/api/booking/discount/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

const testCases: TestCase[] = [
  // -------------------------------------------------------------
  // Test 1: Staff Authentication Setup
  // -------------------------------------------------------------
  {
    name: 'Test 1: Staff Admin Authentication for Coupon Management',
    run: async () => {
      staffToken = await loginAsStaff();
      assert(!!staffToken, 'Successfully authenticated as Staff Admin and acquired Bearer session token');
    },
  },

  // -------------------------------------------------------------
  // Test 2: Valid Percentage Coupon (WELCOME10 - 10%)
  // -------------------------------------------------------------
  {
    name: 'Test 2: Valid percentage discount calculation (WELCOME10 - 10%)',
    run: async () => {
      const res = await testApiValidate({
        code: 'WELCOME10',
        fare: 63,
        driverPayout: 35,
        airportCharges: 13.5,
        airportCode: 'LHR',
        vehicleCategory: 'economy',
      });

      assert(res.ok === true, 'API returns HTTP 200');
      assert(res.data.success === true, 'Response success is true');
      assert(res.data.result.discountAmount === 6.3, '10% of £63 is £6.30');
      assert(res.data.result.discountedFare === 56.7, 'Discounted fare is £56.70 (£63 - £6.30)');
      assert(res.data.result.netProfit > 0, `Positive net profit (£${res.data.result.netProfit})`);
      assert(res.data.result.marginPercent >= 10, `Margin (${res.data.result.marginPercent}%) meets minimum margin threshold`);
    },
  },

  // -------------------------------------------------------------
  // Test 3: Valid Fixed Amount Coupon (FLAME5 - £5.00)
  // -------------------------------------------------------------
  {
    name: 'Test 3: Valid fixed amount discount calculation (FLAME5 - £5.00)',
    run: async () => {
      const res = await testApiValidate({
        code: 'FLAME5',
        fare: 63,
        driverPayout: 35,
        airportCharges: 13.5,
        airportCode: 'LHR',
        vehicleCategory: 'economy',
      });

      assert(res.ok === true, 'API returns HTTP 200');
      assert(res.data.result.discountAmount === 5.0, 'Fixed discount is £5.00');
      assert(res.data.result.discountedFare === 58.0, 'Discounted fare is £58.00 (£63 - £5.00)');
      assert(res.data.result.netProfit > 0, 'Net profit is positive');
    },
  },

  // -------------------------------------------------------------
  // Test 4: Case-Insensitive Coupon Matching
  // -------------------------------------------------------------
  {
    name: 'Test 4: Case-insensitivity & whitespace trimming (welcome10, WeLcOmE10, " WELCOME10 ")',
    run: async () => {
      for (const variant of ['welcome10', 'WeLcOmE10', '  welcome10  ']) {
        const res = await testApiValidate({
          code: variant,
          fare: 63,
          driverPayout: 35,
          airportCharges: 13.5,
          airportCode: 'LHR',
          vehicleCategory: 'economy',
        });
        assert(res.ok === true, `Variant '${variant}' successfully accepted`);
        assert(res.data.result.discountCode.code === 'WELCOME10', 'Correctly normalized to uppercase WELCOME10');
      }
    },
  },

  // -------------------------------------------------------------
  // Test 5: Non-existent / Invalid Code
  // -------------------------------------------------------------
  {
    name: 'Test 5: Non-existent coupon rejection',
    run: async () => {
      const res = await testApiValidate({
        code: 'NOTEXISTING999',
        fare: 63,
        driverPayout: 35,
        airportCharges: 13.5,
      });

      assert(res.ok === false, 'API rejects non-existent code');
      assert(res.status === 400, 'HTTP status is 400 Bad Request');
      assert(res.data.success === false, 'Response success is false');
      assert(res.data.error.includes('invalid or does not exist'), 'Clear message: invalid or does not exist');
    },
  },

  // -------------------------------------------------------------
  // Test 6: Empty or Blank Code
  // -------------------------------------------------------------
  {
    name: 'Test 6: Empty code submission rejection',
    run: async () => {
      const res = await testApiValidate({
        code: '',
        fare: 63,
        driverPayout: 35,
        airportCharges: 13.5,
      });

      assert(res.ok === false, 'API rejects empty coupon code');
      assert(res.status === 400, 'HTTP status is 400');
    },
  },

  // -------------------------------------------------------------
  // Test 7: Disabled / Inactive Coupon
  // -------------------------------------------------------------
  {
    name: 'Test 7: Inactive / Disabled coupon rejection',
    run: async () => {
      // Seed disabled code via Admin API
      const saveRes = await adminSaveDiscount(staffToken, {
        id: 'test_code_inactive',
        code: 'TESTDISABLED',
        description: 'Testing inactive state',
        discountType: 'PERCENTAGE',
        discountValue: 10,
        isActive: false,
        usedCount: 0,
      });
      assert(saveRes.ok === true, 'Admin successfully created disabled test coupon');

      // Test validation
      const res = await testApiValidate({
        code: 'TESTDISABLED',
        fare: 63,
        driverPayout: 35,
        airportCharges: 13.5,
      });

      assert(res.ok === false, 'Validation rejects inactive coupon');
      assert(res.data.error.includes('currently disabled'), 'Explains coupon is currently disabled');

      // Cleanup
      await adminDeleteDiscount(staffToken, 'test_code_inactive');
    },
  },

  // -------------------------------------------------------------
  // Test 8: Expired Coupon
  // -------------------------------------------------------------
  {
    name: 'Test 8: Expired coupon rejection',
    run: async () => {
      // Seed expired code via Admin API
      const saveRes = await adminSaveDiscount(staffToken, {
        id: 'test_code_expired',
        code: 'TESTEXPIRED',
        description: 'Testing expired coupon',
        discountType: 'FIXED',
        discountValue: 5,
        expiryDate: '2025-01-01', // Past date
        isActive: true,
        usedCount: 0,
      });
      assert(saveRes.ok === true, 'Admin successfully created expired test coupon');

      const res = await testApiValidate({
        code: 'TESTEXPIRED',
        fare: 63,
        driverPayout: 35,
        airportCharges: 13.5,
      });

      assert(res.ok === false, 'Validation rejects expired coupon');
      assert(res.data.error.includes('expired on 2025-01-01'), 'Explains coupon has expired');

      await adminDeleteDiscount(staffToken, 'test_code_expired');
    },
  },

  // -------------------------------------------------------------
  // Test 9: Minimum Fare Threshold Enforcement
  // -------------------------------------------------------------
  {
    name: 'Test 9: Minimum fare threshold enforcement',
    run: async () => {
      const saveRes = await adminSaveDiscount(staffToken, {
        id: 'test_code_minfare',
        code: 'TESTMINFARE50',
        description: 'Requires £50 min fare',
        discountType: 'FIXED',
        discountValue: 10,
        minFare: 50.0,
        isActive: true,
        usedCount: 0,
      });
      assert(saveRes.ok === true, 'Admin successfully created coupon with £50 minimum fare threshold');

      // Attempt with fare below threshold (£40)
      const resBelow = await testApiValidate({
        code: 'TESTMINFARE50',
        fare: 40,
        driverPayout: 20,
        airportCharges: 0,
      });
      assert(resBelow.ok === false, 'Rejects when customer fare is below £50');
      assert(resBelow.data.error.includes('requires a minimum fare of £50.00'), 'Returns clear minimum fare error');

      // Attempt with fare at or above threshold (£65)
      const resAbove = await testApiValidate({
        code: 'TESTMINFARE50',
        fare: 65,
        driverPayout: 35,
        airportCharges: 0,
      });
      assert(resAbove.ok === true, 'Accepts when customer fare meets minimum fare threshold');
      assert(resAbove.data.result.discountAmount === 10, 'Applies £10 discount');

      await adminDeleteDiscount(staffToken, 'test_code_minfare');
    },
  },

  // -------------------------------------------------------------
  // Test 10: Usage Limit Exhaustion
  // -------------------------------------------------------------
  {
    name: 'Test 10: Usage limit exhaustion enforcement',
    run: async () => {
      const saveRes = await adminSaveDiscount(staffToken, {
        id: 'test_code_exhausted',
        code: 'TESTLIMIT2',
        description: 'Coupon with usage limit reached',
        discountType: 'PERCENTAGE',
        discountValue: 5,
        usageLimit: 2,
        usedCount: 2, // At maximum limit
        isActive: true,
      });
      assert(saveRes.ok === true, 'Admin created coupon with usageLimit=2, usedCount=2');

      const res = await testApiValidate({
        code: 'TESTLIMIT2',
        fare: 63,
        driverPayout: 35,
        airportCharges: 13.5,
      });

      assert(res.ok === false, 'Rejects coupon that reached its usage limit');
      assert(res.data.error.includes('maximum usage limit'), 'Explains maximum usage limit reached');

      await adminDeleteDiscount(staffToken, 'test_code_exhausted');
    },
  },

  // -------------------------------------------------------------
  // Test 11: Airport Route Corridor Restrictions
  // -------------------------------------------------------------
  {
    name: 'Test 11: Airport route corridor restrictions (restricted to LHR only)',
    run: async () => {
      const saveRes = await adminSaveDiscount(staffToken, {
        id: 'test_code_airport_only',
        code: 'LHROnlyPromo',
        description: 'Valid strictly for Heathrow transfers',
        discountType: 'FIXED',
        discountValue: 5,
        restrictedAirports: ['LHR'],
        isActive: true,
        usedCount: 0,
      });
      assert(saveRes.ok === true, 'Admin created LHR-restricted coupon');

      // Attempt for Gatwick (LGW)
      const resGatwick = await testApiValidate({
        code: 'LHRONLYPROMO',
        fare: 75,
        driverPayout: 55,
        airportCharges: 10.0,
        airportCode: 'LGW',
      });
      assert(resGatwick.ok === false, 'Rejects LHR coupon when route is Gatwick');
      assert(resGatwick.data.error.includes('only valid for routes via: LHR'), 'Explains airport restriction');

      // Attempt for Heathrow (LHR)
      const resHeathrow = await testApiValidate({
        code: 'LHRONLYPROMO',
        fare: 75,
        driverPayout: 40,
        airportCharges: 13.5,
        airportCode: 'LHR',
      });
      assert(resHeathrow.ok === true, 'Accepts LHR coupon when route is Heathrow');

      await adminDeleteDiscount(staffToken, 'test_code_airport_only');
    },
  },

  // -------------------------------------------------------------
  // Test 12: Vehicle Category Restrictions
  // -------------------------------------------------------------
  {
    name: 'Test 12: Vehicle category restrictions (EXEC15 restricted to executive/executive_mpv)',
    run: async () => {
      // Try on Economy Saloon
      const resEconomy = await testApiValidate({
        code: 'EXEC15',
        fare: 63,
        driverPayout: 35,
        airportCharges: 13.5,
        vehicleCategory: 'economy',
      });
      assert(resEconomy.ok === false, 'EXEC15 rejected on Economy vehicle');
      assert(resEconomy.data.error.includes('vehicle categories: executive, executive_mpv'), 'Returns clear vehicle restriction error');

      // Try on Executive MPV with sufficient margin
      const resExec = await testApiValidate({
        code: 'EXEC15',
        fare: 120,
        driverPayout: 59.5,
        airportCharges: 13.5,
        vehicleCategory: 'executive_mpv',
      });
      assert(resExec.ok === true, 'EXEC15 accepted on Executive MPV vehicle');
      assert(resExec.data.result.discountAmount === 18, '15% of £120 is £18.00 discount');
    },
  },

  // -------------------------------------------------------------
  // Test 13: Minimum Acceptable Margin Safeguard (Sub-10% profit blocked)
  // -------------------------------------------------------------
  {
    name: 'Test 13: Minimum acceptable margin safeguard (strictly restricts sub-10% profit)',
    run: async () => {
      // Seed a 35% deep discount code
      const saveRes = await adminSaveDiscount(staffToken, {
        id: 'test_code_deep_discount',
        code: 'TESTDEEP35',
        description: 'Excessive 35% discount',
        discountType: 'PERCENTAGE',
        discountValue: 35,
        isActive: true,
        usedCount: 0,
      });
      assert(saveRes.ok === true, 'Admin seeded 35% discount code');

      // For a Heathrow Economy booking (£63 customer fare, £35 driver payout, £13.50 airport charges):
      // Direct Costs = £35 + £13.50 + (£40.95 * 0.015 + 0.20) = £49.31
      // Net Profit = £40.95 - £49.31 = -£8.36 (LOSS / Margin = -20.4%)
      const res = await testApiValidate({
        code: 'TESTDEEP35',
        fare: 63,
        driverPayout: 35,
        airportCharges: 13.5,
        airportCode: 'LHR',
        vehicleCategory: 'economy',
      });

      assert(res.ok === false, 'Server blocks coupon taking margin below 10% threshold');
      assert(res.data.minMarginViolation === true, 'minMarginViolation flag is returned as true');
      assert(res.data.error.includes('minimum acceptable margin threshold'), 'Error message warns of minimum margin violation');

      await adminDeleteDiscount(staffToken, 'test_code_deep_discount');
    },
  },

  // -------------------------------------------------------------
  // Test 14: End-to-End Quote & Checkout Flow with Coupon
  // -------------------------------------------------------------
  {
    name: 'Test 14: End-to-End Booking Quote, Checkout with Coupon, Locked Price & Usage Counter',
    run: async () => {
      // 1. Generate live quote via /api/booking/quote
      const quoteRes = await fetch(`${BASE_URL}/api/booking/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupAddress: 'London Heathrow Airport (LHR)',
          destinationAddress: 'Charing Cross, London WC2N',
          pickupDate: '2026-11-28',
          pickupTime: '14:30',
          passengers: 2,
          luggage: 2,
        }),
      });

      const quoteData = await quoteRes.json();
      assert(quoteRes.ok === true && quoteData.success === true, 'Live quote generated via /api/booking/quote');
      const quote = quoteData.quote;
      assert(!!quote.quoteId, 'Quote has unique quoteId session');

      const econVehicle = quote.vehicles.find((v: any) => v.id === 'economy');
      assert(econVehicle !== undefined, 'Economy option available in quote');
      const standardFare = econVehicle.totalFare; // £63

      // 2. Checkout with coupon FLAME5
      const checkoutRes = await fetch(`${BASE_URL}/api/booking/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          selectedVehicleCategory: 'economy',
          customerName: 'End-to-End Coupon Tester',
          customerEmail: 'coupon.tester@flamecars.co.uk',
          customerPhone: '07700900999',
          flightNumber: 'BA 1492',
          discountCode: 'FLAME5',
        }),
      });

      const checkoutData = await checkoutRes.json();
      assert(checkoutRes.ok === true && checkoutData.success === true, 'Checkout with FLAME5 succeeds');
      assert(!!checkoutData.bookingId, 'Booking ID was created and returned');

      // 3. Verify booking stored in server has locked pricing & discount breakdown
      const statusRes = await fetch(`${BASE_URL}/api/booking/status?id=${checkoutData.bookingId}`);
      const statusData = await statusRes.json();
      assert(statusRes.ok === true && statusData.success === true, 'Booking retrieved via /api/booking/status');

      const booking = statusData.booking;
      assert(booking.originalFare === standardFare, `Original fare recorded as £${standardFare}`);
      assert(booking.discountCode === 'FLAME5', 'Discount code recorded on booking as FLAME5');
      assert(booking.discountAmount === 5.0, 'Discount amount recorded as £5.00');
      assert(booking.fare === standardFare - 5.0, `Customer fare locked at £${standardFare - 5.0} (£${standardFare} - £5)`);
      assert(booking.fareBreakdown.profitMargin !== undefined, 'Net profit margin breakdown locked on booking');
      assert(booking.netMarginPercent !== undefined, 'Net margin percent saved on booking');
    },
  },
];

async function main() {
  console.log('========================================================================');
  console.log('🔥 FLAME CARS — COMPREHENSIVE END-TO-END COUPON TEST SUITE');
  console.log('   Running against: ' + BASE_URL);
  console.log('========================================================================\n');

  for (const t of testCases) {
    console.log(`▶ ${t.name}`);
    try {
      await t.run();
    } catch (err: any) {
      console.error(`💥 FAILURE in ${t.name}:`, err.message);
    }
    console.log('');
  }

  console.log('========================================================================');
  console.log(`📊 TEST RESULTS: ${passedCount} assertions passed, ${failedCount} failed.`);
  console.log('========================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
