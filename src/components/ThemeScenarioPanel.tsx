import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from './Icon';
import { normalizeLocale } from '../lib/locale';
import { CATEGORY_MAP } from '../lib/categories';
import type { Place, PinnedPlace } from '../types';
import type { PinImportResult } from '../lib/importPins';
import { listPublishedScenarios } from '../lib/scenarioCatalog';
import { SCENARIO_THEMES, applyScenarioToTrip, scenarioStopToPlace, type ScenarioTheme, type TourScenario } from '../lib/tourScenario';

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

interface ScenarioOption {
  id: string;
  days: number;
  scenario: TourScenario;
}

interface Props {
  currentDay: number;
  totalDays: number;
  pinnedByDay: Record<number, PinnedPlace[]>;
  onApply: (result: PinImportResult) => void;
  onSelectPlace?: (place: Place) => void;
}

export function ThemeScenarioPanel({
  currentDay,
  totalDays,
  pinnedByDay,
  onApply,
  onSelectPlace,
}: Props) {
  const { t, i18n } = useTranslation('planner');
  const [theme, setTheme] = useState<ScenarioTheme | null>(null);
  const [options, setOptions] = useState<ScenarioOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [scenario, setScenario] = useState<TourScenario | null>(null);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);
  const optionsRequestRef = useRef<ScenarioTheme | null>(null);

  const handleSelectTheme = (id: ScenarioTheme) => {
    setTheme(id);
    setOptions([]);
    setLoadingOptions(true);
    optionsRequestRef.current = id;
    void listPublishedScenarios(id, normalizeLocale(i18n.language)).then((rows) => {
      // 사용자가 이후 다른 테마를 눌렀다면 이 응답은 무시(경쟁 상태 방지)
      if (optionsRequestRef.current !== id) return;
      setOptions(rows);
      setLoadingOptions(false);
    });
  };

  const handlePickOption = (option: ScenarioOption) => {
    setScenario(option.scenario);
    setAppliedCount(null);
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
                  onClick={() => handleSelectTheme(id)}
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

          {theme && (
            <div className="theme-scenario-field">
              <span className="theme-scenario-field-label">{t('scenario.pickPrompt')}</span>
              {loadingOptions && (
                <p className="theme-scenario-days-hint">{t('scenario.catalogLoading')}</p>
              )}
              {!loadingOptions && options.length === 0 && (
                <p className="theme-scenario-error">{t('scenario.catalogEmpty')}</p>
              )}
              {!loadingOptions && options.length > 0 && (
                <div className="theme-scenario-option-list">
                  {options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className="theme-scenario-option-card"
                      onClick={() => handlePickOption(option)}
                    >
                      <span className="theme-scenario-option-days">
                        {t('scenario.dayCount', { count: option.days })}
                      </span>
                      <span className="theme-scenario-option-info">
                        <span className="theme-scenario-option-title">{option.scenario.title}</span>
                        <span className="theme-scenario-option-region">
                          {option.scenario.regionLabel || option.scenario.region}
                        </span>
                      </span>
                      <Icon name="chevronRight" size={16} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
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
                {day.stops.map((stop) => {
                  const place = scenarioStopToPlace(stop);
                  return (
                    <button
                      key={stop.placeId}
                      type="button"
                      className="theme-scenario-stop-card"
                      onClick={() => onSelectPlace?.(place)}
                    >
                      {stop.thumbnailUrl ? (
                        <img
                          src={stop.thumbnailUrl}
                          alt=""
                          className="theme-scenario-stop-thumb"
                          loading="lazy"
                        />
                      ) : (
                        <span className="theme-scenario-stop-thumb-placeholder" aria-hidden>
                          <Icon name={CATEGORY_MAP[place.categoryCode].icon} size={20} />
                        </span>
                      )}
                      <span className="theme-scenario-stop-info">
                        <span className="theme-scenario-stop-name">{stop.title}</span>
                        {stop.titleKo && stop.titleKo !== stop.title && (
                          <span className="theme-scenario-stop-name-ko">{stop.titleKo}</span>
                        )}
                        {(stop.petFriendly || stop.accessible) && (
                          <span className="theme-scenario-stop-badges">
                            {stop.petFriendly && (
                              <span className="theme-scenario-stop-badge">{t('scenario.badges.petFriendly')}</span>
                            )}
                            {stop.accessible && (
                              <span className="theme-scenario-stop-badge">{t('scenario.badges.accessible')}</span>
                            )}
                          </span>
                        )}
                        <span className="theme-scenario-stop-note">{stop.note}</span>
                      </span>
                    </button>
                  );
                })}
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
