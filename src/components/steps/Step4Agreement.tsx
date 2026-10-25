'use client';

import { useState } from 'react';
import { DriverApplication } from '@/types/onboarding';

interface Step4AgreementProps {
  data: DriverApplication;
  onChange: (updates: Partial<DriverApplication>) => void;
  onNext: () => void;
  onBack: () => void;
}

const AIRPORTS = [
  'Heathrow Airport (LHR)',
  'Gatwick Airport (LGW)',
  'Stansted Airport (STN)',
  'Luton Airport (LTN)',
  'London City Airport (LCY)',
];

const ZONES = [
  'West London / Harrow & Wealdstone',
  'Central London / West End / City',
  'North / North-West London',
  'M4 / Heathrow Corridor',
  'Greater London All Zones',
];

export default function Step4Agreement({ data, onChange, onNext, onBack }: Step4AgreementProps) {
  const [typedSign, setTypedSign] = useState(data.signatureDataUrl || data.legalName || '');
  const [error, setError] = useState('');

  function toggleAirport(airport: string) {
    const list = [...data.preferredAirports];
    const idx = list.indexOf(airport);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(airport);
    }
    onChange({ preferredAirports: list });
  }

  function toggleZone(zone: string) {
    const list = [...data.operatingZones];
    const idx = list.indexOf(zone);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(zone);
    }
    onChange({ operatingZones: list });
  }

  function handleContinue() {
    if (!data.termsAccepted) {
      setError('You must read and accept the Independent Driver Terms & Conditions.');
      return;
    }
    if (!typedSign.trim()) {
      setError('Please provide your digital e-signature.');
      return;
    }

    onChange({
      signatureDataUrl: typedSign,
      termsAcceptedAt: new Date().toISOString(),
    });

    setError('');
    onNext();
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>4. Operating Preferences & Terms</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Select your dispatch preferences and review the independent driver engagement agreement.
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

      {/* Airport Preferences */}
      <div style={{ marginBottom: '22px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Preferred Airport Transfers (Select all that apply)
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {AIRPORTS.map((airport) => {
            const isSelected = data.preferredAirports.includes(airport);
            return (
              <button
                type="button"
                key={airport}
                onClick={() => toggleAirport(airport)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: isSelected ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-tertiary)',
                  color: isSelected ? 'var(--flame-400)' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--flame-500)' : '1px solid var(--border-subtle)',
                }}
              >
                {isSelected ? '✓ ' : '+ '}
                {airport}
              </button>
            );
          })}
        </div>
      </div>

      {/* Operating Zones */}
      <div style={{ marginBottom: '26px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Preferred Operating Areas
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {ZONES.map((zone) => {
            const isSelected = data.operatingZones.includes(zone);
            return (
              <button
                type="button"
                key={zone}
                onClick={() => toggleZone(zone)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: isSelected ? 'rgba(245, 158, 11, 0.18)' : 'var(--bg-tertiary)',
                  color: isSelected ? 'var(--flame-400)' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid var(--flame-500)' : '1px solid var(--border-subtle)',
                }}
              >
                {isSelected ? '✓ ' : '+ '}
                {zone}
              </button>
            );
          })}
        </div>
      </div>

      {/* Agreement Terms Box */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
          Independent Driver Engagement Agreement (Flame Cars Operator Terms)
        </label>
        <div
          style={{
            maxHeight: '180px',
            overflowY: 'auto',
            padding: '16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-subtle)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
          }}
        >
          <p style={{ marginBottom: '8px' }}>
            <strong>1. Status of Driver:</strong> You are contracting with Flame Cars as an independent TfL-licensed private hire driver. Nothing in this agreement constitutes an employment relationship.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>2. Licensing & Compliance:</strong> You warrant that you hold a valid, unrevoked TfL Private Hire Driver Licence, valid Hire & Reward insurance coverage, and operate an appropriately licensed vehicle at all times.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>3. Document Expiry & Suspension:</strong> You agree to provide updated copies of all renewing licences and insurance prior to expiry. Failure to supply renewals will result in immediate suspension from the dispatch platform until verified.
          </p>
          <p style={{ marginBottom: '8px' }}>
            <strong>4. Service Standards:</strong> All passenger transfers arranged through Flame Cars must be performed professionally, punctually, and in accordance with TfL regulatory standards.
          </p>
          <p>
            <strong>5. Data Protection:</strong> Personal data provided in this onboarding flow is processed in strict compliance with the UK Data Protection Act 2018 and UK GDPR.
          </p>
        </div>
      </div>

      {/* Terms Checkbox */}
      <div style={{ marginBottom: '22px' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            fontSize: '13px',
            color: 'var(--text-primary)',
          }}
        >
          <input
            type="checkbox"
            checked={data.termsAccepted}
            onChange={(e) => onChange({ termsAccepted: e.target.checked })}
            style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--flame-500)' }}
          />
          <span>
            I have read, understood, and accept the Independent Driver Engagement Agreement and confirm my eligibility under Transport for London regulations.
          </span>
        </label>
      </div>

      {/* E-Signature */}
      <div style={{ marginBottom: '28px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
          Digital E-Signature (Type your full legal name) <span style={{ color: 'var(--flame-500)' }}>*</span>
        </label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Type your full legal name to sign"
            value={typedSign}
            onChange={(e) => setTypedSign(e.target.value)}
            style={{
              fontFamily: 'serif',
              fontSize: '20px',
              fontStyle: 'italic',
              paddingLeft: '16px',
              letterSpacing: '1px',
              borderColor: typedSign ? 'var(--flame-500)' : undefined,
            }}
          />
          {typedSign && (
            <span
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '11px',
                color: 'var(--text-muted)',
              }}
            >
              Signed on {new Date().toLocaleDateString('en-GB')}
            </span>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={onBack} className="btn-secondary">
          &larr; Back to Documents
        </button>
        <button type="button" onClick={handleContinue} className="btn-primary">
          Review & Submit &rarr;
        </button>
      </div>
    </div>
  );
}
