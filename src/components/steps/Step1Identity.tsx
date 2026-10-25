'use client';

import { useState } from 'react';
import { DriverApplication } from '@/types/onboarding';

interface Step1IdentityProps {
  data: DriverApplication;
  onChange: (updates: Partial<DriverApplication>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function Step1Identity({ data, onChange, onNext, onBack }: Step1IdentityProps) {
  const [formError, setFormError] = useState('');

  function handleContinue() {
    if (!data.legalName.trim()) {
      setFormError('Please enter your full legal name as shown on your TfL licence.');
      return;
    }
    if (!data.mobileNumber.trim()) {
      setFormError('Please enter your mobile phone number.');
      return;
    }
    if (!data.email.trim() || !data.email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!data.residentialAddress.trim()) {
      setFormError('Please enter your residential address.');
      return;
    }
    if (!data.postcode.trim()) {
      setFormError('Please enter your UK postcode.');
      return;
    }
    if (!data.tflDriverBadgeNum.trim()) {
      setFormError('Please enter your TfL PHV Driver Badge number.');
      return;
    }
    if (!data.tflDriverBadgeExpiry) {
      setFormError('Please enter your TfL Badge expiry date.');
      return;
    }

    setFormError('');
    onNext();
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>1. Identity & Contact Details</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Your details must exactly match your TfL Private Hire Driver Licence.
        </p>
      </div>

      {formError && (
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
          {formError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '18px' }}>
        {/* Full Legal Name */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Full Legal Name (as on TfL Badge) <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. John David Smith"
            value={data.legalName}
            onChange={(e) => onChange({ legalName: e.target.value })}
          />
        </div>

        {/* Email Address */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Email Address <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="email"
            placeholder="e.g. john.smith@gmail.com"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
          />
        </div>
      </div>

      {/* UK Mobile Number (No OTP verification required) */}
      <div style={{ marginBottom: '18px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
          UK Mobile Number <span style={{ color: 'var(--flame-500)' }}>*</span>
        </label>
        <input
          type="tel"
          placeholder="e.g. 07700 900123"
          value={data.mobileNumber}
          onChange={(e) => onChange({ mobileNumber: e.target.value, isMobileVerified: true })}
        />
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Used for booking allocation updates and onboarding status notifications.
        </div>
      </div>

      {/* Address & Postcode */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginBottom: '18px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Residential Address <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 14 High Street, Harrow"
            value={data.residentialAddress}
            onChange={(e) => onChange({ residentialAddress: e.target.value })}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Postcode <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. HA1 2AB"
            value={data.postcode}
            onChange={(e) => onChange({ postcode: e.target.value.toUpperCase() })}
          />
        </div>
      </div>

      {/* TfL Badge Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            TfL PHV Driver Badge Number <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 123456"
            value={data.tflDriverBadgeNum}
            onChange={(e) => onChange({ tflDriverBadgeNum: e.target.value })}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            TfL Badge Expiry Date <span style={{ color: 'var(--flame-500)' }}>*</span>
          </label>
          <input
            type="date"
            value={data.tflDriverBadgeExpiry}
            onChange={(e) => onChange({ tflDriverBadgeExpiry: e.target.value })}
          />
        </div>
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={onBack} className="btn-secondary">
          &larr; Back to Overview
        </button>
        <button type="button" onClick={handleContinue} className="btn-primary">
          Continue to Vehicle &rarr;
        </button>
      </div>
    </div>
  );
}
