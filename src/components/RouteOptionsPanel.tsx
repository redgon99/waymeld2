import { Icon } from './Icon';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  PinnedPlace,
  RouteOptions,
  TravelMode,
  OptimizeBy,
  OriginType,
  Origin,
  SimpleCategory,
} from '../types';
import { suggestStayMinutes, getCategoryMeta } from '../lib/categories';
import { useTravelModeMeta } from '../lib/i18nCategories';
import { generateRoute } from '../lib/planner';
import { normalizeLocale } from '../lib/locale';
import { fetchAiStaySuggestions } from '../lib/routeStaySuggest';

interface Props {
  open: boolean;
  currentDay: number;
  totalDays: number;
  pinned: PinnedPlace[];
  options: RouteOptions;
  onChange: (next: RouteOptions) => void;
  onClose: () => void;
  onGenerate: () => void;
  onPickOriginFromMap: () => void;
  onCopyFromPreviousDay?: () => void;
  pickingOriginFromMap?: boolean;
  hasExistingRoute?: boolean;
  onUpdateStayMinutes?: (placeId: string, minutes: number) => void;
  /** 좌측 탭 패널 안에 임베드 (고정 우측 슬라이드 비활성) */
  embedded?: boolean;
}

const OPTIMIZE_KEYS: OptimizeBy[] = ['distance', 'time', 'no-toll'];

const OPTIMIZE_I18N: Record<OptimizeBy, string> = {
  distance: 'route.options.optimizeDistance',
  time: 'route.options.optimizeTime',
  'no-toll': 'route.options.optimizeNoToll',
};

