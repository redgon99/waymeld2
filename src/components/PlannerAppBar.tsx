import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { AuthBar } from './AuthBar';
import { SaveStatusBadge, type SaveStatus } from './SaveStatusBadge';
import { TripSelectMenu } from './TripSelectMenu';
import type { Trip, TripSummary } from '../lib/trips';

interface Props {
  trip: Trip;
  summaries: TripSummary[];
  countsByDay: Record<number, number>;
  saveStatus: SaveStatus;
  lastSavedAt?: number | null;
  onGuestSaveClick?: () => void;
  onTitleChange: (title: string) => void;
  onSelectTrip: (tripId: string) => void;
  onSelectDay: (day: number) => void;
  onAddDay: () => void;
  onRemoveDay: (day: number) => void;
  onOpenMaterials: () => void;
  onNewTrip?: () => void;
  onDeleteTrip?: () => void;
  onShare: () => void;
  presentationMode: boolean;
  onTogglePresentation: () => void;
  tableViewMode?: boolean;
  onToggleTableView?: () => void;
  plazaNavVisible?: boolean;
}

export function PlannerAppBar({
  trip,
  summaries,
  countsByDay,
  saveStatus,
  lastSavedAt,
  onGuestSaveClick,
  onTitleChange,
  onSelectTrip,
  onSelectDay,
  onAddDay,
  onRemoveDay,
  onOpenMaterials,
  onNewTrip,
  onDeleteTrip,
  onShare,
  presentationMode,
  onTogglePresentation,
  tableViewMode = false,
  onToggleTableView,
  plazaNavVisible,
}: Props) {
  const { t } = useTranslation('planner');
  const days = Array.from({ length: trip.totalDays }, (_, i) => i + 1);

  return (
    <header className="planner-app-bar desktop-only-overlay">
      <Link to="/" className="planner-brand" title="WayMeld">
        <span className="planner-brand-mark" aria-hidden>
          여
        </span>
        <span className="planner-brand-text">
          WayMeld <span className="planner-brand-ko">여로담</span>
        </span>
      </Link>

      <div className="planner-app-bar-divider" aria-hidden />

      <div className="planner-trip-block">
        <input
          className="planner-trip-title"
          value={trip.title}
          onChange={(e) => onTitleChange(e.target.value)}
          aria-label={t('trip.titleAria')}
          maxLength={60}
        />
        {summaries.length > 0 && (
          <TripSelectMenu
            summaries={summaries}
            currentTripId={trip.id}
            onSelect={onSelectTrip}
            compact
          />
        )}
      </div>

      <div className="planner-day-pills" role="tablist" aria-label={t('day.tabsAria', { defaultValue: '일차' })}>
        {days.map((d) => {
          const count = countsByDay[d] ?? 0;
          const active = d === trip.currentDay;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              className={`planner-day-pill ${active ? 'active' : ''}`}
              onClick={() => onSelectDay(d)}
            >
              Day {d}
              {count > 0 ? ` · ${count}` : ''}
            </button>
          );
        })}
        <button type="button" className="planner-day-add" onClick={onAddDay} aria-label={t('trip.addDay')}>
          + Day
        </button>
        {trip.totalDays > 1 && (
          <button
            type="button"
            className="planner-day-remove"
            onClick={() => onRemoveDay(trip.currentDay)}
            aria-label={t('day.remove', { n: trip.currentDay })}
            title={t('day.removeTitle')}
          >
            <Icon name="trash" size={14} />
          </button>
        )}
      </div>

      <div className="planner-app-bar-spacer" />

      <SaveStatusBadge
        status={saveStatus}
        lastSavedAt={lastSavedAt}
        onGuestClick={onGuestSaveClick}
      />

      <button
        type="button"
        className="planner-bar-btn ghost"
        onClick={onOpenMaterials}
        title={t('trip.materials')}
      >
        <Icon name="folder" size={16} />
        {t('trip.materials')}
      </button>

      {onNewTrip && (
        <button type="button" className="planner-bar-btn ghost" onClick={onNewTrip}>
          <Icon name="plus" size={16} />
          {t('trip.newTrip')}
        </button>
      )}

      {onDeleteTrip && summaries.length > 0 && (
        <button
          type="button"
          className="planner-bar-btn ghost danger"
          onClick={onDeleteTrip}
          title={t('trip.deleteTitle', { title: trip.title })}
        >
          <Icon name="trash" size={16} />
        </button>
      )}

      {plazaNavVisible && (
        <Link to="/plaza" className="planner-bar-btn ghost">
          {t('plazaNav')}
        </Link>
      )}
      <Link to="/setup" className="planner-bar-btn ghost">
        {t('nav.setup')}
      </Link>
      <Link to="/help" className="planner-bar-btn ghost">
        {t('nav.help')}
      </Link>

      <button
        type="button"
        className={`planner-bar-btn solid ${presentationMode ? 'active' : ''}`}
        onClick={onTogglePresentation}
        aria-pressed={presentationMode}
      >
        <Icon name={presentationMode ? 'minimize' : 'presentation'} size={16} />
        Overview
      </button>

      {onToggleTableView && (
        <button
          type="button"
          className={`planner-bar-btn solid ${tableViewMode ? 'active' : ''}`}
          onClick={onToggleTableView}
          aria-pressed={tableViewMode}
          aria-haspopup="dialog"
        >
          <Icon name="layoutList" size={16} />
          {t('view.table')}
        </button>
      )}

      <button type="button" className="planner-bar-btn outline" onClick={onShare}>
        <Icon name="share" size={16} />
        {t('trip.share')}
      </button>

      <AuthBar />
    </header>
  );
}
