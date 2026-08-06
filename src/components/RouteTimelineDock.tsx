import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import type { GeneratedRoute } from '../types';
import { getCategoryMeta, TRAVEL_MODE_META } from '../lib/categories';
import { buildKakaoMapDirectionsUrl } from '../lib/mapLinks';

interface Props {
  route: GeneratedRoute;
  currentDay: number;
  panelOpen: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onReoptimize: () => void;
  selectedStopId?: string | null;
  onSelectStop?: (placeId: string) => void;
  refining?: boolean;
}

export function RouteTimelineDock({
  route,
  currentDay,
  panelOpen,
  collapsed,
  onToggleCollapsed,
  onReoptimize,
  selectedStopId,
  onSelectStop,
  refining,
}: Props) {
  const { t } = useTranslation('planner');
  const modeMeta = TRAVEL_MODE_META[route.options.travelMode];
  const directionsUrl = buildKakaoMapDirectionsUrl(route);
  const fatigueLevel = route.fatigueLevel ?? 'medium';
  const leftClass = panelOpen ? 'dock-beside-panel' : 'dock-beside-rail';

  if (collapsed) {
    return (
      <div className={`route-timeline-dock collapsed ${leftClass} desktop-only-overlay`}>
        <button type="button" className="route-dock-pill" onClick={onToggleCollapsed}>
          <span className="route-dock-pill-title">
            Day {currentDay} · {route.stops.length} stops
          </span>
          <span className="route-dock-pill-stats">
            {route.totalDistanceKm} km · {route.totalTravelMinutes}m · ends {route.finishAt}
          </span>
          <Icon name="chevronDown" size={16} className="route-dock-chevron-up" />
        </button>
      </div>
    );
  }

  return (
    <div className={`route-timeline-dock ${leftClass} desktop-only-overlay`}>
      {refining && (
        <div className="route-dock-refining">
          <Icon name="loader" spin size={14} /> 실제 길찾기 적용 중…
        </div>
      )}
      <div className="route-dock-header">
        <span className="route-dock-title">
          Day {currentDay} route · {currentDay}일차 동선
        </span>
        <span className="route-dock-meta">
          Depart <strong>{route.options.departTime}</strong> · {modeMeta.label}
        </span>
        <span className={`route-dock-fatigue fatigue-${fatigueLevel}`}>
          {t(`route.fatigue.${fatigueLevel}`)}
        </span>
        <div className="route-dock-spacer" />
        <span className="route-dock-stats">
          {route.totalDistanceKm} km · {route.totalTravelMinutes}m · ends {route.finishAt}
        </span>
        {directionsUrl && (
          <a
            className="route-dock-btn outline"
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
          >
            Kakao Map
          </a>
        )}
        <button type="button" className="route-dock-btn accent" onClick={onReoptimize}>
          Re-optimize
        </button>
        <button
          type="button"
          className="route-dock-btn ghost"
          onClick={onToggleCollapsed}
          aria-label="타임라인 접기"
        >
          <Icon name="chevronDown" size={16} />
        </button>
      </div>

      <div className="route-dock-track">
        {route.stops.map((stop, i) => {
          const meta = getCategoryMeta(stop.categoryCode, stop.category);
          const leg = route.legs[i - 1];
          const selected = selectedStopId === stop.id;
          const stay = stop.stayMinutes ?? 0;
          return (
            <div key={stop.id} className="route-dock-segment">
              {i > 0 && leg && (
                <div className="route-dock-connector">
                  <span>{leg.durationMinutes} min</span>
                  <div className="route-dock-dash" />
                  <span>
                    → {(leg.distanceMeters / 1000).toFixed(1)} km
                  </span>
                </div>
              )}
              <button
                type="button"
                className={`route-dock-stop ${selected ? 'selected' : ''}`}
                onClick={() => onSelectStop?.(stop.id)}
              >
                <div className="route-dock-stop-head">
                  <span
                    className="route-dock-num"
                    style={{ background: meta.bgColor, color: meta.iconColor }}
                  >
                    {i + 1}
                  </span>
                  <span className="route-dock-stop-name">{stop.name}</span>
                </div>
                <div className="route-dock-stop-time">
                  {stop.arriveAt}
                  {stay > 0 ? `–${stop.leaveAt} · ${stay}m` : ''}
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
