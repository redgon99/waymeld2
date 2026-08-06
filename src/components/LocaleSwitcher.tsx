import { useTranslation } from 'react-i18next';
import { setAppLocale } from '../lib/i18n';
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  normalizeLocale,
  type AppLocale,
} from '../lib/locale';

interface Props {
  compact?: boolean;
  className?: string;
}

export function LocaleSwitcher({ compact = false, className = '' }: Props) {
  const { t, i18n } = useTranslation('common');
  const current = normalizeLocale(i18n.language);

  return (
    <label className={`locale-switcher ${compact ? 'compact' : ''} ${className}`.trim()}>
      {!compact && <span className="locale-switcher-label">{t('locale')}</span>}
      <select
        className="locale-select"
        value={current}
        onChange={(e) => setAppLocale(e.target.value as AppLocale)}
        aria-label={t('localeLabel')}
      >
        {SUPPORTED_LOCALES.map((loc) => (
          <option key={loc} value={loc}>
            {LOCALE_LABELS[loc]}
          </option>
        ))}
      </select>
    </label>
  );
}
