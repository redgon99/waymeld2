import { Icon } from './Icon';
import { useMemo, useState } from 'react';
import type {
  PinnedPlace,
  RouteOptions,
  TravelMode,
  OptimizeBy,
  OriginType,
  Origin,
} from '../types';
import { TRAVEL_MODE_META, suggestStayMinutes, getCategoryMeta } from '../lib/categories';
import { generateRoute } from '../lib/planner';

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

const OPTIMIZE_LABELS: Record<OptimizeBy, string> = {
  distance: '최단거리',
  time: '최소시간',
  'no-toll': '무료도로',
};

const OPTIMIZE_LABELS_EN: Record<OptimizeBy, string> = {
  distance: 'Shortest',
  time: 'Fastest',
  'no-toll': 'Free roads',
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
  const [originMenuOpen, setOriginMenuOpen] = useState(false);

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

  function setOriginType(type: OriginType) {
    if (type === 'current') {
      patchOrigin({ type, label: '현재 위치' });
      setOriginMenuOpen(false);
    } else if (type === 'map-click') {
      patchOrigin({ type, label: '지도에서 선택', lat: undefined, lng: undefined });
      onPickOriginFromMap();
      setOriginMenuOpen(false);
    } else {
      patchOrigin({ type, label: options.origin.address || '', address: options.origin.address || '' });
    }
  }

  const originLabel = originDisplayLabel(options.origin, pickingOriginFromMap, pinned);

  if (!open && !embedded) return null;

  return (
    <aside
      className={`route-panel route-panel-v2 ${open || embedded ? 'open' : ''} ${
        embedded ? 'route-panel-embedded' : ''
      }`}
      aria-label="경로 설정"
    >
      {!embedded && (
        <header className="route-panel-header">
          <div>
            <div className="panel-title">
              <Icon name="route" />
              <span>경로 설정</span>
            </div>
            <div className="panel-subtitle">
              {currentDay}일차 · {pinned.length}개 장소
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="패널 닫기">
            <Icon name="close" />
          </button>
        </header>
      )}

      <div className="route-panel-body">
        {/* DEPART 출발 */}
        <section className="route-section">
          <div className="section-header">
            <span className="section-label route-v2-label">DEPART 출발</span>
            {currentDay > 1 && onCopyFromPreviousDay && (
              <button type="button" className="copy-day-btn" onClick={onCopyFromPreviousDay}>
                {currentDay - 1}일차와 동일
              </button>
            )}
          </div>
          <div className="route-depart-row">
            <label className="route-depart-chip">
              <Icon name="clock" size={16} />
              <input
                type="time"
                value={options.departTime}
                onChange={(e) => patch('departTime', e.target.value)}
                aria-label="출발 시각"
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
            >
              <Icon name="mapPin" size={16} />
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
                <Icon name="location" size={14} /> 현재 위치
              </button>
              <button
                type="button"
                className={options.origin.type === 'map-click' ? 'active' : ''}
                onClick={() => setOriginType('map-click')}
              >
                <Icon name="pinSelect" size={14} /> 지도에서 선택
              </button>
              <div
                className={`route-origin-address ${
                  options.origin.type === 'address' ? 'active' : ''
                }`}
              >
                <Icon name="search" size={14} />
                <input
                  type="text"
                  placeholder="주소·장소명"
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
            <span>식사 시간 반영</span>
          </label>
        </section>

        {/* TRANSPORT 이동수단 */}
        <section className="route-section">
          <div className="section-label route-v2-label">TRANSPORT 이동수단</div>
          <div className="route-mode-row">
            {(Object.keys(TRAVEL_MODE_META) as TravelMode[]).map((mode) => {
              const meta = TRAVEL_MODE_META[mode];
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

        {/* OPTIMIZE 최적화 */}
        <section className="route-section">
          <div className="section-label route-v2-label">OPTIMIZE 최적화</div>
          <div className="route-optimize-row">
            {(['distance', 'time', 'no-toll'] as OptimizeBy[]).map((key) => (
              <button
                key={key}
                type="button"
                className={`route-optimize-chip ${
                  options.optimizeBy === key ? 'selected' : ''
                }`}
                onClick={() => patch('optimizeBy', key)}
                title={OPTIMIZE_LABELS_EN[key]}
              >
                {OPTIMIZE_LABELS[key]}
              </button>
            ))}
          </div>
          <div className="route-order-row">
            <button
              type="button"
              className={`route-order-chip ${options.autoOrder ? 'selected' : ''}`}
              onClick={() => patch('autoOrder', true)}
            >
              <Icon name="wand" size={12} /> 자동
            </button>
            <button
              type="button"
              className={`route-order-chip ${!options.autoOrder ? 'selected' : ''}`}
              onClick={() => patch('autoOrder', false)}
            >
              <Icon name="grip" size={12} /> 핀 순서
            </button>
          </div>
        </section>

        {/* STAY TIME 체류 시간 */}
        <section className="route-section">
          <div className="section-header">
            <span className="section-label route-v2-label">STAY TIME 체류 시간</span>
            <button
              type="button"
              className={`route-ai-suggest ${options.autoStayTime ? 'active' : ''}`}
              onClick={() => patch('autoStayTime', !options.autoStayTime)}
              aria-pressed={options.autoStayTime}
            >
              <Icon name="sparkles" size={12} /> AI suggest 자동 추천
            </button>
          </div>
          <div className="route-stay-list">
            {(preview?.stops ?? pinned).map((p, idx) => {
              const meta = getCategoryMeta(p.categoryCode);
              const sug = suggestStayMinutes(p.category);
              const minutes = p.stayMinutes ?? sug.minutes;
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
                      {options.autoStayTime ? sug.reason : p.categoryLabel}
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
                        aria-label={`${p.name} 체류시간(분)`}
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
            <span className="stat-label">Preview 예상</span>
            <span className="stat-value">
              {preview.totalDistanceKm} km · {preview.totalTravelMinutes}분 · ends{' '}
              {preview.finishAt}
            </span>
          </div>
        )}
        <button
          className="generate-btn"
          onClick={onGenerate}
          disabled={pinned.length < 2}
        >
          <Icon name="sparkles" />
          {hasExistingRoute ? 'Rebuild route · 동선 다시 만들기' : 'Build route · 동선 만들기'}
        </button>
      </footer>
    </aside>
  );
}

function originDisplayLabel(
  origin: Origin,
  picking: boolean,
  pinned: PinnedPlace[]
): string {
  if (picking) return '지도를 클릭하세요';
  if (origin.type === 'current') return '현재 위치';
  if (origin.type === 'map-click') {
    if (origin.address || origin.label) return origin.address || origin.label;
    return '지도에서 선택';
  }
  if (origin.type === 'address') {
    return origin.address?.trim() || '주소·장소명 입력';
  }
  if (pinned[0]) return `${pinned[0].name} (stop 1)`;
  return '출발지 선택';
}
