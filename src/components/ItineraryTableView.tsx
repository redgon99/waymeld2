import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import type { Trip } from '../lib/trips';
import {
  buildItineraryTableRows,
  countPinsByDay,
  filterItineraryTableRows,
  type ItineraryTableDayFilter,
} from '../lib/itineraryTable';

interface Props {
  open: boolean;
  trip: Trip;
  selectedPlaceId?: string | null;
  onSelectPlaceId?: (placeId: string) => void;
  onClose: () => void;
}

export function ItineraryTableView({
  open,
  trip,
  selectedPlaceId = null,
  onSelectPlaceId,
  onClose,
}: Props) {
  const { t } = useTranslation('planner');
  const [dayFilter, setDayFilter] = useState<ItineraryTableDayFilter>(null);

  const allRows = useMemo(() => buildItineraryTableRows(trip), [trip]);
  const countsByDay = useMemo(() => countPinsByDay(trip), [trip]);
  const rows = useMemo(
    () => filterItineraryTableRows(allRows, dayFilter),
    [allRows, dayFilter]
  );
  const days = useMemo(
    () => Array.from({ length: trip.totalDays }, (_, i) => i + 1),
    [trip.totalDays]
  );

  useEffect(() => {
    if (open) setDayFilter(null);
  }, [open, trip.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const subtitle =
    dayFilter == null
      ? allRows.length > 0
        ? `${trip.title} · ${t('table.summary', {
            days: trip.totalDays,
            count: allRows.length,
          })}`
        : trip.title
      : `${trip.title} · Day ${dayFilter} · ${t('table.countPlaces', {
          count: rows.length,
          defaultValue: `${rows.length} places`,
        })}`;

  return (
    <div className="itinerary-table-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="itinerary-table-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="itinerary-table-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="itinerary-table-modal-header">
          <div className="itinerary-table-modal-heading">
            <h2 id="itinerary-table-title">{t('view.table')}</h2>
            <p className="itinerary-table-modal-sub">{subtitle}</p>
          </div>
          <button
            type="button"
            className="itinerary-table-modal-close"
            onClick={onClose}
            aria-label={t('view.tableExit')}
            title={t('view.tableExit')}
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div
          className="itinerary-table-day-filters"
          role="tablist"
          aria-label={t('table.filterAria', { defaultValue: '일차 필터' })}
        >
          <button
            type="button"
            role="tab"
            aria-selected={dayFilter == null}
            className={`itinerary-table-day-chip ${dayFilter == null ? 'active' : ''}`}
            onClick={() => setDayFilter(null)}
          >
            {t('table.filterAll', { defaultValue: '전체' })}
            {allRows.length > 0 ? ` · ${allRows.length}` : ''}
          </button>
          {days.map((d) => {
            const count = countsByDay[d] ?? 0;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={dayFilter === d}
                className={`itinerary-table-day-chip ${dayFilter === d ? 'active' : ''}`}
                onClick={() => setDayFilter(d)}
              >
                Day {d}
                {count > 0 ? ` · ${count}` : ''}
              </button>
            );
          })}
        </div>

        <div className="itinerary-table-modal-body">
          {rows.length === 0 ? (
            <p className="table-view-empty">{t('table.empty')}</p>
          ) : (
            <table className="itinerary-table">
              <thead>
                <tr>
                  <th scope="col">{t('table.col.day')}</th>
                  <th scope="col">{t('table.col.time')}</th>
                  <th scope="col">{t('table.col.place')}</th>
                  <th scope="col">{t('table.col.district')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const selected = selectedPlaceId === row.placeId;
                  return (
                    <tr
                      key={row.key}
                      className={[
                        row.required ? 'is-required' : '',
                        selected ? 'is-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => onSelectPlaceId?.(row.placeId)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectPlaceId?.(row.placeId);
                        }
                      }}
                    >
                      <td>{row.dayLabel}</td>
                      <td>{row.time}</td>
                      <td>{row.placeName}</td>
                      <td>{row.district || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
