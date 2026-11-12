'use client';

import { useState } from 'react';
import { DriverApplication, REQUIRED_DOCUMENTS_CONFIG } from '@/types/onboarding';
import { detectNameDiscrepancies } from '@/lib/nameCheck';

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
  const discrepancies = detectNameDiscrepancies(data);

  async function handleSubmit() {
    if (discrepancies.length > 0 && !data.nameMismatchConfirmed) {
      setError('Document Name Discrepancy: You have attached documentation with different name details. Please select an explanation and check the confirmation box below before submitting.');
      return;
    }
    if (!data.consentAccuracy) {
      setError('Please certify that all information and documents supplied are true and accurate.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      // Strip heavy base64 strings before submitting (files are stored separately via /api/onboarding/document-file)
      const shallowDocs: Record<string, any> = {};
      if (data.documents) {
        for (const [k, d] of Object.entries(data.documents)) {
          shallowDocs[k] = d ? { ...d, dataUrl: d.dataUrl && d.dataUrl.length > 500 ? '[stored-on-server]' : d.dataUrl } : null;
        }
      }
      const lightweightPayload = { ...data, documents: shallowDocs };

      const res = await fetch('/api/onboarding/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lightweightPayload),
      });

      const resData = await res.json();
      if (res.ok) {
        setSubmittedRef(resData.referenceNumber);

        const returnedApp: DriverApplication = resData.application || {
          ...data,
          referenceNumber: resData.referenceNumber,
          status: 'UNDER_REVIEW',
          tbmsDriverId: resData.tbmsDriverId || data.tbmsDriverId,
          tbmsSyncStatus: resData.tbmsSyncStatus || 'NOT_SYNCED',
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Persist submitted application into localStorage for instant resilience
        try {
          const raw = localStorage.getItem('flamecars_submitted_applications');
          const list = raw ? JSON.parse(raw) : [];
          const updated = [
            returnedApp,
            ...list.filter((a: any) => a.referenceNumber !== returnedApp.referenceNumber && a.id !== returnedApp.id),
          ];
          localStorage.setItem('flamecars_submitted_applications', JSON.stringify(updated));
          localStorage.setItem('flamecars_driver_draft_v1', JSON.stringify(returnedApp));
        } catch {}

        onChange(returnedApp);
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

        <div
          style={{
            display: 'inline-block',
            padding: '5px 14px',
            borderRadius: '16px',
            background: '#fef3c7',
            color: '#b45309',
            border: '1px solid #fde68a',
            fontSize: '12px',
            fontWeight: 700,
            marginBottom: '14px',
          }}
        >
          STATUS: INACTIVE (Under Compliance Review)
        </div>

        <h2 style={{ fontSize: '28px', marginBottom: '10px' }}>
          Registration Submitted!
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '520px', margin: '0 auto 24px auto', lineHeight: 1.6 }}>
          Thank you, <strong>{data.legalName}</strong>. Your driver onboarding file has been queued for compliance review. By default, your account remains inactive until our compliance staff verifies your documentation and activates your profile for TBMS dispatch. A confirmation email has been dispatched with your preview and modify link.
        </p>

        {/* Reference Code Card */}
        <div
          style={{
            maxWidth: '360px',
            margin: '0 auto 28px auto',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            background: '#ffffff',
            border: '2px solid var(--flame-500)',
            boxShadow: '0 2px 10px rgba(234, 88, 12, 0.15)',
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
              color: 'var(--flame-600)',
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
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-medium)',
            fontSize: '13px',
            lineHeight: 1.6,
          }}
        >
          <h4 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--text-primary)' }}>What Happens Next:</h4>
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

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setSubmittedRef(null)}
            className="btn-secondary"
            style={{ padding: '10px 18px', fontSize: '13px' }}
          >
            ← Review &amp; Modify Details
          </button>
          <a href="/admin" className="btn-secondary" style={{ textDecoration: 'none' }}>
            View in Staff Portal →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '28px' }}>
      {/* Submitted Status & Preview Banner */}
      {data.referenceNumber && (
        <div
          style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: data.status === 'ACTIVE' ? 'var(--success-bg)' : '#fff7ed',
            border: data.status === 'ACTIVE' ? '1px solid var(--success)' : '1px solid #fdba74',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Application Status:
              </span>
              <span className={`badge ${data.status === 'ACTIVE' ? 'badge-active' : 'badge-submitted'}`}>
                {data.status || 'SUBMITTED'}
              </span>
              {data.tbmsDriverId && (
                <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  TBMS ID: #{data.tbmsDriverId}
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#7c2d12' }}>
              Ref: <strong style={{ fontFamily: 'monospace' }}>{data.referenceNumber}</strong>
              {data.submittedAt && <span> &bull; Submitted: {new Date(data.submittedAt).toLocaleDateString()}</span>}
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#9a3412', background: '#ffffff', padding: '6px 12px', borderRadius: '6px', border: '1px solid #fed7aa' }}>
            ✏️ Preview mode: Click <strong>Edit</strong> on any section below to update your information.
          </div>
        </div>
      )}

      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '22px', marginBottom: '6px' }}>
          {data.referenceNumber ? '6. Preview & Modify Application' : '6. Review & Submit Application'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {data.referenceNumber
            ? 'Review your submitted application details below. Click Edit on any section to make updates, then submit to save.'
            : 'Please verify your details before submitting your onboarding application for compliance review.'}
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

      {/* Section 1: Identity */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: '#ffffff',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px' }}>1. Identity & Contact</h4>
          <button
            type="button"
            onClick={() => onEditStep(1)}
            style={{ background: 'transparent', color: 'var(--flame-600)', fontSize: '13px', fontWeight: 600 }}
          >
            Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>Name:</span> <strong>{data.legalName}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Mobile:</span> <strong>{data.mobileNumber}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{data.email}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> {data.residentialAddress}, {data.postcode}</div>
          <div><span style={{ color: 'var(--text-muted)' }}>NI Number:</span> <strong>{data.nationalInsuranceNumber || 'N/A'}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>TfL Badge:</span> <strong>{data.tflDriverBadgeNum}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Badge Expiry:</span> {data.tflDriverBadgeExpiry}</div>
        </div>
      </div>

      {/* Section 2: Vehicle */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: '#ffffff',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px' }}>2. Vehicle Information</h4>
          <button
            type="button"
            onClick={() => onEditStep(2)}
            style={{ background: 'transparent', color: 'var(--flame-600)', fontSize: '13px', fontWeight: 600 }}
          >
            Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>VRM:</span> <strong>{data.vrm}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Vehicle:</span> {data.make} {data.model} ({data.colour})</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Category:</span> <strong>{data.vehicleCategory}</strong></div>
          <div><span style={{ color: 'var(--text-muted)' }}>Capacity:</span> {data.passengerSeats} Passenger Seats</div>
          <div><span style={{ color: 'var(--text-muted)' }}>Licence Expiry:</span> {data.tflPhvVehicleExpiry || 'Uploaded in docs'}</div>
        </div>
      </div>

      {/* Section 3: Documents */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: '#ffffff',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px' }}>3. Documents Uploaded</h4>
          <button
            type="button"
            onClick={() => onEditStep(3)}
            style={{ background: 'transparent', color: 'var(--flame-600)', fontSize: '13px', fontWeight: 600 }}
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

      {/* Section 4: Bank Details */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: '#ffffff',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          marginBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px' }}>4. Bank Details</h4>
          <button
            type="button"
            onClick={() => onEditStep(4)}
            style={{ background: 'transparent', color: 'var(--flame-600)', fontSize: '13px', fontWeight: 600 }}
          >
            Edit
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', fontSize: '13px' }}>
          <div><span style={{ color: 'var(--text-muted)' }}>A/C Name:</span> <strong>{data.bankAccountName || 'Not entered'}</strong></div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>A/C Number:</span>{' '}
            <strong style={{ fontFamily: 'monospace' }}>
              {data.bankAccountNumber ? `•••• ${data.bankAccountNumber.slice(-4)}` : '••••••••'}
            </strong>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Sort Code:</span>{' '}
            <strong style={{ fontFamily: 'monospace' }}>{data.bankSortCode || '••-••-••'}</strong>
          </div>
        </div>
      </div>

      {/* Section 5: Preferences & Agreement */}
      <div
        style={{
          padding: '16px',
          borderRadius: 'var(--radius-sm)',
          background: '#ffffff',
          border: '1px solid var(--border-medium)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h4 style={{ fontSize: '15px' }}>5. Preferences & Agreement</h4>
          <button
            type="button"
            onClick={() => onEditStep(5)}
            style={{ background: 'transparent', color: 'var(--flame-600)', fontSize: '13px', fontWeight: 600 }}
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

      {/* Name Discrepancy Warning & Mandatory Confirmation */}
      {discrepancies.length > 0 && (
        <div
          style={{
            marginBottom: '24px',
            padding: '20px',
            borderRadius: 'var(--radius-md)',
            background: '#fff7ed',
            border: '2px solid #ea580c',
            boxShadow: '0 2px 10px rgba(234, 88, 12, 0.12)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#c2410c', margin: 0 }}>
                Action Required: Different Person&apos;s Documentation Detected
              </h4>
              <div style={{ fontSize: '12px', color: '#9a3412', marginTop: '2px' }}>
                One or more documents you attached show a different name from your registered applicant name (<strong>{data.legalName}</strong>).
              </div>
            </div>
          </div>

          {/* Table of Discrepancies */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #fed7aa',
              padding: '12px 16px',
              marginBottom: '16px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#9a3412', textTransform: 'uppercase', marginBottom: '8px' }}>
              Detected Document Name Discrepancies:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {discrepancies.map((d) => (
                <div
                  key={d.docType}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '13px',
                    padding: '6px 0',
                    borderBottom: '1px solid #ffedd5',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{d.docTitle}:</span>{' '}
                    <span style={{ color: '#c2410c', fontWeight: 700 }}>&ldquo;{d.extractedName}&rdquo;</span>{' '}
                    <span style={{ fontSize: '11px', color: '#6b7280' }}>({d.fieldLabel})</span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Registered Applicant: <strong>{data.legalName}</strong>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reason Selection */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#9a3412', marginBottom: '6px' }}>
              Select the reason for this name discrepancy (required for TfL compliance audit):
            </label>
            <select
              value={data.nameMismatchReason || ''}
              onChange={(e) => onChange({ nameMismatchReason: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13px',
                borderRadius: '6px',
                border: '1px solid #fdba74',
                background: '#ffffff',
                color: '#111827',
              }}
            >
              <option value="">-- Select reason for name difference --</option>
              <option value="Vehicle / insurance is owned or leased by a third party or company (Authorized Driver)">
                Vehicle / insurance is owned or leased by a third party or company (Authorized Driver)
              </option>
              <option value="Vehicle or policy belongs to a family member / spouse (Named Driver)">
                Vehicle or policy belongs to a family member / spouse (Named Driver)
              </option>
              <option value="Legal name change or marriage (Supporting evidence provided)">
                Legal name change or marriage (Supporting evidence provided)
              </option>
              <option value="Typographical / middle name difference on official record">
                Typographical / middle name difference on official record
              </option>
              <option value="Other legitimate regulatory compliance arrangement">
                Other legitimate regulatory compliance arrangement
              </option>
            </select>
          </div>

          {/* Mandatory Confirmation Checkbox */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#7c2d12',
              }}
            >
              <input
                type="checkbox"
                checked={!!data.nameMismatchConfirmed}
                onChange={(e) => onChange({ nameMismatchConfirmed: e.target.checked })}
                style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: '#ea580c' }}
              />
              <span>
                <strong>I confirm that I have reviewed the name differences above.</strong> I certify that I am legally authorized to operate under these documents, and I understand that Transport for London and Flame Cars compliance will inspect these records before activation.
              </span>
            </label>
          </div>
        </div>
      )}

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
          ← Back to Agreement
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-primary"
          style={{ padding: '16px 32px' }}
        >
          {submitting
            ? 'Saving & Updating...'
            : data.referenceNumber
            ? 'Save & Resubmit Updates ✓'
            : 'Submit Application for Review ✓'}
        </button>
      </div>
    </div>
  );
}
