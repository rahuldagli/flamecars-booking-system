'use client';

import { useState, useEffect } from 'react';
import { DriverApplication, INITIAL_APPLICATION } from '@/types/onboarding';
import { loadLocalDraft, saveLocalDraft, clearLocalDraft } from '@/lib/storage';
import StepProgressBar from '@/components/StepProgressBar';
import ResumeModal from '@/components/ResumeModal';
import Step0Landing from '@/components/steps/Step0Landing';
import Step1Identity from '@/components/steps/Step1Identity';
import Step2Vehicle from '@/components/steps/Step2Vehicle';
import Step3Documents from '@/components/steps/Step3Documents';
import Step4BankDetails from '@/components/steps/Step4BankDetails';
import Step4Agreement from '@/components/steps/Step4Agreement';
import Step5Review from '@/components/steps/Step5Review';

export default function OnboardingPage() {
  const [app, setApp] = useState<DriverApplication>(INITIAL_APPLICATION);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [loadError, setLoadError] = useState<string>('');
  const [isLoadingRef, setIsLoadingRef] = useState(false);

  // Hydrate from URL query or localStorage on client mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isHome = params.get('home') === '1';
    const refParam = params.get('ref') || params.get('reference') || params.get('id');

    // If driver clicked a preview/modify link from email: ?ref=FLM-DRV-...
    if (refParam) {
      setIsLoadingRef(true);

      const tryFallback = () => {
        const cleanRef = refParam.trim().toLowerCase();
        try {
          const submittedRaw = localStorage.getItem('flamecars_submitted_applications');
          if (submittedRaw) {
            const list = JSON.parse(submittedRaw);
            const found = list.find((a: any) =>
              (a.referenceNumber || '').toLowerCase() === cleanRef ||
              (a.mobileNumber || '').replace(/\s+/g, '') === cleanRef
            );
            if (found) {
              setApp({ ...found, currentStep: 6 });
              saveLocalDraft(found);
              setSaveStatus('Application loaded from local cache');
              fetch('/api/onboarding/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(found),
              }).catch(() => {});
              return true;
            }
          }
        } catch {}

        const draft = loadLocalDraft();
        if (
          draft &&
          ((draft.referenceNumber || '').toLowerCase() === cleanRef ||
            (draft.mobileNumber || '').replace(/\s+/g, '') === cleanRef)
        ) {
          setApp({ ...draft, currentStep: 6 });
          setSaveStatus('Application loaded from local draft');
          fetch('/api/onboarding/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(draft),
          }).catch(() => {});
          return true;
        }
        return false;
      };

      fetch(`/api/onboarding/draft?identifier=${encodeURIComponent(refParam.trim())}`)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error('Application not found');
          }
          return res.json();
        })
        .then((data) => {
          if (data && data.application) {
            setApp({ ...data.application, currentStep: 6 });
            saveLocalDraft(data.application);
            setSaveStatus('Application loaded from link');
          } else {
            const recovered = tryFallback();
            if (!recovered) {
              setLoadError(`Application "${refParam}" not found. You can resume with your mobile number.`);
            }
          }
        })
        .catch((err) => {
          console.warn('Server lookup failed, checking local cache:', err);
          const recovered = tryFallback();
          if (!recovered) {
            setLoadError(`Could not find application "${refParam}". Please check your link or resume with your mobile number.`);
          }
        })
        .finally(() => {
          setIsLoadingRef(false);
          setIsHydrated(true);
        });
      return;
    }

    const saved = loadLocalDraft();

    if (isHome) {
      if (saved) {
        setApp({ ...saved, currentStep: 0 });
      } else {
        setApp({ ...INITIAL_APPLICATION, currentStep: 0 });
      }
      window.history.replaceState({}, '', '/');
    } else if (saved && saved.legalName) {
      setApp(saved);
    }
    setIsHydrated(true);
  }, []);

  const draftTimerRef = useState<{ timer: NodeJS.Timeout | null }>({ timer: null })[0];

  // Autosave draft on change with debounced server sync
  function updateApp(updates: Partial<DriverApplication>) {
    setApp((prev) => {
      const next = { ...prev, ...updates, updatedAt: new Date().toISOString() };
      saveLocalDraft(next);

      // Async background server sync (debounced 800ms) if mobile number exists
      if (next.mobileNumber) {
        setSaveStatus('Saving draft...');
        if (draftTimerRef.timer) {
          clearTimeout(draftTimerRef.timer);
        }
        draftTimerRef.timer = setTimeout(() => {
          fetch('/api/onboarding/draft', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(next),
          })
            .then(() => setSaveStatus('Draft saved'))
            .catch(() => setSaveStatus(''));
        }, 800);
      }
      return next;
    });
  }

  // Discard saved draft and start completely fresh application
  function handleStartNew() {
    clearLocalDraft();
    const freshApp: DriverApplication = {
      ...INITIAL_APPLICATION,
      id: 'app_' + Math.random().toString(36).substring(2, 11),
      currentStep: 1,
      updatedAt: new Date().toISOString(),
    };
    setApp(freshApp);
    saveLocalDraft(freshApp);
  }

  function handleResume(resumedApp: DriverApplication) {
    setApp(resumedApp);
    saveLocalDraft(resumedApp);
  }

  if (isLoadingRef || !isHydrated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '60vh', gap: '14px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #fed7aa', borderTopColor: '#ea580c', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ color: 'var(--flame-600)', fontSize: '15px', fontWeight: 600 }}>Loading Flame Cars Application...</div>
      </div>
    );
  }

  const hasDraft = !!(app.legalName || app.mobileNumber);

  return (
    <div className="container" style={{ paddingTop: '24px', maxWidth: '820px' }}>
      {/* Alert if link could not be loaded */}
      {loadError && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <span>{loadError}</span>
          <button
            onClick={() => setIsResumeModalOpen(true)}
            className="btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
          >
            Resume Manually
          </button>
        </div>
      )}

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
            <strong style={{ color: 'var(--flame-600)' }}>
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
          onStart={hasDraft ? handleStartNew : () => updateApp({ currentStep: 1 })}
          onStartFresh={handleStartNew}
          onResumeClick={() => setIsResumeModalOpen(true)}
          hasDraft={hasDraft}
          draftName={app.legalName}
          onResumeDraft={() => updateApp({ currentStep: 1 })}
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
        <Step4BankDetails
          data={app}
          onChange={updateApp}
          onNext={() => updateApp({ currentStep: 5 })}
          onBack={() => updateApp({ currentStep: 3 })}
        />
      )}

      {app.currentStep === 5 && (
        <Step4Agreement
          data={app}
          onChange={updateApp}
          onNext={() => updateApp({ currentStep: 6 })}
          onBack={() => updateApp({ currentStep: 4 })}
        />
      )}

      {app.currentStep === 6 && (
        <Step5Review
          data={app}
          onChange={updateApp}
          onEditStep={(step) => updateApp({ currentStep: step })}
          onSubmitSuccess={(ref) => updateApp({ referenceNumber: ref, status: 'UNDER_REVIEW' })}
          onBack={() => updateApp({ currentStep: 5 })}
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
