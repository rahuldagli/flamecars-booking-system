'use client';

import { useState } from 'react';
import { DriverApplication } from '@/types/onboarding';

interface ResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResume: (app: DriverApplication) => void;
}

export default function ResumeModal({ isOpen, onClose, onResume }: ResumeModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isRefCode = /^(flm-drv-|app_)/i.test(identifier.trim());

  async function handleResume() {
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your mobile number or reference code');
      return;
    }
    if (!isRefCode && !email.trim()) {
      setError('Please enter your registered email address to verify your identity');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const qs = new URLSearchParams({ identifier: cleanId });
      if (!isRefCode && email.trim()) {
        qs.set('email', email.trim());
      }
      const draftRes = await fetch(`/api/onboarding/draft?${qs.toString()}`);
      const draftData = await draftRes.json();

      if (!draftRes.ok || !draftData.application) {
        setError(draftData.error || 'No application found matching those details.');
        setLoading(false);
        return;
      }

      onResume(draftData.application);
      onClose();
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1100,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '28px',
          borderRadius: 'var(--radius-lg)',
          background: '#ffffff',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '20px' }}>Resume Registration</h3>
          <button
            onClick={onClose}
            style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '20px' }}
          >
            ✕
          </button>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Enter your application reference code (e.g. FLM-DRV-...), or your UK mobile number together with your registered email address.
        </p>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
            Reference Code or Mobile Number
          </label>
          <input
            type="text"
            placeholder="e.g. FLM-DRV-2026-XXXXXX or 07700 900123"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            style={{ marginBottom: '14px' }}
          />

          {!isRefCode && (
            <>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                Registered Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. driver@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ marginBottom: '18px' }}
              />
            </>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              onClick={handleResume}
              disabled={loading}
              className="btn-primary"
              style={{ flex: 2 }}
            >
              {loading ? 'Finding Draft...' : 'Restore & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
