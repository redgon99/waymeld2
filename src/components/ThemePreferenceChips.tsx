import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import type { TripTheme } from '../types';
import { TRIP_THEMES } from '../lib/themes';

interface Props {
  selected: TripTheme[];
  onChange: (next: TripTheme[]) => void;
  compact?: boolean;
}

export function ThemePreferenceChips({ selected, onChange, compact = false }: Props) {
  const { t } = useTranslation('planner');

  const toggle = (id: TripTheme) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className={`theme-chips ${compact ? 'theme-chips-compact' : ''}`}>
      {!compact && <span className="theme-chips-label">{t('themes.label')}</span>}
      <div className="theme-chips-row" role="group" aria-label={t('themes.label')}>
        {TRIP_THEMES.map((theme) => {
          const active = selected.includes(theme.id);
          return (
            <button
              key={theme.id}
              type="button"
              className={`theme-chip ${active ? 'active' : ''}`}
              aria-pressed={active}
              onClick={() => toggle(theme.id)}
            >
              <Icon name={theme.icon} size={14} />
              {t(theme.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
