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
  { id: 'Saloon', name: 'Saloon (Sedan)', desc: 'Standard 4-seater (Toyota Prius, Passat, etc.)', tbmsId: 7 },
  { id: 'Estate', name: 'Estate (Wagon)', desc: 'Extended boot space for airport luggage', tbmsId: 10 },
  { id: 'MPV', name: 'MPV / 6-Seater', desc: 'Larger groups & family airport transfers', tbmsId: 11 },
  { id: 'Executive', name: 'Executive', desc: 'Mercedes E-Class, BMW 5-Series, Audi A6', tbmsId: 14 },
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
    if (!data.tflPhvVehicleLicence.trim()) {
      setError('Please enter the TfL PHV Vehicle Licence number.');
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          {CATEGORIES.map((cat) => {
            const isSelected = data.vehicleCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => onChange({ vehicleCategory: cat.id })}
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-tertiary)',
                  border: isSelected ? '2px solid var(--flame-500)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', color: isSelected ? 'var(--flame-400)' : '#fff' }}>
                  {cat.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {cat.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* TfL Vehicle Licence Number & Expiry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            TfL PHV Vehicle Licence Number <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 30219"
            value={data.tflPhvVehicleLicence}
            onChange={(e) => onChange({ tflPhvVehicleLicence: e.target.value })}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Vehicle Licence Expiry Date <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="date"
            value={data.tflPhvVehicleExpiry}
            onChange={(e) => onChange({ tflPhvVehicleExpiry: e.target.value })}
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={onBack} className="btn-secondary">
          &larr; Back to Identity
        </button>
        <button type="button" onClick={handleContinue} className="btn-primary">
          Continue to Documents &rarr;
        </button>
      </div>
    </div>
  );
}
