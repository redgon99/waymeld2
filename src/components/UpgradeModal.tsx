import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import type { PlanId } from '../lib/subscription';
import { isPlusOrTeam } from '../lib/subscription';
import { isPortOneConfigured } from '../lib/portone';
import { startPlusSubscription, cancelPlusSubscription } from '../lib/billing';

interface Props {
  open: boolean;
  onClose: () => void;
  plan: PlanId;
  userId?: string;
  /** 결제 성공/해지 성공 후 플랜 상태를 다시 불러오도록 호출자에게 알림 */
  onPlanChanged?: () => void;
}

type FlowState = 'idle' | 'processing' | 'error';

export function UpgradeModal({ open, onClose, plan, userId, onPlanChanged }: Props) {
  const { t } = useTranslation('billing');
  const [flow, setFlow] = useState<FlowState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!open) return null;

  const isPaid = isPlusOrTeam(plan);

  async function handleUpgrade() {
    if (!userId || !isPortOneConfigured()) {
      alert(t('checkout.notConfigured'));
      return;
    }
    setFlow('processing');
    setErrorMessage(null);
    const result = await startPlusSubscription(userId);
    if (!result.ok) {
      setFlow('error');
      setErrorMessage(result.message);
      return;
    }
    setFlow('idle');
    onPlanChanged?.();
    onClose();
  }

  async function handleCancel() {
    if (!confirm(t('cancel.confirm'))) return;
    setFlow('processing');
    setErrorMessage(null);
    const result = await cancelPlusSubscription();
    if (!result.ok) {
      setFlow('error');
      setErrorMessage(result.message);
      return;
    }
    setFlow('idle');
    onPlanChanged?.();
    onClose();
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card upgrade-modal"
        role="dialog"
        aria-labelledby="upgrade-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="close">
          <Icon name="close" />
        </button>
        <h2 id="upgrade-title">{t('upgrade.title')}</h2>
        <p className="upgrade-subtitle">{t('upgrade.subtitle')}</p>
        <p className="upgrade-current">{t('upgrade.currentPlan', { plan: t(`plan.${plan}`) })}</p>
        <ul className="upgrade-features">
          <li>{t('features.unlimitedTrips')}</li>
          <li>{t('features.cloudSync')}</li>
          <li>{t('features.exportI18n')}</li>
          <li>{t('features.realRoute')}</li>
        </ul>
        {flow === 'error' && errorMessage && (
          <p className="upgrade-error">{t('checkout.failed', { message: errorMessage })}</p>
        )}
        {isPaid ? (
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCancel}
            disabled={flow === 'processing'}
          >
            {flow === 'processing' ? t('cancel.processing') : t('cancel.button')}
          </button>
        ) : (
          <button
            type="button"
            className="btn-primary"
            onClick={handleUpgrade}
            disabled={flow === 'processing'}
          >
            {flow === 'processing' ? t('checkout.processing') : t('upgrade.cta')}
          </button>
        )}
      </div>
    </div>
  );
}
