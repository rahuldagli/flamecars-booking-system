'use client';

import { useState, useEffect } from 'react';
import { DriverApplication, INITIAL_APPLICATION } from '@/types/onboarding';
import { loadLocalDraft, saveLocalDraft } from '@/lib/storage';
import StepProgressBar from '@/components/StepProgressBar';
import ResumeModal from '@/components/ResumeModal';
import Step0Landing from '@/components/steps/Step0Landing';
import Step1Identity from '@/components/steps/Step1Identity';
import Step2Vehicle from '@/components/steps/Step2Vehicle';
import Step3Documents from '@/components/steps/Step3Documents';
import Step4Agreement from '@/components/steps/Step4Agreement';
import Step5Review from '@/components/steps/Step5Review';

export default function OnboardingPage() {
  const [app, setApp] = useState<DriverApplication>(INITIAL_APPLICATION);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Hydrate from localStorage on client mount
  useEffect(() => {
    const saved = loadLocalDraft();
    if (saved && saved.legalName) {
      setApp(saved);
    }
    setIsHydrated(true);
  }, []);

  // Autosave draft on change
  function updateApp(updates: Partial<DriverApplication>) {
    setApp((prev) => {
      const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      saveLocalDraft(next);

      // Async background server sync if mobile number exists
      if (next.mobileNumber) {
        setSaveStatus('Saving draft...');
        fetch('/api/onboarding/draft', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        })
          .then(() => setSaveStatus('Draft saved'))
          .catch(() => setSaveStatus(''));
      }
      return next;
    });
  }

  function handleResume(resumedApp: DriverApplication) {
    setApp(resumedApp);
    saveLocalDraft(resumedApp);
  }

  if (!isHydrated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ color: 'var(--flame-400)', fontSize: '16px' }}>Loading Flame Cars Onboarding...</div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '24px', maxWidth: '820px' }}>
      {/* Top Status Bar (Step > 0) */}
      {app.currentStep > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            fontSize: '12px',
            color: 'var(--text-muted)',
          }}
        >
          <div>
            Application Reference:{' '}
            <strong style={{ color: 'var(--flame-400)' }}>
              {app.referenceNumber || 'DRAFT (Auto-assigned on submit)'}
            </strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{saveStatus || 'Draft saved'}</span>
            <button
              onClick={() => setIsResumeModalOpen(true)}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                textDecoration: 'underline',
                fontSize: '12px',
              }}
            >
              Resume Another Draft
            </button>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <StepProgressBar
        currentStep={app.currentStep}
        onStepClick={(step) => updateApp({ currentStep: step })}
      />

      {/* Step Router */}
      {app.currentStep === 0 && (
        <Step0Landing
          onStart={() => updateApp({ currentStep: 1 })}
          onResumeClick={() => setIsResumeModalOpen(true)}
        />
      )}

      {app.currentStep === 1 && (
        <Step1Identity
          data={app}
          onChange={updateApp}
          onNext={() => updateApp({ currentStep: 2 })}
          onBack={() => updateApp({ currentStep: 0 })}
        />
      )}

      {app.currentStep === 2 && (
        <Step2Vehicle
          data={app}
          onChange={updateApp}
          onNext={() => updateApp({ currentStep: 3 })}
          onBack={() => updateApp({ currentStep: 1 })}
        />
      )}

      {app.currentStep === 3 && (
        <Step3Documents
          data={app}
          onChange={updateApp}
          onNext={() => updateApp({ currentStep: 4 })}
          onBack={() => updateApp({ currentStep: 2 })}
        />
      )}

      {app.currentStep === 4 && (
        <Step4Agreement
          data={app}
          onChange={updateApp}
          onNext={() => updateApp({ currentStep: 5 })}
          onBack={() => updateApp({ currentStep: 3 })}
        />
      )}

      {app.currentStep === 5 && (
        <Step5Review
          data={app}
          onChange={updateApp}
          onEditStep={(step) => updateApp({ currentStep: step })}
          onSubmitSuccess={(ref) => updateApp({ referenceNumber: ref, status: 'SUBMITTED' })}
          onBack={() => updateApp({ currentStep: 4 })}
        />
      )}

      {/* Resume Application Modal */}
      <ResumeModal
        isOpen={isResumeModalOpen}
        onClose={() => setIsResumeModalOpen(false)}
        onResume={handleResume}
      />
    </div>
  );
}
