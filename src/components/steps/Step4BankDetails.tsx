'use client';

import { useState } from 'react';
import { DriverApplication } from '@/types/onboarding';

interface Step4BankDetailsProps {
  data: DriverApplication;
  onChange: (updates: Partial<DriverApplication>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step4BankDetails({ data, onChange, onNext, onBack }: Step4BankDetailsProps) {
  const [error, setError] = useState('');

  // Auto-format sort code to XX-XX-XX
  function handleSortCodeChange(val: string) {
    const raw = val.replace(/[^0-9]/g, '').slice(0, 6);
    let formatted = raw;
    if (raw.length > 4) {
      formatted = `${raw.slice(0, 2)}-${raw.slice(2, 4)}-${raw.slice(4)}`;
    } else if (raw.length > 2) {
      formatted = `${raw.slice(0, 2)}-${raw.slice(2)}`;
    }
    onChange({ bankSortCode: formatted });
  }

  // Auto-format account number to 8 digits
  function handleAccountNumberChange(val: string) {
    const clean = val.replace(/[^0-9]/g, '').slice(0, 8);
    onChange({ bankAccountNumber: clean });
  }

  function handleContinue() {
    if (!data.bankAccountName?.trim()) {
      setError('Please enter the bank account holder name (A/C Name).');
      return;
    }

    const cleanAcc = (data.bankAccountNumber || '').replace(/[^0-9]/g, '');
    if (cleanAcc.length !== 8) {
      setError('Please enter a valid 8-digit UK bank account number (A/C Number).');
      return;
    }

    const cleanSort = (data.bankSortCode || '').replace(/[^0-9]/g, '');
    if (cleanSort.length !== 6) {
      setError('Please enter a valid 6-digit UK bank sort code (e.g. 20-40-71).');
      return;
    }

    setError('');
    onNext();
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '22px' }}>
        <div
          className="badge badge-submitted"
          style={{ marginBottom: '10px', fontSize: '11px', padding: '4px 10px' }}
        >
          <span>🔒</span> 256-Bit Encrypted • UK BACS Direct Payout
        </div>
        <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>4. Bank Details</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Enter your UK bank account details for weekly passenger fare disbursements and commission payouts.
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
            border: '1px solid rgba(220, 38, 38, 0.25)',
          }}
        >
          {error}
        </div>
      )}

      {/* A/C Name */}
      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
          A/C Name (Account Holder Name) <span style={{ color: 'var(--flame-500)' }}>*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. John David Smith or J D Smith"
          value={data.bankAccountName || ''}
          onChange={(e) => onChange({ bankAccountName: e.target.value })}
        />
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Must match your personal name or registered sole trader/limited company bank account.
        </div>
      </div>

      {/* A/C Number & Sort Code */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '22px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            A/C Number (Account Number) <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            placeholder="e.g. 12345678"
            value={data.bankAccountNumber || ''}
            onChange={(e) => handleAccountNumberChange(e.target.value)}
            style={{ fontFamily: 'monospace', letterSpacing: '2px', fontSize: '16px' }}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Standard 8-digit UK bank account number.
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Sort Code <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={8}
            placeholder="e.g. 20-40-71"
            value={data.bankSortCode || ''}
            onChange={(e) => handleSortCodeChange(e.target.value)}
            style={{ fontFamily: 'monospace', letterSpacing: '2px', fontSize: '16px' }}
          />
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
            6-digit branch code (auto-formatted with hyphens).
          </div>
        </div>
      </div>

      {/* Remittance Information Note */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '28px',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
          💳 Payout & Remittance Schedule:
        </div>
        <div>
          Flame Cars disburses weekly completed job earnings, account customer invoices, and tips via direct Faster Payments / BACS. Your payout statement is delivered directly to your email every Monday.
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={onBack} className="btn-secondary">
          &larr; Back to Documents
        </button>
        <button type="button" onClick={handleContinue} className="btn-primary">
          Continue to Agreement &rarr;
        </button>
      </div>
    </div>
  );
}