export function RouteOptionsPanel({
  open,
  currentDay,
  totalDays: _totalDays,
  pinned,
  options,
  onChange,
  onClose,
  onGenerate,
  onPickOriginFromMap,
  onCopyFromPreviousDay,
  pickingOriginFromMap = false,
  hasExistingRoute = false,
  onUpdateStayMinutes,
  embedded = false,
}: Props) {
  const { t, i18n } = useTranslation('planner');
  const travelModeMeta = useTravelModeMeta();
  const [originMenuOpen, setOriginMenuOpen] = useState(false);
  const [aiStayLoading, setAiStayLoading] = useState(false);
  const [aiStayReasons, setAiStayReasons] = useState<Record<string, string>>({});

  const preview = useMemo(() => {
    if (pinned.length === 0) return null;
    try {
      return generateRoute(pinned, options);
    } catch {
      return null;
    }
  }, [pinned, options]);

  function patch<K extends keyof RouteOptions>(key: K, value: RouteOptions[K]) {
    onChange({ ...options, [key]: value });
  }

  function patchOrigin(next: Partial<Origin>) {
    onChange({ ...options, origin: { ...options.origin, ...next } });
  }

  async function handleToggleAutoStay() {
    if (options.autoStayTime) {
      patch('autoStayTime', false);
      return;
    }
    if (!onUpdateStayMinutes || pinned.length === 0) {
      patch('autoStayTime', true);
      return;
    }

    setAiStayLoading(true);
    const targets = pinned.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      categoryLabel: p.categoryLabel,
      address: p.address,
    }));
    const suggestions = await fetchAiStaySuggestions(targets, normalizeLocale(i18n.language));

    if (suggestions && suggestions.length > 0) {
      const reasons: Record<string, string> = {};
      for (const s of suggestions) {
        onUpdateStayMinutes(s.id, s.minutes);
        if (s.reason) reasons[s.id] = s.reason;
      }
      setAiStayReasons(reasons);
    } else {
      // AI 호출 실패 시 기존 카테고리 고정값으로 조용히 대체
      for (const p of pinned) {
        onUpdateStayMinutes(p.id, suggestStayMinutes(p.category).minutes);
      }
      setAiStayReasons({});
    }
    setAiStayLoading(false);
    patch('autoStayTime', true);
  }

  function setOriginType(type: OriginType) {
    if (type === 'current') {
      patchOrigin({ type, label: t('route.options.originCurrent') });
      setOriginMenuOpen(false);
    } else if (type === 'map-click') {
      patchOrigin({
        type,
        label: t('route.options.originMapPick'),
        lat: undefined,
        lng: undefined,
      });
      onPickOriginFromMap();
      setOriginMenuOpen(false);
    } else {
      patchOrigin({
        type,
        label: options.origin.address || '',
        address: options.origin.address || '',
      });
    }
  }

  const originLabel = originDisplayLabel(
    options.origin,
    pickingOriginFromMap,
    pinned,
    t
  );

  if (!open && !embedded) return null;

  return (
    <aside
      className={`route-panel route-panel-v2 ${open || embedded ? 'open' : ''} ${
        embedded ? 'route-panel-embedded' : ''
      }`}
      aria-label={t('route.options.panelAria')}
      lang={i18n.language}
    >
      {!embedded && (
        <header className="route-panel-header">
          <div>
            <div className="panel-title">
              <Icon name="route" />
              <span>{t('route.options.title')}</span>
            </div>
            <div className="panel-subtitle">
              {t('route.options.subtitle', {
                day: currentDay,
                count: pinned.length,
              })}
            </div>
          </div>
          <button
            className="icon-btn"
            onClick={onClose}
            aria-label={t('route.options.close')}
          >
            <Icon name="close" />
          </button>
        </header>
      )}

      <div className="route-panel-body">
        <section className="route-section">
          <div className="section-header">
            <span className="section-label route-v2-label">
              {t('route.options.sectionDepart')}
            </span>
            {currentDay > 1 && onCopyFromPreviousDay && (
              <button type="button" className="copy-day-btn" onClick={onCopyFromPreviousDay}>
                {t('route.options.copySameAsDay', { day: currentDay - 1 })}
              </button>
            )}
          </div>
          <div className="route-depart-row">
            <label className="route-depart-chip">
              <Icon name="clock" size={16} />
              <input
                type="time"
                lang={i18n.language === 'zh' ? 'zh-CN' : i18n.language}
                value={options.departTime}
                onChange={(e) => patch('departTime', e.target.value)}
                aria-label={t('route.options.departTime')}
              />
            </label>
            <button
              type="button"
              className={`route-depart-chip origin ${originMenuOpen ? 'open' : ''} ${
                pickingOriginFromMap ? 'picking' : ''
              }`}
              onClick={() => setOriginMenuOpen((v) => !v)}
              aria-expanded={originMenuOpen}
              aria-haspopup="listbox"
              aria-label={t('route.options.originAria', { label: originLabel })}
              title={t('route.options.originAria', { label: originLabel })}
            >
              <span className="route-depart-origin-badge">
                {t('route.options.originBadge')}
              </span>
              <Icon name="mapPin" size={15} />
              <span className="route-depart-origin-text">{originLabel}</span>
            </button>
          </div>

          {originMenuOpen && (
            <div className="route-origin-menu" role="listbox">
              <button
                type="button"
                className={options.origin.type === 'current' ? 'active' : ''}
                onClick={() => setOriginType('current')}
              >
                <Icon name="location" size={14} /> {t('route.options.originCurrent')}
              </button>
              <button
                type="button"
                className={options.origin.type === 'map-click' ? 'active' : ''}
                onClick={() => setOriginType('map-click')}
              >
                <Icon name="pinSelect" size={14} /> {t('route.options.originMapPick')}
              </button>
              <div
                className={`route-origin-address ${
                  options.origin.type === 'address' ? 'active' : ''
                }`}
              >
                <Icon name="search" size={14} />
                <input
                  type="text"
                  placeholder={t('route.options.originAddressPlaceholder')}
                  value={
                    options.origin.type === 'address' ? options.origin.address ?? '' : ''
                  }
                  onChange={(e) =>
                    patchOrigin({
                      type: 'address',
                      address: e.target.value,
                      label: e.target.value,
                    })
                  }
                  onFocus={() => setOriginType('address')}
                />
              </div>
            </div>
          )}

          <label className="route-mini-toggle">
            <input
              type="checkbox"
              checked={options.reflectMealTime}
              onChange={(e) => patch('reflectMealTime', e.target.checked)}
            />
            <span>{t('route.options.reflectMeal')}</span>
          </label>
        </section>

        <section className="route-section">
          <div className="section-label route-v2-label">
            {t('route.options.sectionTransport')}
          </div>
          <div className="route-mode-row">
            {(Object.keys(travelModeMeta) as TravelMode[]).map((mode) => {
              const meta = travelModeMeta[mode];
              return (
                <button
                  key={mode}
                  type="button"
                  className={`route-mode-chip ${
                    options.travelMode === mode ? 'selected' : ''
                  }`}
                  onClick={() => patch('travelMode', mode)}
                >
                  <Icon name={meta.icon} size={18} />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="route-section">
          <div className="section-label route-v2-label">
            {t('route.options.sectionOptimize')}
          </div>
          <div className="route-optimize-row">
            {OPTIMIZE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={`route-optimize-chip ${
                  options.optimizeBy === key ? 'selected' : ''
                }`}
                onClick={() => patch('optimizeBy', key)}
              >
                {t(OPTIMIZE_I18N[key])}
              </button>
            ))}
          </div>
          <div className="route-order-row">
            <button
              type="button"
              className={`route-order-chip ${options.autoOrder ? 'selected' : ''}`}
              onClick={() => patch('autoOrder', true)}
            >
              <Icon name="wand" size={12} /> {t('route.options.orderAuto')}
            </button>
            <button
              type="button"
              className={`route-order-chip ${!options.autoOrder ? 'selected' : ''}`}
              onClick={() => patch('autoOrder', false)}
            >
              <Icon name="grip" size={12} /> {t('route.options.orderPins')}
            </button>
          </div>
        </section>

        <section className="route-section">
          <div className="section-header">
            <span className="section-label route-v2-label">
              {t('route.options.sectionStay')}
            </span>
            <button
              type="button"
              className={`route-ai-suggest ${options.autoStayTime ? 'active' : ''}`}
              onClick={() => void handleToggleAutoStay()}
              disabled={aiStayLoading}
              aria-pressed={options.autoStayTime}
            >
              <Icon name="sparkles" size={12} spin={aiStayLoading} />{' '}
              {aiStayLoading ? t('route.options.aiSuggesting') : t('route.options.aiSuggest')}
            </button>
          </div>
          <div className="route-stay-list">
            {(preview?.stops ?? pinned).map((p, idx) => {
              const meta = getCategoryMeta(p.categoryCode);
              const sug = suggestStayMinutes(p.category);
              const minutes = p.stayMinutes ?? sug.minutes;
              const reason = aiStayReasons[p.id] ?? stayReasonLabel(p.category, t);
              return (
                <div key={p.id} className="route-stay-card">
                  <span
                    className="route-stay-num"
                    style={{ background: meta.bgColor, color: '#fff' }}
                  >
                    {idx + 1}
                  </span>
                  <div className="route-stay-body">
                    <div className="route-stay-name">{p.name}</div>
                    <div className="route-stay-hint">
                      {options.autoStayTime ? reason : p.categoryLabel}
                    </div>
                  </div>
                  {options.autoStayTime || !onUpdateStayMinutes ? (
                    <span className="route-stay-badge">{minutes} min</span>
                  ) : (
                    <label className="route-stay-edit">
                      <input
                        type="number"
                        min={0}
                        max={480}
                        step={5}
                        value={minutes}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n) || !onUpdateStayMinutes) return;
                          onUpdateStayMinutes(p.id, n);
                        }}
                        aria-label={t('route.options.stayMinutesAria', { name: p.name })}
                      />
                      <span>min</span>
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="route-panel-footer">
        {preview && (
          <div className="preview-stats route-preview-line">
            <span className="stat-label">{t('route.options.preview')}</span>
            <span className="stat-value">
              {t('route.options.previewStats', {
                km: preview.totalDistanceKm,
                minutes: preview.totalTravelMinutes,
                time: preview.finishAt,
              })}
            </span>
          </div>
        )}
        <button
          className="generate-btn"
          onClick={onGenerate}
          disabled={pinned.length < 2}
        >
          <Icon name="sparkles" />
          {hasExistingRoute ? t('route.options.rebuild') : t('route.options.build')}
        </button>
      </footer>
    </aside>
  );
}

function stayReasonLabel(
  category: SimpleCategory,
  t: (key: string) => string
): string {
  return t(`route.options.stayReason.${category}`);
}

function originDisplayLabel(
  origin: Origin,
  picking: boolean,
  pinned: PinnedPlace[],
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  if (picking) return t('route.options.originClickMap');
  if (origin.type === 'current') return t('route.options.originCurrent');
  if (origin.type === 'map-click') {
    if (origin.address || origin.label) {
      const raw = (origin.address || origin.label || '').trim();
      // 언어 전환 후에도 타입 기준 기본 문구는 재번역
      if (
        raw === '지도에서 선택' ||
        raw === 'Pick on map' ||
        raw === '地図で選択' ||
        raw === '在地图上选择'
      ) {
        return t('route.options.originMapPick');
      }
      return raw;
    }
    return t('route.options.originMapPick');
  }
  if (origin.type === 'address') {
    return origin.address?.trim() || t('route.options.originEnterAddress');
  }
  if (pinned[0]) return t('route.options.originStop1', { name: pinned[0].name });
  return t('route.options.originSelect');
}
