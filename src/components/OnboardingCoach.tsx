import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { dismissOnboarding } from '../lib/onboarding';

interface Props {
  mobile?: boolean;
  onOpenSearch?: () => void;
  onOpenPins?: () => void;
  onOpenRoute?: () => void;
}

export function OnboardingCoach({
  mobile = false,
  onOpenSearch,
  onOpenPins,
  onOpenRoute,
}: Props) {
  const { t } = useTranslation('planner');
  const { t: tc } = useTranslation('common');
  const steps = [
    {
      title: t('onboarding.step1Title'),
      body: t('onboarding.step1Body'),
      icon: 'search' as const,
    },
    {
      title: t('onboarding.step2Title'),
      body: t('onboarding.step2Body'),
      icon: 'pin' as const,
    },
    {
      title: t('onboarding.step3Title'),
      body: t('onboarding.step3Body'),
      icon: 'route' as const,
    },
  ];
  const [step, setStep] = useState(0);
  const current = steps[step];
  const isLast = step >= steps.length - 1;

  function handleDismiss() {
    dismissOnboarding();
  }

  function handleNext() {
    if (isLast) {
      dismissOnboarding();
      return;
    }
    const next = step + 1;
    setStep(next);
    if (mobile) {
      if (next === 0) onOpenSearch?.();
      else if (next === 1) onOpenPins?.();
      else if (next === 2) onOpenRoute?.();
    }
  }

  function handleAction() {
    if (step === 0) onOpenSearch?.();
    else if (step === 1) onOpenPins?.();
    else if (step === 2) onOpenRoute?.();
    if (isLast) dismissOnboarding();
    else setStep((s) => s + 1);
  }

  return (
    <div
      className={`onboarding-coach ${mobile ? 'onboarding-coach-mobile' : ''}`}
      role="dialog"
      aria-label={current.title}
    >
      <div className="onboarding-coach-body">
        <Icon name={current.icon} size={20} />
        <div>
          <strong>{current.title}</strong>
          <p>{current.body}</p>
        </div>
      </div>
      <div className="onboarding-coach-actions">
        <button type="button" className="onboarding-dismiss" onClick={handleDismiss}>
          {t('onboarding.dontShow')}
        </button>
        {mobile && (
          <button type="button" className="onboarding-action" onClick={handleAction}>
            {tc('search')}
          </button>
        )}
        <button type="button" className="onboarding-next" onClick={handleNext}>
          {isLast ? tc('confirm') : tc('next')}
        </button>
      </div>
    </div>
  );
}
