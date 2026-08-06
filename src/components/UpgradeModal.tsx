import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import type { PlanId } from '../lib/subscription';
import { getPlusCheckoutUrl, getStripePortalUrl, isPlusOrTeam } from '../lib/subscription';

interface Props {
  open: boolean;
  onClose: () => void;
  plan: PlanId;
}

export function UpgradeModal({ open, onClose, plan }: Props) {
  const { t } = useTranslation('billing');

  if (!open) return null;

  const checkoutUrl = getPlusCheckoutUrl();
  const portalUrl = getStripePortalUrl();
  const isPaid = isPlusOrTeam(plan);

  function handleUpgrade() {
    if (checkoutUrl) {
      window.location.assign(checkoutUrl);
      return;
    }
    alert(t('checkout.notConfigured'));
  }

  function handleManage() {
    if (portalUrl) {
      window.location.assign(portalUrl);
      return;
    }
    alert(t('checkout.notConfigured'));
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
        {isPaid ? (
          <button type="button" className="btn-primary" onClick={handleManage}>
            {t('upgrade.manage')}
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={handleUpgrade}>
            {t('upgrade.cta')}
          </button>
        )}
      </div>
    </div>
  );
}
