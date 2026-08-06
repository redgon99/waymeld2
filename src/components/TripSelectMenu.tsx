import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import type { TripSummary } from '../lib/trips';

interface Props {
  summaries: TripSummary[];
  currentTripId: string;
  onSelect: (tripId: string) => void;
  compact?: boolean;
}

export function TripSelectMenu({ summaries, currentTripId, onSelect, compact = false }: Props) {
  const { t } = useTranslation('planner');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (summaries.length === 0) return null;

  const current = summaries.find((s) => s.id === currentTripId);

  function handleSelect(id: string) {
    if (id !== currentTripId) onSelect(id);
    setOpen(false);
  }

  const currentLabel = current
    ? t('trip.selectTripCurrent', { title: current.title, days: current.totalDays })
    : t('trip.selectTripMenu');

  return (
    <div className={`trip-select-menu ${open ? 'open' : ''}`} ref={rootRef}>
      <button
        type="button"
        className="trip-select-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={
          current
            ? t('trip.selectTrip', { title: current.title, days: current.totalDays })
            : t('trip.selectTripMenu')
        }
        title={currentLabel}
      >
        <Icon name="chevronDown" size={compact ? 16 : 18} />
      </button>

      {open && (
        <ul className="trip-select-dropdown" role="listbox" aria-label={t('trip.savedTripsList')}>
          {summaries.map((s) => {
            const selected = s.id === currentTripId;
            return (
              <li key={s.id} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={`trip-select-option ${selected ? 'selected' : ''}`}
                  onClick={() => handleSelect(s.id)}
                >
                  <span className="trip-select-option-label">
                    {s.title}
                    <span className="trip-select-option-days">
                      ({t('trip.daysCount', { count: s.totalDays })})
                    </span>
                  </span>
                  {selected && (
                    <span className="trip-select-option-check" aria-hidden="true">
                      <Icon name="check" size={16} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
