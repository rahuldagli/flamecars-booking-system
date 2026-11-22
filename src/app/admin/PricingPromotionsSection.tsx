'use client';

import React, { useState, useEffect } from 'react';
import {
  SystemFareSettings,
  AirportFareConfig,
  VehicleCategoryConfig,
  RatesConfig,
  DiscountCode,
  PricingAuditLog,
} from '@/types/booking';
import { DEFAULT_AIRPORTS, DEFAULT_VEHICLES, DEFAULT_RATES, validateAndCalculateDiscount } from '@/lib/fareConfig';

interface PricingPromotionsSectionProps {
  currentUser: { email: string; name: string; role: string } | null;
  adminFetch: (url: string, options?: RequestInit) => Promise<Response>;
  showMessage: (text: string, type: 'success' | 'error') => void;
}

export default function PricingPromotionsSection({
  currentUser,
  adminFetch,
  showMessage,
}: PricingPromotionsSectionProps) {
  // Main Data States
  const [settings, setSettings] = useState<SystemFareSettings>({
    airports: { ...DEFAULT_AIRPORTS },
    vehicles: { ...DEFAULT_VEHICLES },
    rates: { ...DEFAULT_RATES },
    charingCross: { name: 'Charing Cross, London WC2N', lat: 51.5074, lng: -0.1278 },
  });
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [auditLogs, setAuditLogs] = useState<PricingAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  // Active Subtab inside Pricing
  const [pricingSubTab, setPricingSubTab] = useState<'airports' | 'vehicles' | 'rates' | 'discounts' | 'simulator' | 'audit'>('airports');

  // Discount Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<Partial<DiscountCode> | null>(null);

  // Live Simulator States
  const [simAirport, setSimAirport] = useState<string>('LHR');
  const [simJourneyType, setSimJourneyType] = useState<'AIRPORT_PICKUP' | 'AIRPORT_DROPOFF' | 'POINT_TO_POINT'>('AIRPORT_PICKUP');
  const [simDistanceMiles, setSimDistanceMiles] = useState<number>(18.5);
  const [simDurationMinutes, setSimDurationMinutes] = useState<number>(55);
  const [simVehicleId, setSimVehicleId] = useState<string>('economy');
  const [simDiscountCode, setSimDiscountCode] = useState<string>('');
  const [simCustomDiscountPercent, setSimCustomDiscountPercent] = useState<number>(0);

  // Fetch Settings on Mount
  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await adminFetch('/api/admin/settings/fares');
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.settings) setSettings(data.settings);
        if (data.discountCodes) setDiscountCodes(data.discountCodes);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
      } else {
        showMessage(data.error || 'Failed to load pricing settings', 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Error connecting to settings service', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Update Airport Field
  function handleAirportChange(code: string, field: keyof AirportFareConfig, value: any) {
    setSettings((prev: SystemFareSettings) => ({
      ...prev,
      airports: {
        ...prev.airports,
        [code]: {
          ...prev.airports[code],
          [field]: typeof value === 'number' ? value : Number(value) || 0,
        },
      },
    }));
  }

  // Save Airports
  async function handleSaveAirports() {
    setSavingSection('airports');
    try {
      const res = await adminFetch('/api/admin/settings/fares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          airports: settings.airports,
          summary: `Updated base driver fares & airport charges for 6 airports`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMessage('Airport driver fares and charges saved successfully ✓', 'success');
        if (data.auditLogs) setAuditLogs(data.auditLogs);
      } else {
        showMessage(data.error || 'Failed to save airport fares', 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Error saving airport fares', 'error');
    } finally {
      setSavingSection(null);
    }
  }

  // Update Vehicle Multiplier
  function handleVehicleChange(id: string, field: keyof VehicleCategoryConfig, value: any) {
    setSettings((prev: SystemFareSettings) => ({
      ...prev,
      vehicles: {
        ...prev.vehicles,
        [id]: {
          ...prev.vehicles[id],
          [field]: typeof value === 'number' ? value : Number(value) || 0,
        },
      },
    }));
  }

  // Save Vehicles
  async function handleSaveVehicles() {
    setSavingSection('vehicles');
    try {
      const res = await adminFetch('/api/admin/settings/fares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicles: settings.vehicles,
          summary: `Updated vehicle category multipliers`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMessage('Vehicle multipliers saved successfully ✓', 'success');
        if (data.auditLogs) setAuditLogs(data.auditLogs);
      } else {
        showMessage(data.error || 'Failed to save vehicle multipliers', 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Error saving vehicle multipliers', 'error');
    } finally {
      setSavingSection(null);
    }
  }

  // Update Rates Config
  function handleRateChange(field: keyof RatesConfig, value: any) {
    setSettings((prev: SystemFareSettings) => ({
      ...prev,
      rates: {
        ...prev.rates,
        [field]: Number(value) || 0,
      },
    }));
  }

  // Save Rates
  async function handleSaveRates() {
    setSavingSection('rates');
    try {
      const res = await adminFetch('/api/admin/settings/fares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rates: settings.rates,
          summary: `Updated pricing rates, target margin (${Math.round(settings.rates.targetMargin * 100)}%), and min acceptable margin (${Math.round((settings.rates.minAcceptableMargin ?? 0.1) * 100)}%)`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showMessage('Rates and profit margins saved successfully ✓', 'success');
        if (data.auditLogs) setAuditLogs(data.auditLogs);
      } else {
        showMessage(data.error || 'Failed to save rates', 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Error saving rates', 'error');
    } finally {
      setSavingSection(null);
    }
  }

  // Toggle Discount Code Active Status
  async function handleToggleDiscount(id: string) {
    try {
      const res = await adminFetch('/api/admin/settings/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle', id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscountCodes(data.discounts);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        showMessage(data.message || 'Discount status updated', 'success');
      } else {
        showMessage(data.error || 'Failed to update discount status', 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Error updating discount status', 'error');
    }
  }

  // Delete Discount Code
  async function handleDeleteDiscount(id: string, code: string) {
    if (typeof window !== 'undefined' && !window.confirm(`Are you sure you want to delete promo code '${code}'?`)) {
      return;
    }
    try {
      const res = await adminFetch('/api/admin/settings/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscountCodes(data.discounts);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        showMessage(`Promo code '${code}' removed ✓`, 'success');
      } else {
        showMessage(data.error || 'Failed to delete discount code', 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Error deleting discount code', 'error');
    }
  }

  // Save Discount Code (Create or Edit)
  async function handleSaveDiscountCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingDiscount?.code) {
      showMessage('Promo code is required', 'error');
      return;
    }

    try {
      const res = await adminFetch('/api/admin/settings/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          discount: editingDiscount,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDiscountCodes(data.discounts);
        if (data.auditLogs) setAuditLogs(data.auditLogs);
        setIsModalOpen(false);
        setEditingDiscount(null);
        showMessage(data.message || 'Promotion code saved successfully ✓', 'success');
      } else {
        showMessage(data.error || 'Failed to save promotion code', 'error');
      }
    } catch (err: any) {
      showMessage(err.message || 'Error saving promotion code', 'error');
    }
  }

  // Open Create Modal
  function openCreateDiscountModal() {
    setEditingDiscount({
      code: '',
      description: '',
      discountType: 'PERCENTAGE',
      discountValue: 10,
      minFare: 30,
      usageLimit: undefined,
      usedCount: 0,
      expiryDate: '',
      restrictedAirports: [],
      restrictedVehicles: [],
      isActive: true,
    });
    setIsModalOpen(true);
  }

  // Open Edit Modal
  function openEditDiscountModal(d: DiscountCode) {
    setEditingDiscount({ ...d });
    setIsModalOpen(true);
  }

  // Calculate Live Simulation
  const activeSimAirport = settings.airports[simAirport] || settings.airports.LHR;
  const activeSimVehicle = settings.vehicles[simVehicleId] || settings.vehicles.economy;
  const simRates = settings.rates;

  // Reference Journey
  const refMiles = activeSimAirport.refDistanceMiles;
  const refMins = activeSimAirport.refDurationMinutes;
  const trafficThreshold = activeSimAirport.trafficThresholdMinutes;
  const trafficSurcharge = refMins > trafficThreshold ? (refMins - trafficThreshold) * simRates.trafficRate : 0;

  // Economy Driver Payout
  let simEconomyDriverPayout = 0;
  let simAirportCharges = 0;

  if (simJourneyType !== 'POINT_TO_POINT') {
    const mileageDiff = simDistanceMiles - refMiles;
    const timeDiff = simDurationMinutes - refMins;
    const rawPayout =
      activeSimAirport.baseDriverFare +
      trafficSurcharge +
      mileageDiff * simRates.mileageRate +
      timeDiff * simRates.minuteRate;
    simEconomyDriverPayout = Math.max(simRates.minEconomyDriverPayout, Math.round(rawPayout * 100) / 100);

    if (simJourneyType === 'AIRPORT_PICKUP') {
      simAirportCharges = activeSimAirport.collectionAllowance + activeSimAirport.pickupParking;
    } else {
      simAirportCharges = activeSimAirport.dropoffCharge;
    }
  } else {
    const rawPoint = simRates.nonAirportBasePayout + simDistanceMiles * simRates.mileageRate + simDurationMinutes * simRates.minuteRate;
    simEconomyDriverPayout = Math.max(simRates.minEconomyDriverPayout, Math.round(rawPoint * 100) / 100);
    simAirportCharges = 0;
  }

  const simVehicleDriverPayout = Math.round(simEconomyDriverPayout * activeSimVehicle.multiplier * 100) / 100;
  const divisor = 1.0 - simRates.targetMargin - simRates.processingPercent;
  const simTotalDirectCostsBefore = simVehicleDriverPayout + simAirportCharges + simRates.processingFixed;
  const simStandardCustomerFare = Math.ceil(simTotalDirectCostsBefore / divisor);

  // Apply Discount in Simulator
  let simDiscountAmount = 0;
  let simDiscountedCustomerFare = simStandardCustomerFare;
  let simDiscountWarning: string | null = null;
  let simMinMarginViolation = false;

  if (simDiscountCode.trim()) {
    const simRes = validateAndCalculateDiscount(
      {
        code: simDiscountCode.trim(),
        fare: simStandardCustomerFare,
        driverPayout: simVehicleDriverPayout,
        airportCharges: simAirportCharges,
        airportCode: simJourneyType !== 'POINT_TO_POINT' ? activeSimAirport.code : undefined,
        vehicleCategory: activeSimVehicle.id,
      },
      settings
    );

    if (simRes.valid) {
      simDiscountAmount = simRes.discountAmount;
      simDiscountedCustomerFare = simRes.discountedFare;
      simDiscountWarning = simRes.warning || null;
      simMinMarginViolation = false;
    } else {
      simDiscountAmount = simRes.discountAmount || 0;
      simDiscountedCustomerFare = simRes.discountedFare || simStandardCustomerFare;
      simDiscountWarning = simRes.error || simRes.warning || 'Invalid code for simulated route.';
      simMinMarginViolation = simRes.minMarginViolation || false;
    }
  } else if (simCustomDiscountPercent > 0) {
    simDiscountAmount = Math.round(simStandardCustomerFare * (simCustomDiscountPercent / 100) * 100) / 100;
    simDiscountedCustomerFare = Math.max(1, Math.round((simStandardCustomerFare - simDiscountAmount) * 100) / 100);
  }

  // Margin Analysis
  const simFinalProcessingFee = Math.round((simDiscountedCustomerFare * simRates.processingPercent + simRates.processingFixed) * 100) / 100;
  const simFinalTotalCosts = simVehicleDriverPayout + simAirportCharges + simFinalProcessingFee;
  const simNetProfit = Math.round((simDiscountedCustomerFare - simFinalTotalCosts) * 100) / 100;
  const simNetMarginPercent = simDiscountedCustomerFare > 0 ? Math.round((simNetProfit / simDiscountedCustomerFare) * 1000) / 10 : 0;
  const minAcceptableThreshold = (simRates.minAcceptableMargin ?? 0.1) * 100;
  const targetThreshold = simRates.targetMargin * 100;

  const isBelowMinAcceptableMargin = simNetMarginPercent < minAcceptableThreshold;
  const isBelowTargetMargin = simNetMarginPercent < targetThreshold && !isBelowMinAcceptableMargin;

  const airportList: AirportFareConfig[] = Object.values(settings.airports);
  const vehicleList: VehicleCategoryConfig[] = Object.values(settings.vehicles);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
        <div>Loading Flame Cars pricing configuration...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Subtab Navigation */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          background: '#ffffff',
          padding: '8px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          onClick={() => setPricingSubTab('airports')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            background: pricingSubTab === 'airports' ? '#ed6b24' : 'transparent',
            color: pricingSubTab === 'airports' ? '#ffffff' : '#64748b',
          }}
        >
          ✈️ Airport Base Fares ({Object.keys(settings.airports).length})
        </button>

        <button
          type="button"
          onClick={() => setPricingSubTab('vehicles')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            background: pricingSubTab === 'vehicles' ? '#ed6b24' : 'transparent',
            color: pricingSubTab === 'vehicles' ? '#ffffff' : '#64748b',
          }}
        >
          🚘 Vehicle Multipliers ({Object.keys(settings.vehicles).length})
        </button>

        <button
          type="button"
          onClick={() => setPricingSubTab('rates')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            background: pricingSubTab === 'rates' ? '#ed6b24' : 'transparent',
            color: pricingSubTab === 'rates' ? '#ffffff' : '#64748b',
          }}
        >
          📊 Rates, Margins &amp; Fees
        </button>

        <button
          type="button"
          onClick={() => setPricingSubTab('discounts')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            background: pricingSubTab === 'discounts' ? '#ed6b24' : 'transparent',
            color: pricingSubTab === 'discounts' ? '#ffffff' : '#64748b',
          }}
        >
          🏷️ Promotion Codes ({discountCodes.length})
        </button>

        <button
          type="button"
          onClick={() => setPricingSubTab('simulator')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            background: pricingSubTab === 'simulator' ? '#ed6b24' : 'transparent',
            color: pricingSubTab === 'simulator' ? '#ffffff' : '#64748b',
          }}
        >
          🧮 Live Fare Preview &amp; Margin Simulator
        </button>

        <button
          type="button"
          onClick={() => setPricingSubTab('audit')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            background: pricingSubTab === 'audit' ? '#ed6b24' : 'transparent',
            color: pricingSubTab === 'audit' ? '#ffffff' : '#64748b',
          }}
        >
          📜 Audit History ({auditLogs.length})
        </button>
      </div>

      {/* ================= 1. AIRPORTS TAB ================= */}
      {pricingSubTab === 'airports' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                London Airports — Base Driver Fares &amp; Terminal Charges
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Reference hub: <strong>Charing Cross, London WC2N</strong>. Airport charges are added directly on top of the calculated driver payout.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveAirports}
              disabled={savingSection === 'airports'}
              className="btn-primary"
              style={{ fontSize: '13px', padding: '10px 20px', fontWeight: 700 }}
            >
              {savingSection === 'airports' ? 'Saving...' : '💾 Save Airport Fares'}
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Airport</th>
                  <th style={{ padding: '12px 14px' }}>Base Driver Payout (£)</th>
                  <th style={{ padding: '12px 14px' }}>Traffic Threshold (mins)</th>
                  <th style={{ padding: '12px 14px' }}>Pickup Parking (£)</th>
                  <th style={{ padding: '12px 14px' }}>Drop-off Charge (£)</th>
                  <th style={{ padding: '12px 14px' }}>Driver Collection (£)</th>
                  <th style={{ padding: '12px 14px' }}>Ref Journey</th>
                </tr>
              </thead>
              <tbody>
                {airportList.map((ap) => (
                  <tr key={ap.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <strong style={{ color: '#0f172a' }}>{ap.name}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>Code: {ap.code}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>£</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ap.baseDriverFare}
                          onChange={(e) => handleAirportChange(ap.code, 'baseDriverFare', e.target.value)}
                          style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          step="5"
                          min="0"
                          value={ap.trafficThresholdMinutes}
                          onChange={(e) => handleAirportChange(ap.code, 'trafficThresholdMinutes', e.target.value)}
                          style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                        <span style={{ color: '#64748b' }}>min</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>£</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ap.pickupParking}
                          onChange={(e) => handleAirportChange(ap.code, 'pickupParking', e.target.value)}
                          style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>£</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ap.dropoffCharge}
                          onChange={(e) => handleAirportChange(ap.code, 'dropoffCharge', e.target.value)}
                          style={{ width: '80px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>£</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={ap.collectionAllowance}
                          onChange={(e) => handleAirportChange(ap.code, 'collectionAllowance', e.target.value)}
                          style={{ width: '70px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        />
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '12px' }}>
                      {ap.refDistanceMiles} mi · {ap.refDurationMinutes} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 2. VEHICLE MULTIPLIERS TAB ================= */}
      {pricingSubTab === 'vehicles' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                Vehicle Category Multipliers
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Only the journey payout is multiplied by this factor. Airport charges are added separately.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveVehicles}
              disabled={savingSection === 'vehicles'}
              className="btn-primary"
              style={{ fontSize: '13px', padding: '10px 20px', fontWeight: 700 }}
            >
              {savingSection === 'vehicles' ? 'Saving...' : '💾 Save Vehicle Multipliers'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {vehicleList.map((v) => (
              <div
                key={v.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '18px',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '16px', color: '#0f172a' }}>{v.name}</strong>
                  <span className="badge badge-approved" style={{ fontSize: '11px', padding: '2px 8px' }}>
                    TBMS Car Type #{v.tbmsCarTypeId}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                  {v.exampleModels}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Multiplier Factor:
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      min="1.0"
                      max="5.0"
                      value={v.multiplier}
                      onChange={(e) => handleVehicleChange(v.id, 'multiplier', e.target.value)}
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 700 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Capacity (Pax / Bags):
                    </label>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="number"
                        min="1"
                        max="16"
                        value={v.maxPassengers}
                        onChange={(e) => handleVehicleChange(v.id, 'maxPassengers', e.target.value)}
                        style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        title="Max Passengers"
                      />
                      <input
                        type="number"
                        min="0"
                        max="16"
                        value={v.maxLuggage}
                        onChange={(e) => handleVehicleChange(v.id, 'maxLuggage', e.target.value)}
                        style={{ width: '50%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                        title="Max Luggage"
                      />
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b', background: '#ffffff', padding: '8px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  Example Base Heathrow: <strong>£{(35 * v.multiplier).toFixed(2)}</strong> driver payout
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= 3. RATES & MARGINS TAB ================= */}
      {pricingSubTab === 'rates' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                Rates, Margins &amp; Payment Processing Policy
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Configures journey adjustments, driver minimums, profit margins, and Stripe transaction fees.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveRates}
              disabled={savingSection === 'rates'}
              className="btn-primary"
              style={{ fontSize: '13px', padding: '10px 20px', fontWeight: 700 }}
            >
              {savingSection === 'rates' ? 'Saving...' : '💾 Save Rates & Margins'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Rates Card */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#f8fafc' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: '#0f172a' }}>
                🚗 Mileage &amp; Travel Time Adjustments
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Mileage Rate (£ per mile):
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    value={settings.rates.mileageRate}
                    onChange={(e) => handleRateChange('mileageRate', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Default: £1.25 / mile difference</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Driving Time Rate (£ per minute):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.rates.minuteRate}
                    onChange={(e) => handleRateChange('minuteRate', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Default: £0.17 / minute difference</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Traffic Surcharge Rate (£ per min above threshold):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={settings.rates.trafficRate}
                    onChange={(e) => handleRateChange('trafficRate', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Default: £0.17 / minute above threshold</div>
                </div>
              </div>
            </div>

            {/* Minimums & Non-Airport Card */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#f8fafc' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: '#0f172a' }}>
                🛡️ Driver Payout Safeguards
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Minimum Economy Driver Payout (£):
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={settings.rates.minEconomyDriverPayout}
                    onChange={(e) => handleRateChange('minEconomyDriverPayout', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Default: £20.00 floor for any journey</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Non-Airport (Point-to-Point) Base Payout (£):
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={settings.rates.nonAirportBasePayout}
                    onChange={(e) => handleRateChange('nonAirportBasePayout', e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Default: £15.00 starting payout</div>
                </div>
              </div>
            </div>

            {/* Target & Min Margins Card */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', background: '#f8fafc' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 14px', color: '#0f172a' }}>
                📈 Flame Cars Margin Policy &amp; Restrictions
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Target Contribution Margin (%):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      step="1"
                      min="5"
                      max="50"
                      value={Math.round(settings.rates.targetMargin * 100)}
                      onChange={(e) => handleRateChange('targetMargin', (Number(e.target.value) || 20) / 100)}
                      style={{ width: '80px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>%</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Default: 20% target profit margin</div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Minimum Acceptable Margin Threshold (%):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="40"
                      value={Math.round((settings.rates.minAcceptableMargin ?? 0.1) * 100)}
                      onChange={(e) => handleRateChange('minAcceptableMargin', (Number(e.target.value) || 10) / 100)}
                      style={{ width: '80px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 600 }}>%</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#dc2626', marginTop: '2px' }}>
                    ⚠️ Any promotion code taking a booking below this margin will be restricted or trigger an alert.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Payment Processing Fee (Stripe Gateway):
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="number"
                      step="0.1"
                      value={Math.round(settings.rates.processingPercent * 1000) / 10}
                      onChange={(e) => handleRateChange('processingPercent', (Number(e.target.value) || 1.5) / 100)}
                      style={{ width: '70px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                    <span style={{ fontSize: '12px' }}>% + £</span>
                    <input
                      type="number"
                      step="0.05"
                      value={settings.rates.processingFixed}
                      onChange={(e) => handleRateChange('processingFixed', e.target.value)}
                      style={{ width: '70px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Default: 1.5% + £0.20 per transaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 4. PROMOTION CODES TAB ================= */}
      {pricingSubTab === 'discounts' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                Discount &amp; Promotion Code Management
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Manage customer promo codes, percentage or fixed discounts, usage limits, and route/vehicle restrictions.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreateDiscountModal}
              className="btn-primary"
              style={{ fontSize: '13px', padding: '10px 18px', fontWeight: 700 }}
            >
              ➕ Create Promo Code
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Code</th>
                  <th style={{ padding: '12px 14px' }}>Discount</th>
                  <th style={{ padding: '12px 14px' }}>Min Fare</th>
                  <th style={{ padding: '12px 14px' }}>Restrictions</th>
                  <th style={{ padding: '12px 14px' }}>Usage / Limit</th>
                  <th style={{ padding: '12px 14px' }}>Expiry</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {discountCodes.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <strong style={{ color: '#0f172a', letterSpacing: '0.5px' }}>{d.code}</strong>
                      {d.description && <div style={{ fontSize: '11px', color: '#64748b' }}>{d.description}</div>}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge" style={{ background: '#ffedd5', color: '#c2410c', fontWeight: 700, padding: '4px 8px' }}>
                        {d.discountType === 'PERCENTAGE' ? `${d.discountValue}% OFF` : `£${d.discountValue.toFixed(2)} OFF`}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>
                      {d.minFare ? `£${d.minFare.toFixed(2)}` : 'None'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569' }}>
                      {d.restrictedAirports && d.restrictedAirports.length > 0 ? (
                        <div>✈️ {d.restrictedAirports.join(', ')}</div>
                      ) : null}
                      {d.restrictedVehicles && d.restrictedVehicles.length > 0 ? (
                        <div>🚘 {d.restrictedVehicles.join(', ')}</div>
                      ) : null}
                      {(!d.restrictedAirports || d.restrictedAirports.length === 0) &&
                      (!d.restrictedVehicles || d.restrictedVehicles.length === 0) ? (
                        <span style={{ color: '#16a34a' }}>All Routes &amp; Cars</span>
                      ) : null}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <strong>{d.usedCount || 0}</strong> {d.usageLimit ? `/ ${d.usageLimit}` : 'uses'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748b' }}>
                      {d.expiryDate ? d.expiryDate : 'No Expiry'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        type="button"
                        onClick={() => handleToggleDiscount(d.id)}
                        style={{
                          background: d.isActive ? '#dcfce7' : '#f1f5f9',
                          color: d.isActive ? '#15803d' : '#64748b',
                          border: `1px solid ${d.isActive ? '#86efac' : '#cbd5e1'}`,
                          borderRadius: '12px',
                          padding: '3px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {d.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => openEditDiscountModal(d)}
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '11px' }}
                        >
                          ✎ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteDiscount(d.id, d.code)}
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 5. LIVE FARE PREVIEW & SIMULATOR TAB ================= */}
      {pricingSubTab === 'simulator' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              🧮 Live Fare Preview &amp; Contribution Margin Simulator
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Test pricing formulas, airport base rates, traffic surcharges, and discount codes before publishing to production.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            {/* Input Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#0f172a' }}>1. Journey Parameters</h3>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Journey Type:
                </label>
                <select
                  value={simJourneyType}
                  onChange={(e: any) => setSimJourneyType(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  <option value="AIRPORT_PICKUP">Airport Pickup (Collection allowance + Parking included)</option>
                  <option value="AIRPORT_DROPOFF">Airport Drop-off (Terminal drop-off fee only)</option>
                  <option value="POINT_TO_POINT">Point-to-Point (Non-Airport corridor)</option>
                </select>
              </div>

              {simJourneyType !== 'POINT_TO_POINT' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Airport:
                  </label>
                  <select
                    value={simAirport}
                    onChange={(e) => setSimAirport(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  >
                    {airportList.map((ap) => (
                      <option key={ap.code} value={ap.code}>
                        {ap.name} (Base: £{ap.baseDriverFare})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Actual Road Miles:
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    value={simDistanceMiles}
                    onChange={(e) => setSimDistanceMiles(Number(e.target.value) || 1)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Predicted Duration (mins):
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="5"
                    value={simDurationMinutes}
                    onChange={(e) => setSimDurationMinutes(Number(e.target.value) || 5)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Vehicle Category:
                </label>
                <select
                  value={simVehicleId}
                  onChange={(e) => setSimVehicleId(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                >
                  {vehicleList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.multiplier}x multiplier)
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                  Apply Promotion Code or Test Discount:
                </label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <input
                    type="text"
                    placeholder="e.g. WELCOME10, FLAME5"
                    value={simDiscountCode}
                    onChange={(e) => {
                      setSimDiscountCode(e.target.value.toUpperCase());
                      setSimCustomDiscountPercent(0);
                    }}
                    style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', textTransform: 'uppercase' }}
                  />
                  {simDiscountCode && (
                    <button
                      type="button"
                      onClick={() => setSimDiscountCode('')}
                      className="btn-secondary"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>Or test % slider:</span>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    step="5"
                    value={simCustomDiscountPercent}
                    onChange={(e) => {
                      setSimCustomDiscountPercent(Number(e.target.value));
                      setSimDiscountCode('');
                    }}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 700, width: '36px' }}>
                    {simCustomDiscountPercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Live Calculation Output Card */}
            <div
              style={{
                background: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '12px',
                padding: '22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                    2. Calculation &amp; Margin Breakdown
                  </h3>
                  {/* Status Badge */}
                  {isBelowMinAcceptableMargin ? (
                    <span style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #f87171', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                      🔴 Below Min Margin ({simNetMarginPercent}%)
                    </span>
                  ) : isBelowTargetMargin ? (
                    <span style={{ background: '#fef3c7', color: '#b45309', border: '1px solid #fcd34d', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                      🟡 Acceptable ({simNetMarginPercent}%)
                    </span>
                  ) : (
                    <span style={{ background: '#dcfce7', color: '#15803d', border: '1px solid #86efac', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700 }}>
                      🟢 Profitable ({simNetMarginPercent}%)
                    </span>
                  )}
                </div>

                {/* Low Margin Warning Banner */}
                {isBelowMinAcceptableMargin && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fca5a5',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      marginBottom: '16px',
                      color: '#991b1b',
                      fontSize: '12px',
                      lineHeight: '1.5',
                    }}
                  >
                    <strong>⚠️ RESTRICTION / MINIMUM MARGIN WARNING:</strong>
                    <div>
                      This discount produces a net margin of <strong>{simNetMarginPercent}%</strong>, which is below Flame Cars' minimum acceptable margin threshold of <strong>{minAcceptableThreshold}%</strong>. In production booking, this discount is restricted.
                    </div>
                  </div>
                )}

                {simDiscountWarning && !isBelowMinAcceptableMargin && (
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      marginBottom: '14px',
                      color: '#92400e',
                      fontSize: '12px',
                    }}
                  >
                    ℹ️ {simDiscountWarning}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Economy Base Payout:</span>
                    <span>£{simEconomyDriverPayout.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Vehicle Multiplier ({activeSimVehicle.multiplier}x):</span>
                    <strong>£{simVehicleDriverPayout.toFixed(2)} driver payout</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Airport Parking / Drop-off / Collection:</span>
                    <span>£{simAirportCharges.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
                    <span>Stripe Gateway Processing Fee:</span>
                    <span>£{simFinalProcessingFee.toFixed(2)}</span>
                  </div>

                  <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '6px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#64748b' }}>Standard Customer Fare:</span>
                    <span style={{ fontWeight: 600 }}>£{simStandardCustomerFare.toFixed(2)}</span>
                  </div>

                  {simDiscountAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}>
                      <span>Discount Applied:</span>
                      <strong>-£{simDiscountAmount.toFixed(2)}</strong>
                    </div>
                  )}

                  <div style={{ borderTop: '2px solid #0f172a', marginTop: '6px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>Final Customer Price:</span>
                    <span style={{ fontSize: '26px', fontWeight: 800, color: '#ed6b24' }}>
                      £{simDiscountedCustomerFare.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Profit & Margin Summary Card */}
              <div
                style={{
                  background: isBelowMinAcceptableMargin ? '#fff1f2' : isBelowTargetMargin ? '#fffbeb' : '#f0fdf4',
                  border: `1px solid ${isBelowMinAcceptableMargin ? '#fecdd3' : isBelowTargetMargin ? '#fef3c7' : '#bbf7d0'}`,
                  borderRadius: '10px',
                  padding: '14px',
                  marginTop: '16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>Net Profit to Flame Cars:</span>
                  <strong style={{ fontSize: '15px', color: isBelowMinAcceptableMargin ? '#be123c' : '#15803d' }}>
                    £{simNetProfit.toFixed(2)}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>Contribution Margin:</span>
                  <strong style={{ fontSize: '15px', color: isBelowMinAcceptableMargin ? '#be123c' : '#15803d' }}>
                    {simNetMarginPercent}% (Target: {targetThreshold}%)
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 6. PRICING AUDIT TRAIL TAB ================= */}
      {pricingSubTab === 'audit' && (
        <div style={{ background: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              Pricing Change History &amp; Audit Trail
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Chronological log of all modifications made to base driver payouts, multipliers, margins, and promotion codes.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 14px' }}>Timestamp</th>
                  <th style={{ padding: '12px 14px' }}>Staff Member</th>
                  <th style={{ padding: '12px 14px' }}>Change Type</th>
                  <th style={{ padding: '12px 14px' }}>Summary of Changes</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: '#64748b' }}>
                      {new Date(log.timestamp).toLocaleString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <strong style={{ color: '#0f172a' }}>{log.changedBy}</strong>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        className="badge"
                        style={{
                          background:
                            log.changeType === 'AIRPORT_FARE'
                              ? '#e0f2fe'
                              : log.changeType === 'VEHICLE_MULTIPLIER'
                              ? '#fef3c7'
                              : log.changeType === 'DISCOUNT_CODE'
                              ? '#ffedd5'
                              : '#f1f5f9',
                          color:
                            log.changeType === 'AIRPORT_FARE'
                              ? '#0369a1'
                              : log.changeType === 'VEHICLE_MULTIPLIER'
                              ? '#b45309'
                              : log.changeType === 'DISCOUNT_CODE'
                              ? '#c2410c'
                              : '#475569',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                        }}
                      >
                        {log.changeType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#334155' }}>
                      {log.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= MODAL: CREATE / EDIT PROMOTION CODE ================= */}
      {isModalOpen && editingDiscount && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                {editingDiscount.id ? `Edit Promo Code: ${editingDiscount.code}` : 'Create New Promotion Code'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDiscountCodeSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Code Name (e.g. SUMMER10) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AIRPORT15"
                    value={editingDiscount.code}
                    onChange={(e) =>
                      setEditingDiscount({ ...editingDiscount, code: e.target.value.toUpperCase().replace(/\s+/g, '') })
                    }
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10% off for airport summer bookings"
                    value={editingDiscount.description || ''}
                    onChange={(e) => setEditingDiscount({ ...editingDiscount, description: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Discount Type
                    </label>
                    <select
                      value={editingDiscount.discountType}
                      onChange={(e: any) => setEditingDiscount({ ...editingDiscount, discountType: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount (£)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Value ({editingDiscount.discountType === 'PERCENTAGE' ? '%' : '£'})
                    </label>
                    <input
                      type="number"
                      step={editingDiscount.discountType === 'PERCENTAGE' ? '1' : '0.5'}
                      min="1"
                      max={editingDiscount.discountType === 'PERCENTAGE' ? '90' : '500'}
                      required
                      value={editingDiscount.discountValue}
                      onChange={(e) => setEditingDiscount({ ...editingDiscount, discountValue: Number(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', fontWeight: 700 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Minimum Fare (£)
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={editingDiscount.minFare || ''}
                      placeholder="e.g. 40"
                      onChange={(e) =>
                        setEditingDiscount({
                          ...editingDiscount,
                          minFare: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                      Usage Limit (Uses)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      value={editingDiscount.usageLimit || ''}
                      placeholder="Unlimited"
                      onChange={(e) =>
                        setEditingDiscount({
                          ...editingDiscount,
                          usageLimit: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={editingDiscount.expiryDate || ''}
                    onChange={(e) => setEditingDiscount({ ...editingDiscount, expiryDate: e.target.value || undefined })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Restricted to Airports (Optional):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Object.values(settings.airports).map((ap) => {
                      const isChecked = editingDiscount.restrictedAirports?.includes(ap.code) || false;
                      return (
                        <label
                          key={ap.code}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: isChecked ? '#ffedd5' : '#f8fafc',
                            border: `1px solid ${isChecked ? '#fdba74' : '#cbd5e1'}`,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const list = editingDiscount.restrictedAirports || [];
                              const updated = e.target.checked
                                ? [...list, ap.code]
                                : list.filter((c) => c !== ap.code);
                              setEditingDiscount({ ...editingDiscount, restrictedAirports: updated });
                            }}
                          />
                          <span>{ap.code}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Restricted to Vehicles (Optional):
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {Object.values(settings.vehicles).map((v) => {
                      const isChecked = editingDiscount.restrictedVehicles?.includes(v.id) || false;
                      return (
                        <label
                          key={v.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: isChecked ? '#ffedd5' : '#f8fafc',
                            border: `1px solid ${isChecked ? '#fdba74' : '#cbd5e1'}`,
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const list = editingDiscount.restrictedVehicles || [];
                              const updated = e.target.checked
                                ? [...list, v.id]
                                : list.filter((c) => c !== v.id);
                              setEditingDiscount({ ...editingDiscount, restrictedVehicles: updated });
                            }}
                          />
                          <span>{v.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    id="disc-active"
                    checked={editingDiscount.isActive ?? true}
                    onChange={(e) => setEditingDiscount({ ...editingDiscount, isActive: e.target.checked })}
                  />
                  <label htmlFor="disc-active" style={{ fontSize: '13px', fontWeight: 600 }}>
                    Active (Customers can use this promotion code)
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: '10px 22px', fontSize: '13px', fontWeight: 700 }}
                >
                  Save Promotion Code
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
