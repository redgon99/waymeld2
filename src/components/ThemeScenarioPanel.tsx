import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from './Icon';
import { normalizeLocale } from '../lib/locale';
import type { PinnedPlace } from '../types';
import type { PinImportResult } from '../lib/importPins';
import {
  SCENARIO_THEMES,
  generateTourScenario,
  applyScenarioToTrip,
  type ScenarioTheme,
  type TourScenario,
} from '../lib/tourScenario';

const THEME_ICON: Record<ScenarioTheme, IconName> = {
  meditation: 'catCulture',
  wellbeing: 'sparkles',
  shopping: 'catShop',
  family: 'facilityGroup',
  honeymoon: 'star',
  night: 'photo',
  hallyu: 'trophy',
  camping: 'flag',
  walking: 'transportWalk',
  marine: 'navigate',
};

interface Props {
  currentDay: number;
  totalDays: number;
  pinnedByDay: Record<number, PinnedPlace[]>;
  onApply: (result: PinImportResult) => void;
}

export function ThemeScenarioPanel({ currentDay, totalDays, pinnedByDay, onApply }: Props) {
  const { t, i18n } = useTranslation('planner');
  const [theme, setTheme] = useState<ScenarioTheme | null>(null);
  const [days, setDays] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [scenario, setScenario] = useState<TourScenario | null>(null);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  const handleGenerate = async () => {
    if (!theme) return;
    setLoading(true);
    setError(false);
    setScenario(null);
    setAppliedCount(null);
    const result = await generateTourScenario(theme, days, normalizeLocale(i18n.language));
    setLoading(false);
    if (!result) {
      setError(true);
      return;
    }
    setScenario(result);
  };

  const handleApply = () => {
    if (!scenario) return;
    const result = applyScenarioToTrip(scenario, { currentDay, totalDays, existingByDay: pinnedByDay });
    onApply(result);
    setAppliedCount(result.importedCount);
  };

  const handleReset = () => {
    setScenario(null);
    setAppliedCount(null);
    setError(false);
  };

  return (
    <div className="theme-scenario-panel">
      {!scenario && (
        <>
          <p className="theme-scenario-subtitle">{t('scenario.subtitle')}</p>

          <div className="theme-scenario-field">
            <span className="theme-scenario-field-label">{t('scenario.themeLabel')}</span>
            <div className="theme-scenario-theme-grid" role="group">
              {SCENARIO_THEMES.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`theme-scenario-theme-card theme-scenario-theme-card--${id} ${theme === id ? 'active' : ''}`}
                  aria-pressed={theme === id}
                  title={t(`scenario.themeDesc.${id}`)}
                  onClick={() => setTheme(id)}
                >
                  <span className="theme-scenario-theme-icon">
                    <Icon name={THEME_ICON[id]} size={18} />
                  </span>
                  <span className="theme-scenario-theme-name">{t(`scenario.theme.${id}`)}</span>
                  <span className="theme-scenario-theme-check" aria-hidden>
                    <Icon name="check" size={12} />
                  </span>
                </button>
              ))}
            </div>
            {theme && (
              <p className="theme-scenario-theme-desc-active">{t(`scenario.themeDesc.${theme}`)}</p>
            )}
          </div>

          <div className="theme-scenario-field">
            <span className="theme-scenario-field-label">{t('scenario.daysLabel')}</span>
            <div className="theme-scenario-days-stepper" role="group">
              <button
                type="button"
                className="theme-scenario-step-btn"
                onClick={() => setDays((d) => Math.max(1, d - 1))}
                disabled={days <= 1}
                aria-label="-"
              >
                −
              </button>
              <span className="theme-scenario-days-value">{days}</span>
              <button
                type="button"
                className="theme-scenario-step-btn"
                onClick={() => setDays((d) => Math.min(5, d + 1))}
                disabled={days >= 5}
                aria-label="+"
              >
                +
              </button>
            </div>
          </div>

          {error && <p className="theme-scenario-error">{t('scenario.error')}</p>}

          <button
            type="button"
            className="theme-scenario-generate-btn"
            disabled={!theme || loading}
            onClick={() => void handleGenerate()}
          >
            <Icon name="sparkles" size={16} spin={loading} />
            {loading ? t('scenario.generating') : t('scenario.generate')}
          </button>
        </>
      )}

      {scenario && (
        <div className="theme-scenario-result">
          <div className="theme-scenario-region-badge">
            {t('scenario.regionBadge', { region: scenario.regionLabel || scenario.region })}
          </div>
          <h3 className="theme-scenario-result-title">{scenario.title}</h3>
          <p className="theme-scenario-result-intro">{scenario.intro}</p>

          {scenario.days.map((day) => (
            <div key={day.day} className="theme-scenario-day-block">
              <h4 className="theme-scenario-day-title">
                {t('scenario.dayTitle', { day: day.day })}
                {day.dayTitle ? ` · ${day.dayTitle}` : ''}
              </h4>
              <div className="theme-scenario-stop-list">
                {day.stops.map((stop) => (
                  <div key={stop.placeId} className="theme-scenario-stop-card">
                    {stop.thumbnailUrl && (
                      <img
                        src={stop.thumbnailUrl}
                        alt=""
                        className="theme-scenario-stop-thumb"
                        loading="lazy"
                      />
                    )}
                    <div className="theme-scenario-stop-info">
                      <div className="theme-scenario-stop-name">{stop.title}</div>
                      {stop.titleKo && stop.titleKo !== stop.title && (
                        <div className="theme-scenario-stop-name-ko">{stop.titleKo}</div>
                      )}
                      <div className="theme-scenario-stop-note">{stop.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {appliedCount === null ? (
            <div className="theme-scenario-result-actions">
              <button type="button" className="theme-scenario-apply-btn" onClick={handleApply}>
                {t('scenario.apply')}
              </button>
              <button type="button" className="theme-scenario-reset-btn" onClick={handleReset}>
                {t('scenario.newSearch')}
              </button>
            </div>
          ) : (
            <div className="theme-scenario-applied-block">
              <p className="theme-scenario-applied-msg">
                {t('scenario.applied', { count: appliedCount })}
              </p>
              <button type="button" className="theme-scenario-reset-btn" onClick={handleReset}>
                {t('scenario.newSearch')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
