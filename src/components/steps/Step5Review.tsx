'use client';

import { useState } from 'react';
import { DriverApplication, REQUIRED_DOCUMENTS_CONFIG } from '@/types/onboarding';

interface Step5ReviewProps {
  data: DriverApplication;
  onChange: (updates: Partial<DriverApplication>) => void;
  onEditStep: (step: number) => void;
  onSubmitSuccess: (refNumber: string) => void;
  onBack: () => void;
}

export default function Step5Review({
  data,
  onChange,
  onEditStep,
  onSubmitSuccess,
  onBack,
}: Step5ReviewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  async function handleSubmit() {
    if (!data.consentAccuracy) {
      setError('Please certify that all information and documents supplied are true and accurate.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const resData = await res.json();
      if (res.ok) {
        setSubmittedRef(resData.referenceNumber);
        onSubmitSuccess(resData.referenceNumber);
      } else {
        setError(resData.error || 'Submission failed. Please check all fields.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedRef) {
    return (
      <div className="glass-panel animate-fade-in" style={{ padding: '36px', textAlign: 'center' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--success-bg)',
            color: 'var(--success)',
            fontSize: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px auto',
            border: '2px solid rgba(16, 185, 129, 0.4)',
          }}
        >
          ✓
        </div>

        <div className="badge badge-submitted" style={{ marginBottom: '14px' }}>
          Application Received
        </div>

        <h2 style={{ fontSize: '28px', marginBottom: '10px' }}>
          Registration Submitted!
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '520px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
          Thank you, <strong>{data.legalName}</strong>. Your driver onboarding file has been queued for compliance review.
        </p>

        {/* Reference Code Card */}
        <div
          style={{
            maxWidth: '360px',
            margin: '0 auto 28px auto',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-flame)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            YOUR APPLICATION REFERENCE
          </div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '2px',
              color: 'var(--flame-400)',
            }}
          >
            {submittedRef}
          </div>
        </div>

        {/* Next Steps */}
        <div
          style={{
            maxWidth: '520px',
            margin: '0 auto 30px auto',
            textAlign: 'left',
            padding: '18px',
            borderRadius: 'var(--radius-sm)',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-subtle)',
            fontSize: '13px',
            lineHeight: 1.6,
          }}
        >
          <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#fff' }}>What Happens Next:</h4>
          <ol style={{ paddingLeft: '20px', color: 'var(--text-secondary)' }}>
            <li style={{ marginBottom: '6px' }}>
              <strong>TfL Register Verification:</strong> Our compliance officer will cross-check your badge and vehicle licence details with Transport for London.
            </li>
            <li style={{ marginBottom: '6px' }}>
              <strong>Document Audit:</strong> We check your Hire & Reward insurance policy validity and dates.
            </li>
            <li>
              <strong>TBMS Dispatch Activation:</strong> Once approved, your driver profile is automatically synced to the TBMS dispatch engine and you will receive your login SMS.
            </li>
          </ol>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <a href="/admin" className="btn-secondary" style={{ textDecoration: 'none' }}>
            View in Staff Portal &rarr;
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '28px' }}>
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>5. Review & Submit Application</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Please verify your details before submitting your onboarding application for compliance review.
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

      {/* Section 1: Identity */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px' }}>1. Identity & Contact</h4>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            style={{ background: 'transparent', color: 'var(--flame-400)', fontSize: '13px', fontWeight: 600 }}
          >
            Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Name:</span> <strong>{data.legalName}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Mobile:</span> <strong>{data.mobileNumber}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{data.email}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> {data.residentialAddress}, {data.postcode}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>TfL Badge:</span> <strong>{data.tflDriverBadgeNum}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Badge Expiry:</span> {data.tflDriverBadgeExpiry}</div>
        </div>
      </div>

      {/* Section 2: Vehicle */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px' }}>2. Vehicle Information</h4>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            style={{ background: 'transparent', color: 'var(--flame-400)', fontSize: '13px', fontWeight: 600 }}
          >
            Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>VRM:</span> <strong>{data.vrm}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Vehicle:</span> {data.make} {data.model} ({data.colour})</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Category:</span> {data.vehicleCategory}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Seats:</span> {data.passengerSeats} Passenger Seats</div>
          <div><span style={{ color: 'var(--text-muted)' }}>TfL PHV Licence:</span> <strong>{data.tflPhvVehicleLicence}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>PHV Expiry:</span> {data.tflPhvVehicleExpiry}</div>
        </div>
      </div>

      {/* Section 3: Documents */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px' }}>3. Documents Uploaded</h4>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            style={{ background: 'transparent', color: 'var(--flame-400)', fontSize: '13px', fontWeight: 600 }}
          >
            Edit
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
          {REQUIRED_DOCUMENTS_CONFIG.filter((c) => data.documents[c.type]).map((c) => {
            const doc = data.documents[c.type]!;
            return (
              <div key={c.type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>✓ {c.title}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {doc.expiryDate ? `Expires: ${doc.expiryDate}` : doc.filename}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 4: Preferences & Agreement */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px' }}>4. Preferences & Agreement</h4>
          <button
            type="button"
            onClick={() => onEditStep(4)}
            style={{ background: 'transparent', color: 'var(--flame-400)', fontSize: '13px', fontWeight: 600 }}
          >
            Edit
          </button>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Preferred Airports:</span> {data.preferredAirports.join(', ') || 'None selected'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Operating Zones:</span> {data.operatingZones.join(', ') || 'None selected'}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>E-Signature:</span> <em>{data.signatureDataUrl || data.legalName}</em></div>
        </div>
      </div>

      {/* Accuracy Declaration Checkbox */}
      <div style={{ marginBottom: '28px' }}>
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
            checked={data.consentAccuracy}
            onChange={(e) => onChange({ consentAccuracy: e.target.checked })}
            style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--flame-500)' }}
          />
          <span>
            I hereby declare that all information, licence numbers, and documents submitted in this application are genuine, current, and legally accurate. I understand that submitting false or misleading documents will result in immediate disqualification and notification to Transport for London.
          </span>
        </label>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" onClick={onBack} className="btn-secondary">
          &larr; Back to Agreement
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary"
          style={{ padding: '16px 32px' }}
        >
          {submitting ? 'Submitting Application...' : 'Submit Application for Review ✓'}
        </button>
      </div>
    </div>
  );
}
