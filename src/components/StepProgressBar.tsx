'use client';

interface StepProgressBarProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { step: 1, title: 'Identity' },
  { step: 2, title: 'Vehicle' },
  { step: 3, title: 'Documents' },
  { step: 4, title: 'Bank Details' },
  { step: 5, title: 'Agreement' },
  { step: 6, title: 'Review' },
];

export default function StepProgressBar({ currentStep, onStepClick }: StepProgressBarProps) {
  if (currentStep === 0) return null; // Don't show bar on landing

  return (
    <div style={{ marginBottom: '28px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          padding: '0 8px',
        }}
      >
        {/* Background Connecting Line */}
        <div
          style={{
            position: 'absolute',
            top: '18px',
            left: '24px',
            right: '24px',
            height: '3px',
            background: 'var(--border-medium)',
            zIndex: 1,
          }}
        />

        {/* Active Connecting Line */}
        <div
          style={{
            position: 'absolute',
            top: '18px',
            left: '24px',
            width: `${Math.min(100, Math.max(0, ((currentStep - 1) / (STEPS.length - 1)) * 100))}%`,
            height: '3px',
            background: 'var(--flame-gradient)',
            boxShadow: 'var(--flame-glow)',
            zIndex: 1,
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {STEPS.map(({ step, title }) => {
          const isDone = currentStep > step;
          const isCurrent = currentStep === step;

          return (
            <div
              key={step}
              onClick={() => {
                if (onStepClick) onStepClick(step);
              }}
              title={`Go to step ${step}: ${title}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 2,
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  background: isDone
                    ? 'var(--success)'
                    : isCurrent
                    ? 'var(--flame-gradient)'
                    : '#ffffff',
                  color: isDone || isCurrent ? '#ffffff' : 'var(--text-muted)',
                  border: isCurrent
                    ? '2px solid var(--flame-500)'
                    : isDone
                    ? '2px solid var(--success)'
                    : '2px solid var(--border-medium)',
                  boxShadow: isCurrent ? '0 2px 8px rgba(234, 88, 12, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.25s ease',
                }}
              >
                {isDone ? '✓' : step}
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? 'var(--flame-600)' : isDone ? 'var(--text-primary)' : 'var(--text-muted)',
                  marginTop: '6px',
                  textAlign: 'center',
                }}
              >
                {title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
