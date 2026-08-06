import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { TripSelectMenu } from './TripSelectMenu';
import type { Trip, TripSummary } from '../lib/trips';

interface Props {
  trip: Trip;
  summaries: TripSummary[];
  materialsCount?: number;
  onOpenMaterials?: () => void;
  onTitleChange: (title: string) => void;
  onSelectTrip: (tripId: string) => void;
  onDeleteTrip?: () => void;
  onNewTrip?: () => void;
  variant?: 'default' | 'compact';
  hideActions?: boolean;
}

export function TripBar({
  trip,
  summaries,
  materialsCount = 0,
  onOpenMaterials,
  onTitleChange,
  onSelectTrip,
  onDeleteTrip,
  onNewTrip,
  variant = 'default',
  hideActions = false,
}: Props) {
  const { t } = useTranslation('planner');
  const compact = variant === 'compact';
  const canDelete = onDeleteTrip && summaries.length > 0;

  return (
    <div className={`trip-bar ${compact ? 'trip-bar-compact' : ''}`}>
      <input
        className="trip-title-input"
        value={trip.title}
        onChange={(e) => onTitleChange(e.target.value)}
        aria-label={t('trip.titleAria')}
        maxLength={60}
      />
      {summaries.length > 0 && (
        <div className="trip-select-wrap">
          <TripSelectMenu
            summaries={summaries}
            currentTripId={trip.id}
            onSelect={onSelectTrip}
            compact={compact}
          />
          {canDelete && (
            <button
              type="button"
              className="trip-delete-btn"
              onClick={onDeleteTrip}
              title={t('trip.deleteTitle', { title: trip.title })}
              aria-label={t('trip.deleteTrip', { title: trip.title })}
            >
              <Icon name="trash" />
              {!compact && <span>{t('trip.delete')}</span>}
            </button>
          )}
        </div>
      )}
      {!hideActions && onOpenMaterials && (
        <button type="button" className="trip-materials-btn" onClick={onOpenMaterials}>
          <Icon name="folder" /> {t('trip.materials')}
          {materialsCount > 0 && (
            <span className="trip-materials-badge">{materialsCount}</span>
          )}
        </button>
      )}
      {!hideActions && onNewTrip && (
        <button type="button" className="trip-new-btn" onClick={onNewTrip}>
          <Icon name="plus" /> {t('trip.newTrip')}
        </button>
      )}
    </div>
  );
}
