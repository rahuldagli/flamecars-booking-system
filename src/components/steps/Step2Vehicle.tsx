'use client';

import { useState } from 'react';
import { DriverApplication } from '@/types/onboarding';

interface Step2VehicleProps {
  data: DriverApplication;
  onChange: (updates: Partial<DriverApplication>) => void;
  onNext: () => void;
  onBack: () => void;
}

const CATEGORIES = [
  { id: 'Saloon', name: 'Saloon (Sedan)', desc: 'Standard 4-seater (Toyota Prius, Passat, etc.)', seats: 4, tbmsId: 7 },
  { id: 'Estate', name: 'Estate (Wagon)', desc: 'Extended boot space for airport luggage', seats: 4, tbmsId: 10 },
  { id: 'MPV5', name: 'MPV5', desc: '5-Passenger capacity MPV / Space Wagon', seats: 5, tbmsId: 11 },
  { id: 'MPV6', name: 'MPV6', desc: '6-Passenger capacity MPV', seats: 6, tbmsId: 12 },
  { id: 'MPV 7/8', name: 'MPV 7/8', desc: '7 to 8 Passenger large capacity vehicle', seats: 8, tbmsId: 13 },
  { id: 'Executive', name: 'Executive', desc: 'Mercedes E-Class, BMW 5-Series, Audi A6', seats: 4, tbmsId: 14 },
];

export default function Step2Vehicle({ data, onChange, onNext, onBack }: Step2VehicleProps) {
  const [error, setError] = useState('');

  function handleVrmChange(val: string) {
    // Normalise UK VRM to uppercase and clean whitespace
    const clean = val.toUpperCase().replace(/[^A-Z0-9 ]/g, '');
    onChange({ vrm: clean });
  }

  function handleContinue() {
    if (!data.vrm.trim()) {
      setError('Please enter the vehicle registration mark (VRM).');
      return;
    }
    if (!data.make.trim()) {
      setError('Please enter vehicle make (e.g. Toyota, Mercedes).');
      return;
    }
    if (!data.model.trim()) {
      setError('Please enter vehicle model (e.g. Prius, E-Class).');
      return;
    }
    if (!data.colour.trim()) {
      setError('Please enter vehicle colour.');
      return;
    }
    if (!data.tflPhvVehicleExpiry) {
      setError('Please enter the TfL Vehicle Licence expiry date.');
      return;
    }

    setError('');
    onNext();
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>2. Vehicle Information</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Details of the TfL-licensed vehicle you will be operating with Flame Cars.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: '13px',
            marginBottom: '20px',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          {error}
        </div>
      )}

      {/* VRM UK Number Plate Display */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
          Vehicle Registration Mark (VRM) <span style={{ color: 'var(--flame-500)' }}>*</span>
        </label>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div
            style={{
              background: '#facc15',
              color: '#000000',
              fontWeight: 800,
              fontSize: '22px',
              letterSpacing: '2px',
              padding: '6px 18px',
              borderRadius: '6px',
              border: '2px solid #000000',
              fontFamily: 'monospace',
              minWidth: '150px',
              textAlign: 'center',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.08)',
            }}
          >
            {data.vrm.trim() || 'REG PLATE'}
          </div>
          <input
            type="text"
            placeholder="e.g. EA70 ABC"
            value={data.vrm}
            onChange={(e) => handleVrmChange(e.target.value)}
            style={{ flex: 1, textTransform: 'uppercase', fontWeight: 600 }}
          />
        </div>
      </div>

      {/* Make, Model, Colour, Year */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '18px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Make <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Mercedes-Benz"
            value={data.make}
            onChange={(e) => onChange({ make: e.target.value })}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Model <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. E-Class"
            value={data.model}
            onChange={(e) => onChange({ model: e.target.value })}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Colour <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Black"
            value={data.colour}
            onChange={(e) => onChange({ colour: e.target.value })}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Year of Registration
          </label>
          <input
            type="text"
            placeholder="e.g. 2021"
            value={data.year || ''}
            onChange={(e) => onChange({ year: e.target.value })}
          />
        </div>
      </div>

      {/* Capacity & Category */}
      <div style={{ marginBottom: '22px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Select Vehicle Category (Flame Cars Fleet Tier)
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {CATEGORIES.map((cat) => {
            const isSelected = data.vehicleCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => onChange({ vehicleCategory: cat.id, passengerSeats: cat.seats })}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'var(--flame-50)' : '#ffffff',
                  border: isSelected ? '2px solid var(--flame-500)' : '1px solid var(--border-medium)',
                  boxShadow: isSelected ? '0 2px 8px rgba(234, 88, 12, 0.15)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? 'var(--flame-600)' : 'var(--text-primary)' }}>
                    {cat.name}
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      background: isSelected ? 'var(--flame-500)' : 'var(--bg-tertiary)',
                      color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    {cat.seats} Seats
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  {cat.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vehicle Licence Expiry */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
          Vehicle Licence Expiry Date <span style={{ color: 'var(--flame-500)' }}>*</span>
        </label>
        <input
          type="date"
          value={data.tflPhvVehicleExpiry}
          onChange={(e) => onChange({ tflPhvVehicleExpiry: e.target.value })}
        />
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Document image/disc will be scanned and verified with AI in Step 3.
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <button type="button" onClick={onBack} className="btn-secondary">
          ← Back to Identity
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onNext}
            style={{
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '13px',
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            Skip to Documents →
          </button>
          <button type="button" onClick={handleContinue} className="btn-primary">
            Continue to Documents →
          </button>
        </div>
      </div>
    </div>
  );
}
