import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import type { Place } from '../types';
import { formatTaxiPhrase } from '../lib/itineraryExport';

interface Props {
  open: boolean;
  place: Place | null;
  onClose: () => void;
}

export function TaxiDriverCardModal({ open, place, onClose }: Props) {
  const { t } = useTranslation('planner');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !place) return null;

  const koName = place.nameKo ?? place.name;
  const addr = place.roadAddress || place.address;
  const taxiPhrase = formatTaxiPhrase({
    ...place,
    pinnedAt: 0,
    order: 0,
    day: 1,
  });

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="taxi-card-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('taxi.title')}
      onClick={onClose}
    >
      <div className="taxi-card-panel" onClick={(e) => e.stopPropagation()}>
        <header className="taxi-card-header">
          <span>{t('taxi.title')}</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t('taxi.close')}>
            <Icon name="close" />
          </button>
        </header>
        <div className="taxi-card-body">
          <p className="taxi-card-label">{t('taxi.koreanName')}</p>
          <p className="taxi-card-value">{koName}</p>
          <button type="button" className="taxi-card-copy" onClick={() => void copy(koName)}>
            <Icon name="note" /> {t('taxi.copyName')}
          </button>

          {place.romanizedName && (
            <>
              <p className="taxi-card-label">{t('taxi.romanized')}</p>
              <p className="taxi-card-value taxi-card-value-sub">{place.romanizedName}</p>
            </>
          )}

          {addr && (
            <>
              <p className="taxi-card-label">{t('taxi.address')}</p>
              <p className="taxi-card-value">{addr}</p>
              <button type="button" className="taxi-card-copy" onClick={() => void copy(addr)}>
                <Icon name="note" /> {t('taxi.copyAddress')}
              </button>
            </>
          )}

          <p className="taxi-card-label">{t('taxi.sayThis')}</p>
          <p className="taxi-card-phrase">{taxiPhrase}</p>
          <button type="button" className="taxi-card-copy primary" onClick={() => void copy(taxiPhrase)}>
            <Icon name="note" /> {t('taxi.copyPhrase')}
          </button>
        </div>
      </div>
    </div>
  );
}
