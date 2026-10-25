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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleResume() {
    if (!identifier.trim()) {
      setError('Please enter your mobile number or reference code');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // Find draft application directly by mobile or reference number
      const draftRes = await fetch(`/api/onboarding/draft?identifier=${encodeURIComponent(identifier)}`);
      const draftData = await draftRes.json();

      if (!draftRes.ok || !draftData.application) {
        setError('No application found with that mobile number or reference code.');
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
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
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
          border: '1px solid var(--border-medium)',
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
          Enter the UK mobile number or application reference code (e.g. FLM-DRV-...) you used when starting your application.
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
            Mobile Number or Reference Code
          </label>
          <input
            type="text"
            placeholder="e.g. 07700 900123 or FLM-DRV-..."
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            style={{ marginBottom: '18px' }}
          />

          <div style={{ display: 'flex', gap: '10px' }}>
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
