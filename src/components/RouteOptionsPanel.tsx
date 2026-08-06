import { Icon } from './Icon';
import { useMemo } from 'react';
import type {
  PinnedPlace,
  RouteOptions,
  TravelMode,
  OptimizeBy,
  OriginType,
  Origin,
} from '../types';
import { TRAVEL_MODE_META, suggestStayMinutes, getCategoryMeta, CATEGORY_MAP } from '../lib/categories';
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

export function RouteOptionsPanel({
  open,
  currentDay,
  totalDays,
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
  // 실시간 미리보기 계산
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
    } else if (type === 'map-click') {
      patchOrigin({ type, label: '지도에서 선택', lat: undefined, lng: undefined });
      onPickOriginFromMap();
    } else {
      patchOrigin({ type, label: '', address: '' });
    }
  }

  if (!open && !embedded) return null;

  return (
    <aside
      className={`route-panel ${open || embedded ? 'open' : ''} ${embedded ? 'route-panel-embedded' : ''}`}
      aria-label="경로 설정"
    >
      {/* 헤더 */}
      <header className="route-panel-header">
        <div>
          <div className="panel-title">
            <Icon name="route" />
            <span>경로 설정</span>
          </div>
          <div className="panel-subtitle">
            {currentDay}일차 · {pinned.length}개 장소 · 카테고리 {countCategories(pinned)}종
          </div>
        </div>
        {!embedded && (
          <button className="icon-btn" onClick={onClose} aria-label="패널 닫기">
            <Icon name="close" />
          </button>
        )}
      </header>

      <div className="route-panel-body">
        {/* 출발지 */}
        <section className="route-section">
          <div className="section-header">
            <span className="section-label">{currentDay}일차 출발지</span>
            {currentDay > 1 && onCopyFromPreviousDay && (
              <button type="button" className="copy-day-btn" onClick={onCopyFromPreviousDay}>
                {currentDay - 1}일차와 동일
              </button>
            )}
          </div>
          <div className="origin-options">
            <label
              className={`origin-row ${options.origin.type === 'current' ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="origin"
                checked={options.origin.type === 'current'}
                onChange={() => setOriginType('current')}
              />
              <Icon name="location" className="origin-icon" />
              <span className="origin-label">현재 위치</span>
              <span className="origin-hint">GPS 자동 감지</span>
            </label>

            <label
              className={`origin-row ${options.origin.type === 'map-click' ? 'selected' : ''} ${pickingOriginFromMap ? 'picking' : ''}`}
            >
              <input
                type="radio"
                name="origin"
                checked={options.origin.type === 'map-click'}
                onChange={() => setOriginType('map-click')}
              />
              <Icon name="pinSelect" className="origin-icon" />
              <span className="origin-label">
                {pickingOriginFromMap
                  ? '지도를 클릭하세요'
                  : options.origin.type === 'map-click' && options.origin.lat
                  ? options.origin.address || '선택됨'
                  : '지도에서 클릭 선택'}
              </span>
            </label>

            <label
              className={`origin-row ${options.origin.type === 'address' ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="origin"
                checked={options.origin.type === 'address'}
                onChange={() => setOriginType('address')}
              />
              <Icon name="search" className="origin-icon" />
              <input
                type="text"
                placeholder="주소·장소명 입력"
                value={options.origin.type === 'address' ? options.origin.address ?? '' : ''}
                onChange={(e) => patchOrigin({ address: e.target.value, label: e.target.value })}
                onFocus={() => setOriginType('address')}
                className="origin-input"
              />
            </label>
          </div>
          {options.travelMode === 'transit' && (
            <p className="mode-hint">
              대중교통은 REST API 키가 있으면 실제 경로를, 없으면 추정 시간을 사용합니다.
            </p>
          )}
        </section>

        {/* 출발 시각 */}
        <section className="route-section">
          <div className="section-header">
            <span className="section-label">출발 시각</span>
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={options.reflectMealTime}
                onChange={(e) => patch('reflectMealTime', e.target.checked)}
              />
              <span className="toggle-label">
                <Icon name="sparkles" /> 식사 시간 반영
              </span>
            </label>
          </div>
          <div className="time-input-row">
            <Icon name="clock" />
            <input
              type="time"
              value={options.departTime}
              onChange={(e) => patch('departTime', e.target.value)}
            />
            {preview && (
              <span className="finish-hint">~ {preview.finishAt} 완료 예정</span>
            )}
          </div>
        </section>

        {/* 이동수단 */}
        <section className="route-section">
          <div className="section-label">이동수단</div>
          <div className="mode-grid">
            {(Object.keys(TRAVEL_MODE_META) as TravelMode[]).map((mode) => {
              const meta = TRAVEL_MODE_META[mode];
              return (
                <button
                  key={mode}
                  className={`mode-btn ${options.travelMode === mode ? 'selected' : ''}`}
                  onClick={() => patch('travelMode', mode)}
                >
                  <Icon name={meta.icon} />
                  <span>{meta.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 최적화 */}
        <section className="route-section">
          <div className="section-label">최적화</div>
          <div className="optimize-grid">
            {(['distance', 'time', 'no-toll'] as OptimizeBy[]).map((key) => {
              const label = OPTIMIZE_LABELS[key];
              return (
                <button
                  key={key}
                  className={`optimize-btn ${options.optimizeBy === key ? 'selected' : ''}`}
                  onClick={() => patch('optimizeBy', key)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </section>

        {/* 체류시간 자동 추천 */}
        <section className="route-section">
          <div className="section-header">
            <span className="section-label">체류시간</span>
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={options.autoStayTime}
                onChange={(e) => patch('autoStayTime', e.target.checked)}
              />
              <span className="toggle-label">
                <Icon name="sparkles" /> AI 자동 추천
              </span>
            </label>
          </div>
          <div className="stay-list">
            {(preview?.stops ?? pinned).map((p, idx) => {
              const meta = getCategoryMeta(p.categoryCode);
              const sug = suggestStayMinutes(p.category);
              return (
                <div key={p.id} className="stay-row">
                  <span
                    className="stay-order"
                    style={{ background: meta.bgColor, color: meta.iconColor }}
                  >
                    {idx + 1}
                  </span>
                  <div className="stay-body">
                    <div className="stay-name">
                      {p.name}
                      <span className="stay-cat"> · {p.categoryLabel}</span>
                    </div>
                    {options.autoStayTime && (
                      <div className="stay-hint">
                        <Icon name="sparkles" /> {sug.reason}
                      </div>
                    )}
                  </div>
                  <label className="stay-minutes">
                    <input
                      type="number"
                      className="stay-minutes-input"
                      min={0}
                      max={480}
                      step={5}
                      value={p.stayMinutes ?? sug.minutes}
                      disabled={options.autoStayTime || !onUpdateStayMinutes}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isFinite(n) || !onUpdateStayMinutes) return;
                        onUpdateStayMinutes(p.id, n);
                      }}
                      aria-label={`${p.name} 체류시간(분)`}
                    />
                    <span>분</span>
                  </label>
                </div>
              );
            })}
          </div>
        </section>

        {/* 순서 */}
        <section className="route-section">
          <div className="section-label">순서</div>
          <div className="order-grid">
            <button
              className={`order-btn ${options.autoOrder ? 'selected' : ''}`}
              onClick={() => patch('autoOrder', true)}
            >
              <Icon name="wand" /> 자동 최적화
            </button>
            <button
              className={`order-btn ${!options.autoOrder ? 'selected' : ''}`}
              onClick={() => patch('autoOrder', false)}
            >
              <Icon name="grip" /> 핀업 순서
            </button>
          </div>
        </section>
      </div>

      {/* 푸터 요약 + 생성 버튼 */}
      <footer className="route-panel-footer">
        {preview && (
          <div className="preview-stats">
            <div>
              <span className="stat-label">거리</span>
              <span className="stat-value">{preview.totalDistanceKm}km</span>
            </div>
            <div>
              <span className="stat-label">이동</span>
              <span className="stat-value">{preview.totalTravelMinutes}분</span>
            </div>
            <div>
              <span className="stat-label">체류</span>
              <span className="stat-value">{formatHours(preview.totalStayMinutes)}</span>
            </div>
            <div>
              <span className="stat-label">완료</span>
              <span className="stat-value">{preview.finishAt}</span>
            </div>
          </div>
        )}
        <button
          className="generate-btn"
          onClick={onGenerate}
          disabled={pinned.length < 2}
        >
          <Icon name="sparkles" />
          {hasExistingRoute ? '동선 다시 만들기' : '동선 만들기'}
        </button>
      </footer>
    </aside>
  );
}

const OPTIMIZE_LABELS: Record<OptimizeBy, string> = {
  distance: '최단 거리',
  time: '최소 시간',
  'no-toll': '무료 도로',
};

function countCategories(pinned: PinnedPlace[]) {
  return new Set(pinned.map((p) => p.category)).size;
}

function formatHours(min: number) {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}
