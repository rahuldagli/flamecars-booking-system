'use client';

interface Step0LandingProps {
  onStart: () => void;
  onResumeClick: () => void;
}

export default function Step0Landing({ onStart, onResumeClick }: Step0LandingProps) {
  return (
    <div className="animate-fade-in" style={{ padding: '10px 0' }}>
      {/* Hero Badge */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div
          className="badge badge-submitted"
          style={{ marginBottom: '16px', padding: '6px 14px', fontSize: '13px' }}
        >
          <span>🇬🇧</span> TfL-Licensed Private Hire Driver Onboarding
        </div>
        <h1
          style={{
            fontSize: '36px',
            lineHeight: 1.15,
            marginBottom: '14px',
          }}
        >
          Drive with <span className="flame-gradient-text">Flame Cars</span>
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: '16px',
            maxWidth: '560px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}
        >
          Join London’s premier private hire operator for airport transfers and executive travel. Fast online registration with dispatch activation upon compliance sign-off.
        </p>
      </div>

      {/* Main Feature Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '14px',
          marginBottom: '28px',
        }}
      >
        <div
          className="glass-panel"
          style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}
        >
          <div style={{ fontSize: '26px', marginBottom: '10px' }}>⚡</div>
          <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>5–8 Min Target</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Quick, frictionless digital onboarding built for your smartphone. No lengthy paper forms.
          </p>
        </div>

        <div
          className="glass-panel"
          style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}
        >
          <div style={{ fontSize: '26px', marginBottom: '10px' }}>💾</div>
          <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>Auto-Save & Resume</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Your draft is securely saved after every step. Interrupt anytime and resume with your mobile number or reference.
          </p>
        </div>

        <div
          className="glass-panel"
          style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}
        >
          <div style={{ fontSize: '26px', marginBottom: '10px' }}>🛡️</div>
          <h3 style={{ fontSize: '17px', marginBottom: '6px' }}>TfL Compliant</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Encrypted document storage adhering strictly to UK GDPR and Transport for London standards.
          </p>
        </div>
      </div>

      {/* Preparation Checklist */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          marginBottom: '32px',
          borderLeft: '4px solid var(--flame-500)',
        }}
      >
        <h3 style={{ fontSize: '18px', marginBottom: '12px' }}>
          📋 What You’ll Need to Have Ready
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
          Please ensure you have clear photos or digital copies of the following documents:
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '10px',
            fontSize: '13px',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--success)' }}>✓</span> Valid TfL PHV Driver Badge
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--success)' }}>✓</span> DVLA Driving Licence (Front & Back)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--success)' }}>✓</span> TfL PHV Vehicle Licence Disc
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--success)' }}>✓</span> Hire & Reward Insurance Certificate
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--success)' }}>✓</span> MOT Certificate (vehicles 1yr+)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--success)' }}>✓</span> V5C Logbook / Keeper Evidence
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
        <button
          onClick={onStart}
          className="btn-primary"
          style={{ width: '100%', maxWidth: '380px', padding: '16px' }}
        >
          Start Driver Registration &rarr;
        </button>

        <button
          onClick={onResumeClick}
          className="btn-secondary"
          style={{ width: '100%', maxWidth: '380px' }}
        >
          Resume Existing Application
        </button>
      </div>

      <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
        Questions or need assistance? Call our onboarding team on <a href="tel:02034008257">020 3400 8257</a>
      </div>
    </div>
  );
}
