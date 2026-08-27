import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import type { GeneratedRoute } from '../types';
import { getCategoryMeta } from '../lib/categories';
import { useTravelModeMeta } from '../lib/i18nCategories';
import { buildKakaoMapDirectionsUrl, buildLegMapLinks } from '../lib/mapLinks';
import { formatFullItinerary } from '../lib/itineraryExport';
import { BookingLinkCards } from './BookingLinkCards';
import { BookingSearchSuggestions } from './BookingSearchSuggestions';
import { isHoursProblem } from '../lib/openingHours';
import { listAnchorConflicts } from '../lib/scheduleAnchors';
import { SortableContainer, SortableItem } from './Sortable';

interface Props {
  route: GeneratedRoute;
  tripTitle?: string;
  onReorder?: (orderedIds: string[]) => void;
  onShare?: () => void;
  onSave?: () => void;
  onClose?: () => void;
  readOnly?: boolean;
}

export function RouteSummary({
  route,
  tripTitle = 'Trip',
  onReorder,
  onShare,
  onSave,
  onClose,
  readOnly = false,
}: Props) {
  const { t } = useTranslation('planner');
  const [copied, setCopied] = useState(false);
  const directionsUrl = buildKakaoMapDirectionsUrl(route);
  const travelModeMeta = useTravelModeMeta();
  const modeMeta = travelModeMeta[route.options.travelMode];
  const legCount = route.legs.length;
  const apiLegCount = route.legs.filter((l) => l.source === 'api').length;
  const estimateLegCount = route.legs.filter((l) => l.source === 'estimate').length;
  const coveragePct = legCount > 0 ? Math.round((apiLegCount / legCount) * 100) : 0;
  const coverageLabel =
    legCount === 0
      ? t('route.coverageDone')
      : estimateLegCount === 0
        ? t('route.coverageReal', { pct: coveragePct })
        : t('route.coverageMixed', { pct: coveragePct, n: estimateLegCount });
  const mapLinkLabel =
    route.options.travelMode === 'transit'
      ? t('route.mapTransit')
      : route.options.travelMode === 'walk'
        ? t('route.mapWalk')
        : t('route.mapDrive');
  const stopIds = route.stops.map((s) => s.id);
  const fatigueLevel = route.fatigueLevel ?? 'medium';
  const anchorConflicts = listAnchorConflicts(route.stops);

  const handleCopyItinerary = async () => {
    const text = formatFullItinerary(route, tripTitle);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const originPoint =
    route.origin.lat && route.origin.lng
      ? {
          name: route.origin.label,
          lat: route.origin.lat,
          lng: route.origin.lng,
        }
      : null;

  return (
    <div className="route-summary">
      <header className="summary-header">
        <span className="summary-title">
          <Icon name="route" /> {t('route.summary')}
        </span>
        <span className={`summary-badge fatigue-${fatigueLevel}`}>
          {t(`route.fatigue.${fatigueLevel}`)}
          {route.fatigueScore != null ? ` ${route.fatigueScore}` : ''}
        </span>
        <span className={`summary-badge ${estimateLegCount > 0 ? 'partial' : 'ok'}`}>
          {coverageLabel}
        </span>
        {onClose && (
          <button className="icon-btn" onClick={onClose} aria-label={t('route.closeSummary')}>
            <Icon name="close" />
          </button>
        )}
      </header>

      <div className="summary-stats">
        <div>
          <span className="stat-label">{t('route.totalDistance')}</span>
          <span className="stat-value">{route.totalDistanceKm}km</span>
        </div>
        <div>
          <span className="stat-label">{t('route.travelTime')}</span>
          <span className="stat-value">{route.totalTravelMinutes}{t('route.minutes')}</span>
        </div>
        <div>
          <span className="stat-label">{t('route.finish')}</span>
          <span className="stat-value">{route.finishAt}</span>
        </div>
      </div>

      {anchorConflicts.length > 0 && (
        <div className="route-anchor-warning" role="status">
          <Icon name="bell" size={13} />
          <div>
            <strong>{t('route.anchorConflictTitle', { n: anchorConflicts.length })}</strong>
            <ul>
              {anchorConflicts.map((c) => (
                <li key={c.placeId}>
                  {t(c.hard ? 'route.reservedLate' : 'route.fixedArrivalLate', {
                    time: c.fixedArrival,
                    minutes: c.lateMinutes,
                  })}
                  {' — '}
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <SortableContainer
        ids={stopIds}
        direction="vertical"
        onReorder={readOnly ? undefined : onReorder}
      >
        <ul className="leg-list">
          {route.stops.map((stop, i) => {
            const meta = getCategoryMeta(stop.categoryCode, stop.category);
            const leg = route.legs[i - 1];
            const from =
              i === 0 && originPoint
                ? originPoint
                : i > 0
                  ? {
                      name: route.stops[i - 1].name,
                      lat: route.stops[i - 1].lat,
                      lng: route.stops[i - 1].lng,
                    }
                  : null;
            const legLinks =
              leg && from
                ? buildLegMapLinks(from, { name: stop.name, lat: stop.lat, lng: stop.lng }, route.options.travelMode)
                : null;
            return (
              <SortableItem key={stop.id} id={stop.id}>
                {({ listeners, setActivatorNodeRef, isDragging }) => (
                  <li className={isDragging ? 'dragging' : ''}>
                    {leg && (
                      <div className="leg-travel">
                        <Icon name={modeMeta.icon} />
                        <span>
                          {(leg.distanceMeters / 1000).toFixed(1)}km · {leg.durationMinutes}
                          {t('route.minutes')}
                          {leg.source === 'api'
                            ? ` · ${t('route.legReal')}`
                            : leg.source === 'estimate'
                              ? ` · ${t('route.legEstimate')}`
                              : ''}
                        </span>
                        {legLinks && (
                          <span className="leg-map-links">
                            <a href={legLinks.kakao} target="_blank" rel="noopener noreferrer">
                              K
                            </a>
                            <a href={legLinks.naver} target="_blank" rel="noopener noreferrer">
                              N
                            </a>
                            <a href={legLinks.google} target="_blank" rel="noopener noreferrer">
                              G
                            </a>
                          </span>
                        )}
                      </div>
                    )}
                    <div className="leg-stop">
                      <span
                        className="leg-order"
                        style={{ background: meta.bgColor, color: meta.iconColor }}
                      >
                        {stop.order}
                      </span>
                      <div className="leg-body">
                        <div className="leg-name">
                          {stop.required && (
                            <Icon
                              name="lock"
                              className="leg-required-icon"
                              title={t('pinup.requiredBadge')}
                            />
                          )}
                          {stop.name}
                          {stop.fixedArrival && (
                            <span
                              className={`leg-fixed-arrival ${stop.timingConflict ? 'is-conflict' : ''} ${stop.itemKind === 'reserved' ? 'reserved' : ''}`}
                              title={
                                stop.timingConflict
                                  ? t(
                                      stop.itemKind === 'reserved'
                                        ? 'route.reservedLate'
                                        : 'route.fixedArrivalLate',
                                      {
                                        time: stop.fixedArrival,
                                        minutes: stop.timingConflict,
                                      },
                                    )
                                  : t(
                                      stop.itemKind === 'reserved'
                                        ? 'route.reservedAt'
                                        : 'route.fixedArrivalAt',
                                      { time: stop.fixedArrival },
                                    )
                              }
                            >
                              <Icon
                                name={
                                  stop.itemKind === 'reserved' ? 'facilityReservation' : 'clock'
                                }
                                size={11}
                              />
                              {stop.fixedArrival}
                            </span>
                          )}
                        </div>
                        <div className="leg-meta">
                          {stop.arriveAt}–{stop.leaveAt} · {stop.categoryLabel} ·{' '}
                          {stop.stayMinutes ?? 0}
                          {t('route.minutes')}
                          {stop.waitMinutes ? (
                            <span className="leg-wait">
                              {' '}
                              · {t('route.waitMinutes', { minutes: stop.waitMinutes })}
                            </span>
                          ) : null}
                        </div>
                        {isHoursProblem(stop.hoursStatus) && (
                          <div className="leg-hours-warning">
                            <Icon name="clock" size={11} />{' '}
                            {t(`route.hours.${stop.hoursStatus}`, {
                              opens: stop.hoursOpensAt ?? '',
                              closes: stop.hoursClosesAt ?? '',
                            })}
                          </div>
                        )}
                        <BookingLinkCards note={stop.note} placeId={stop.id} />
                        <BookingSearchSuggestions
                          category={stop.category}
                          placeName={stop.name}
                          placeId={stop.id}
                          note={stop.note}
                        />
                      </div>
                      {!readOnly && (
                        <button
                          ref={setActivatorNodeRef}
                          {...listeners}
                          className="drag-handle-btn"
                          aria-label={t('route.dragReorder')}
                        >
                          <Icon name="grip" className="drag-handle" />
                        </button>
                      )}
                    </div>
                  </li>
                )}
              </SortableItem>
            );
          })}
        </ul>
      </SortableContainer>

      <div className="summary-actions">
        <a
          className="action-btn primary"
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="navigate" /> {mapLinkLabel}
        </a>
        <button type="button" className="action-btn" onClick={() => void handleCopyItinerary()}>
          <Icon name="note" /> {copied ? t('route.copiedItinerary') : t('route.copyItinerary')}
        </button>
        {route.legs.some((l) => l.source === 'estimate') && (
          <p className="transit-hint">{t('route.estimateHint')}</p>
        )}
        {!readOnly && (
          <>
            <button className="action-btn" onClick={onShare}>
              <Icon name="share" /> {t('trip.share')}
            </button>
            <button
              className="action-btn"
              onClick={onSave}
              title={t('route.saveNowTitle')}
            >
              <Icon name="save" /> {t('route.saveNow')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
