'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookingQuote, VehicleCategory, VehicleOption } from '@/types/booking';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import DateTimePicker from '@/components/DateTimePicker';

const AIRPORT_PRESETS = [
  { label: 'Heathrow (LHR)', value: 'London Heathrow Airport (LHR)' },
  { label: 'Gatwick (LGW)', value: 'London Gatwick Airport (LGW)' },
  { label: 'Stansted (STN)', value: 'London Stansted Airport (STN)' },
  { label: 'Luton (LTN)', value: 'London Luton Airport (LTN)' },
  { label: 'City (LCY)', value: 'London City Airport (LCY)' },
  { label: 'Southend (SEN)', value: 'London Southend Airport (SEN)' },
];

export default function CustomerBookingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State - Step 1: Journey
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('09:00');
  const [passengers, setPassengers] = useState(2);
  const [luggage, setLuggage] = useState(2);

  // Quote State
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategory>('economy');
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState<string>('');

  // Form State - Step 3: Passenger Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [termsAgreed, setTermsAgreed] = useState(false);

  // Promo / Discount Code State
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    discountedFare: number;
    originalFare: number;
    description?: string;
  } | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccessMsg, setPromoSuccessMsg] = useState('');

  // Checkout State
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string>('');

  // Pre-fill date to today and default time to 90 mins ahead
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setPickupDate(`${yyyy}-${mm}-${dd}`);

    // Set pickup time to 90 mins ahead rounded to next 15-minute slot
    const future = new Date();
    future.setMinutes(future.getMinutes() + 90);
    const roundedMinutes = Math.ceil(future.getMinutes() / 15) * 15;
    if (roundedMinutes === 60) {
      future.setHours(future.getHours() + 1);
      future.setMinutes(0);
    } else {
      future.setMinutes(roundedMinutes);
    }
    const hh = String(future.getHours()).padStart(2, '0');
    const minStr = String(future.getMinutes()).padStart(2, '0');
    setPickupTime(`${hh}:${minStr}`);

    // If cancelled from stripe
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('cancelled') === '1') {
      setCheckoutError('Payment was cancelled. You can select a vehicle and try again.');
    }
  }, []);

  // Request Quote from Server
  const handleGetQuote = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setQuoteError('');

    if (!pickup.trim()) {
      setQuoteError('Please enter a pickup address or choose an airport.');
      return;
    }
    if (!destination.trim()) {
      setQuoteError('Please enter a destination address.');
      return;
    }
    if (!pickupDate || !pickupTime) {
      setQuoteError('Please select both pickup date and time.');
      return;
    }

    const selectedDateTime = new Date(`${pickupDate}T${pickupTime}:00`);
    const now = new Date();
    const minAdvance = new Date(now.getTime() + 30 * 60 * 1000);
    if (selectedDateTime < minAdvance) {
      const suggestedTime = new Date(now.getTime() + 45 * 60 * 1000).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      setQuoteError(`Please choose a pickup time at least 30 minutes in advance (e.g. from ${suggestedTime} onwards).`);
      return;
    }

    setIsQuoting(true);

    try {
      const res = await fetch('/api/booking/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupAddress: pickup.trim(),
          destinationAddress: destination.trim(),
          pickupDate,
          pickupTime,
          passengers,
          luggage,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setQuoteError(data.error || 'Failed to calculate quote. Please try again.');
        setIsQuoting(false);
        return;
      }

      const newQuote: BookingQuote = data.quote;
      setQuote(newQuote);

      // Auto-select lowest tier vehicle that fits the required passengers and luggage
      const validVehicles = newQuote.vehicles.filter(
        (v) => passengers <= v.maxPassengers && luggage <= v.maxLuggage
      );

      if (validVehicles.length > 0) {
        setSelectedVehicle(validVehicles[0].id);
      }

      setStep(2);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setQuoteError(err?.message || 'Network error while getting quote.');
    } finally {
      setIsQuoting(false);
    }
  };

  // Step 2 Proceed to Step 3
  const handleProceedToDetails = () => {
    if (!quote) return;
    const vehicle = quote.vehicles.find((v) => v.id === selectedVehicle);
    if (!vehicle) {
      setQuoteError('Please select a vehicle category.');
      return;
    }
    if (passengers > vehicle.maxPassengers || luggage > vehicle.maxLuggage) {
      setQuoteError(`The selected ${vehicle.name} cannot accommodate ${passengers} passengers with ${luggage} bags.`);
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Step 3 Checkout
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (!quote) {
      setCheckoutError('Booking session expired. Please restart your quote.');
      setStep(1);
      return;
    }

    if (!customerName.trim()) {
      setCheckoutError('Please enter passenger full name.');
      return;
    }

    if (!customerPhone.trim() || customerPhone.replace(/\D/g, '').length < 7) {
      setCheckoutError('Please enter a valid contact phone number.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!customerEmail.trim() || !emailRegex.test(customerEmail)) {
      setCheckoutError('Please enter a valid email address for your confirmation receipt.');
      return;
    }

    if (!termsAgreed) {
      setCheckoutError('Please accept the booking terms to proceed to payment.');
      return;
    }

    setIsCheckingOut(true);

    try {
      const res = await fetch('/api/booking/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteId: quote.quoteId,
          selectedVehicleCategory: selectedVehicle,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim(),
          flightNumber: flightNumber.trim() || undefined,
          notes: notes.trim() || undefined,
          discountCode: appliedPromo?.code || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setCheckoutError(data.error || 'Unable to initialize checkout. Please try again.');
        setIsCheckingOut(false);
        return;
      }

      // Redirect to Stripe Checkout or local demo confirmation
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        setCheckoutError('No checkout URL returned from payment server.');
        setIsCheckingOut(false);
      }
    } catch (err: any) {
      setCheckoutError(err?.message || 'Network error processing checkout.');
      setIsCheckingOut(false);
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) {
      setPromoError('Please enter a promotion code.');
      return;
    }
    if (!quote) return;
    const vObj = quote.vehicles.find((v) => v.id === selectedVehicle);
    if (!vObj) return;

    setPromoError('');
    setPromoSuccessMsg('');
    setIsCheckingPromo(true);

    try {
      const res = await fetch('/api/booking/discount/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoInput.trim().toUpperCase(),
          fare: vObj.totalFare,
          driverPayout: vObj.driverPayout,
          airportCharges: quote.airportCharges,
          airportCode: quote.airportCode,
          vehicleCategory: vObj.id,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setPromoError(data.error || 'Invalid promotion code.');
        setAppliedPromo(null);
        return;
      }

      const resObj = data.result;
      setAppliedPromo({
        code: resObj.discountCode.code,
        discountAmount: resObj.discountAmount,
        discountedFare: resObj.discountedFare,
        originalFare: resObj.originalFare,
        description: resObj.discountCode.description,
      });
      setPromoSuccessMsg(`✓ Code '${resObj.discountCode.code}' applied! You saved £${resObj.discountAmount.toFixed(2)}.`);
    } catch (err: any) {
      setPromoError(err?.message || 'Error checking promo code.');
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
    setPromoSuccessMsg('');
  };

  const currentVehicleObj = quote?.vehicles.find((v) => v.id === selectedVehicle);

  return (
    <div style={{ maxWidth: '960px', margin: '24px auto', padding: '0 16px' }}>
      {/* Top Banner Notice */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 18px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#334155',
        }}
      >
        <span style={{ fontSize: '18px' }}>🛡️</span>
        <div>
          <strong>TfL Licensed London Operator</strong> • All pickups from Greater London &amp; 6 London Airports (LHR, LGW, STN, LTN, LCY, SEN) with drop-offs anywhere across the UK.
        </div>
      </div>

      {/* Main Booking Container */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)',
          padding: '28px',
        }}
      >
        {/* Step Indicator */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '28px' }}>
          <div
            style={{
              flex: 1,
              padding: '12px 8px',
              textAlign: 'center',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              background: step === 1 ? '#ffedd5' : step > 1 ? '#dcfce7' : '#f1f5f9',
              color: step === 1 ? '#c2410c' : step > 1 ? '#15803d' : '#64748b',
              border: step === 1 ? '1px solid #fdba74' : '1px solid transparent',
              cursor: step > 1 ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (step > 1) setStep(1);
            }}
          >
            {step > 1 ? '✓ ' : '1. '}Journey Details
          </div>

          <div
            style={{
              flex: 1,
              padding: '12px 8px',
              textAlign: 'center',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              background: step === 2 ? '#ffedd5' : step > 2 ? '#dcfce7' : '#f1f5f9',
              color: step === 2 ? '#c2410c' : step > 2 ? '#15803d' : '#64748b',
              border: step === 2 ? '1px solid #fdba74' : '1px solid transparent',
              cursor: quote ? 'pointer' : 'default',
            }}
            onClick={() => {
              if (quote) setStep(2);
            }}
          >
            {step > 2 ? '✓ ' : '2. '}Vehicle &amp; Fare
          </div>

          <div
            style={{
              flex: 1,
              padding: '12px 8px',
              textAlign: 'center',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '13px',
              background: step === 3 ? '#ffedd5' : '#f1f5f9',
              color: step === 3 ? '#c2410c' : '#64748b',
              border: step === 3 ? '1px solid #fdba74' : '1px solid transparent',
            }}
          >
            3. Passenger &amp; Payment
          </div>
        </div>

        {/* ================= STEP 1: JOURNEY ================= */}
        {step === 1 && (
          <section>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
              Where can we take you?
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px' }}>
              Fixed-rate private hire transfers from Greater London or major airports to any destination in the UK.
            </p>

            <form onSubmit={handleGetQuote}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
                {/* Pickup Address with UK Autocomplete */}
                <div>
                  <AddressAutocomplete
                    id="pickup-address"
                    label="Pickup Address or London Airport"
                    value={pickup}
                    onChange={setPickup}
                    placeholder="e.g. Heathrow Terminal 5, 10 Downing St, or Harrow HA3"
                    required
                    isOrigin={true}
                  />

                  {/* Airport Shortcut Chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#64748b', alignSelf: 'center' }}>Airports:</span>
                    {AIRPORT_PRESETS.map((ap) => (
                      <button
                        key={ap.value}
                        type="button"
                        onClick={() => setPickup(ap.value)}
                        style={{
                          fontSize: '12px',
                          padding: '4px 10px',
                          borderRadius: '16px',
                          border: '1px solid #cbd5e1',
                          background: pickup.includes(ap.label.split(' ')[0]) ? '#ffedd5' : '#f8fafc',
                          color: pickup.includes(ap.label.split(' ')[0]) ? '#c2410c' : '#334155',
                          cursor: 'pointer',
                          fontWeight: 500,
                        }}
                      >
                        {ap.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Destination Address with UK Autocomplete */}
                <div>
                  <AddressAutocomplete
                    id="destination-address"
                    label="Destination Address"
                    value={destination}
                    onChange={setDestination}
                    placeholder="e.g. Southampton Cruise Terminal, Birmingham New Street, or Oxford"
                    required
                    isOrigin={false}
                  />
                </div>

                {/* Modern Interactive Date & Time Picker */}
                <DateTimePicker
                  date={pickupDate}
                  time={pickupTime}
                  onDateChange={setPickupDate}
                  onTimeChange={setPickupTime}
                  minAdvanceNoticeMinutes={45}
                />

                {/* Passengers & Bags */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                      Passengers
                    </label>
                    <select
                      value={passengers}
                      onChange={(e) => setPassengers(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '15px',
                        background: '#ffffff',
                      }}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Passenger' : 'Passengers'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                      Luggage (Large Cases)
                    </label>
                    <select
                      value={luggage}
                      onChange={(e) => setLuggage(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '15px',
                        background: '#ffffff',
                      }}
                    >
                      {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Large Bag' : 'Large Bags'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {quoteError && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '13px',
                  }}
                >
                  ⚠️ {quoteError}
                </div>
              )}

              {/* Action Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={isQuoting}
                  style={{
                    background: '#ed6b24',
                    color: '#ffffff',
                    padding: '14px 26px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '15px',
                    cursor: isQuoting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(237, 107, 36, 0.25)',
                  }}
                >
                  {isQuoting ? 'Calculating Instant Quote...' : 'See Vehicle Options →'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ================= STEP 2: VEHICLE & FARE ================= */}
        {step === 2 && quote && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                  Choose Your Vehicle
                </h1>
                <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                  Estimated Road Distance: <strong>{quote.distanceMiles} miles</strong> (~{quote.durationMinutes} mins)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ed6b24',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                ✎ Edit Journey
              </button>
            </div>

            {/* Geofence Check Notice if Ineligible */}
            {!quote.isOriginEligible && (
              <div
                style={{
                  marginBottom: '20px',
                  padding: '16px',
                  borderRadius: '10px',
                  background: '#fffbeb',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '13px',
                  lineHeight: '1.6',
                }}
              >
                <strong>⚠️ Pickup Outside Operating Boundary:</strong>
                <p style={{ margin: '6px 0' }}>
                  Flame Cars provides pickups exclusively within Greater London and the 6 London airports (Heathrow, Gatwick, Stansted, Luton, London City, Southend).
                </p>
                <p style={{ margin: 0 }}>
                  Please contact our dispatch team on <a href="tel:02034008257" style={{ color: '#92400e', fontWeight: 700 }}>020 3400 8257</a> or <a href="mailto:hello@flamecars.co.uk" style={{ color: '#92400e', fontWeight: 700 }}>hello@flamecars.co.uk</a> to arrange a custom chauffeur dispatch.
                </p>
              </div>
            )}

            {/* Vehicle Cards List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              {quote.vehicles.map((v) => {
                const exceedsPax = passengers > v.maxPassengers;
                const exceedsLuggage = luggage > v.maxLuggage;
                const isOverCapacity = exceedsPax || exceedsLuggage;
                const isSelected = selectedVehicle === v.id;

                return (
                  <div
                    key={v.id}
                    onClick={() => {
                      if (!isOverCapacity) setSelectedVehicle(v.id);
                    }}
                    style={{
                      border: isSelected ? '2px solid #ed6b24' : '1px solid #e2e8f0',
                      background: isSelected ? '#fffaf5' : isOverCapacity ? '#f8fafc' : '#ffffff',
                      borderRadius: '12px',
                      padding: '18px 20px',
                      cursor: isOverCapacity ? 'not-allowed' : 'pointer',
                      opacity: isOverCapacity ? 0.6 : 1,
                      transition: 'all 0.15s ease-in-out',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '20px' }}>
                          {v.id === 'economy'
                            ? '🚗'
                            : v.id === 'estate'
                            ? '🚙'
                            : v.id === 'mpv'
                            ? '🚐'
                            : v.id === 'executive'
                            ? '👑'
                            : '✨'}
                        </span>
                        <strong style={{ fontSize: '18px', color: '#0f172a' }}>{v.name}</strong>
                        {isSelected && !isOverCapacity && (
                          <span
                            style={{
                              background: '#ed6b24',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '12px',
                            }}
                          >
                            Selected
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px' }}>
                        {v.exampleModels}
                      </div>

                      <div style={{ display: 'flex', gap: '14px', fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                        <span>👤 Up to {v.maxPassengers} passengers</span>
                        <span>🧳 Up to {v.maxLuggage} bags</span>
                      </div>

                      {isOverCapacity && (
                        <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600, marginTop: '6px' }}>
                          ⚠️ Exceeds capacity for {passengers} passengers / {luggage} bags
                        </div>
                      )}

                      {/* Inclusions */}
                      <ul
                        style={{
                          margin: '8px 0 0',
                          paddingLeft: '18px',
                          fontSize: '12px',
                          color: '#64748b',
                          lineHeight: '1.5',
                        }}
                      >
                        {v.inclusions.slice(0, 2).map((inc, i) => (
                          <li key={i}>{inc}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Price column */}
                    <div style={{ textAlign: 'right', minWidth: '120px' }}>
                      <div style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a' }}>
                        £{v.totalFare.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        All-inclusive fixed fare
                      </div>
                      {quote.airportCharges > 0 ? (
                        <div style={{ fontSize: '11px', color: '#0284c7', marginTop: '2px' }}>
                          {quote.journeyType === 'AIRPORT_PICKUP'
                            ? `Includes £${quote.airportCharges.toFixed(2)} airport fees (£5 collection + parking)`
                            : `Includes £${quote.airportCharges.toFixed(2)} terminal drop-off charge`}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px' }}>
                          Direct point-to-point transfer
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Journey Summary Bar */}
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 18px',
                fontSize: '13px',
                color: '#334155',
                marginBottom: '24px',
              }}
            >
              <div><strong>Pickup:</strong> {quote.pickupAddress}</div>
              <div><strong>Destination:</strong> {quote.destinationAddress}</div>
              <div><strong>Scheduled Time:</strong> {quote.pickupDate} at {quote.pickupTime}</div>
              <div><strong>Requirements:</strong> {passengers} Passengers · {luggage} Bags</div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  background: '#f1f5f9',
                  color: '#334155',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                ← Back
              </button>

              <button
                type="button"
                disabled={!quote.isOriginEligible}
                onClick={handleProceedToDetails}
                style={{
                  background: '#ed6b24',
                  color: '#ffffff',
                  padding: '12px 26px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '15px',
                  cursor: !quote.isOriginEligible ? 'not-allowed' : 'pointer',
                  opacity: !quote.isOriginEligible ? 0.5 : 1,
                  boxShadow: '0 4px 12px rgba(237, 107, 36, 0.25)',
                }}
              >
                Continue to Checkout →
              </button>
            </div>
          </section>
        )}

        {/* ================= STEP 3: PASSENGER & PAYMENT ================= */}
        {step === 3 && quote && currentVehicleObj && (
          <section>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px', color: '#0f172a' }}>
              Passenger Details &amp; Checkout
            </h1>
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 20px' }}>
              No account required. Instant confirmation receipt sent immediately to your email.
            </p>

            <form onSubmit={handleProceedToPayment}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                      Passenger Full Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '15px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                      Mobile Phone Number <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 07700 900123"
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '15px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                    Email Address (for Booking Receipt &amp; Driver Updates) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. sarah.jenkins@example.com"
                    required
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                    Flight Number (Airport arrivals — we track your landing)
                  </label>
                  <input
                    type="text"
                    value={flightNumber}
                    onChange={(e) => setFlightNumber(e.target.value)}
                    placeholder="e.g. BA 1478 or EK 009 (Optional)"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px' }}>
                    Driver Instructions or Notes (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Terminal meeting point, baby seat request, or excess golf bags"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>

              {/* Promo Code Input Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px 18px',
                  marginTop: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                    🏷️ Have a Promotion or Discount Code?
                  </span>
                  {appliedPromo && (
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Remove Code ✕
                    </button>
                  )}
                </div>

                {!appliedPromo ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10, FLAME5"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value.toUpperCase());
                        setPromoError('');
                      }}
                      style={{
                        flex: 1,
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        letterSpacing: '0.5px',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={isCheckingPromo || !promoInput.trim()}
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        padding: '10px 18px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: isCheckingPromo || !promoInput.trim() ? 'not-allowed' : 'pointer',
                        opacity: isCheckingPromo || !promoInput.trim() ? 0.6 : 1,
                      }}
                    >
                      {isCheckingPromo ? 'Checking...' : 'Apply'}
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '10px 14px',
                      background: '#dcfce7',
                      border: '1px solid #86efac',
                      borderRadius: '8px',
                      color: '#166534',
                      fontSize: '13px',
                      fontWeight: 600,
                    }}
                  >
                    <span>✓</span>
                    <span>
                      Code <strong>{appliedPromo.code}</strong> applied — You save £{appliedPromo.discountAmount.toFixed(2)}!
                    </span>
                  </div>
                )}

                {promoError && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#dc2626', fontWeight: 600 }}>
                    ⚠️ {promoError}
                  </div>
                )}
                {promoSuccessMsg && !promoError && !appliedPromo && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                    {promoSuccessMsg}
                  </div>
                )}
              </div>

              {/* Order Breakdown Box */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '18px',
                  marginTop: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Vehicle Selected:</span>
                  <strong style={{ color: '#0f172a' }}>{currentVehicleObj.name}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Route:</span>
                  <span style={{ color: '#0f172a', fontSize: '13px', textAlign: 'right' }}>
                    {quote.pickupAddress} ➔ {quote.destinationAddress}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Date &amp; Time:</span>
                  <span style={{ color: '#0f172a', fontSize: '13px' }}>
                    {quote.pickupDate} at {quote.pickupTime}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Distance:</span>
                  <span style={{ color: '#0f172a', fontSize: '13px' }}>{quote.distanceMiles} miles</span>
                </div>

                {appliedPromo && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
                      <span style={{ color: '#64748b', fontSize: '14px' }}>Standard Fare:</span>
                      <span style={{ color: '#94a3b8', fontSize: '14px', textDecoration: 'line-through' }}>
                        £{appliedPromo.originalFare.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: '#16a34a', fontSize: '14px', fontWeight: 600 }}>
                        Promo Code ({appliedPromo.code}):
                      </span>
                      <span style={{ color: '#16a34a', fontSize: '14px', fontWeight: 700 }}>
                        -£{appliedPromo.discountAmount.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}

                <div
                  style={{
                    borderTop: '1px solid #cbd5e1',
                    marginTop: '12px',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>Total Fare to Pay:</span>
                  <div style={{ textAlign: 'right' }}>
                    {appliedPromo && (
                      <span style={{ fontSize: '15px', color: '#94a3b8', textDecoration: 'line-through', marginRight: '8px' }}>
                        £{appliedPromo.originalFare.toFixed(2)}
                      </span>
                    )}
                    <span style={{ fontSize: '26px', fontWeight: 800, color: '#ed6b24' }}>
                      £{(appliedPromo ? appliedPromo.discountedFare : currentVehicleObj.totalFare).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div style={{ marginTop: '18px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#475569' }}>
                  <input
                    type="checkbox"
                    checked={termsAgreed}
                    onChange={(e) => setTermsAgreed(e.target.checked)}
                    required
                    style={{ marginTop: '3px', width: 'auto' }}
                  />
                  <span>
                    I agree to Flame Cars passenger booking terms, including 45 minutes complimentary airport waiting time, flight tracking, and 24-hour cancellation terms.
                  </span>
                </label>
              </div>

              {/* Checkout Error */}
              {checkoutError && (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#991b1b',
                    fontSize: '13px',
                  }}
                >
                  ⚠️ {checkoutError}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  ← Back
                </button>

                <button
                  type="submit"
                  disabled={isCheckingOut || !termsAgreed}
                  style={{
                    background: '#ed6b24',
                    color: '#ffffff',
                    padding: '14px 28px',
                    borderRadius: '8px',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '16px',
                    cursor: isCheckingOut || !termsAgreed ? 'not-allowed' : 'pointer',
                    opacity: isCheckingOut || !termsAgreed ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 4px 14px rgba(237, 107, 36, 0.3)',
                  }}
                >
                  🔒 {isCheckingOut ? 'Opening Secure Payment...' : `Pay £${currentVehicleObj.totalFare.toFixed(2)} Securely →`}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '12px', color: '#94a3b8' }}>
                🔒 256-Bit SSL Encrypted Card Payment Powered by Stripe. We do not store card details.
              </div>
            </form>
          </section>
        )}
      </div>
    </div>
  );
}
