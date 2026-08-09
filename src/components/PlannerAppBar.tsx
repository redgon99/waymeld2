import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { AuthBar } from './AuthBar';
import { SaveStatusBadge, type SaveStatus } from './SaveStatusBadge';
import { TripSelectMenu } from './TripSelectMenu';
import { PlannerDayPills } from './PlannerDayPills';
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
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  const mapActive = !presentationMode && !tableViewMode;

  const handleSelectMapView = () => {
    if (tableViewMode) onToggleTableView?.();
    if (presentationMode) onTogglePresentation();
  };

  const moreItem = (label: string, action: () => void, danger = false) => (
    <button
      type="button"
      role="menuitem"
      className={`planner-more-item ${danger ? 'danger' : ''}`}
      onClick={() => {
        setMoreOpen(false);
        action();
      }}
    >
      {label}
    </button>
  );

  return (
    <header className="planner-app-bar desktop-only-overlay">
      {/* 1. 브랜드 + 여행 */}
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

      <div className="planner-app-bar-divider" aria-hidden />

      {/* 2. 일정 */}
      <PlannerDayPills
        totalDays={trip.totalDays}
        currentDay={trip.currentDay}
        countsByDay={countsByDay}
        onSelectDay={onSelectDay}
        onAddDay={onAddDay}
        onRemoveDay={onRemoveDay}
      />

      <div className="planner-app-bar-spacer" />

      {/* 3. 보기 전환 */}
      <div
        className="planner-view-segment"
        role="group"
        aria-label={t('view.segmentAria', { defaultValue: '보기 전환' })}
      >
        <button
          type="button"
          className={`planner-view-segment-btn ${mapActive ? 'active' : ''}`}
          aria-pressed={mapActive}
          onClick={handleSelectMapView}
        >
          {t('view.map', { defaultValue: '지도' })}
        </button>
        <button
          type="button"
          className={`planner-view-segment-btn ${presentationMode ? 'active' : ''}`}
          aria-pressed={presentationMode}
          onClick={onTogglePresentation}
        >
          Overview
        </button>
        {onToggleTableView && (
          <button
            type="button"
            className={`planner-view-segment-btn ${tableViewMode ? 'active' : ''}`}
            aria-pressed={tableViewMode}
            aria-haspopup="dialog"
            onClick={onToggleTableView}
          >
            {t('view.tableShort', { defaultValue: '표' })}
          </button>
        )}
      </div>

      <div className="planner-app-bar-divider" aria-hidden />

      {/* 4. 액션 */}
      <SaveStatusBadge
        status={saveStatus}
        lastSavedAt={lastSavedAt}
        onGuestClick={onGuestSaveClick}
      />

      <button
        type="button"
        className="planner-bar-icon-btn"
        onClick={onOpenMaterials}
        title={t('trip.materials')}
        aria-label={t('trip.materials')}
      >
        <Icon name="folder" size={17} />
      </button>

      <button
        type="button"
        className="planner-bar-icon-btn"
        onClick={onShare}
        title={t('trip.share')}
        aria-label={t('trip.share')}
      >
        <Icon name="share" size={17} />
      </button>

      <div className="planner-bar-more" ref={moreRef}>
        <button
          type="button"
          className={`planner-bar-icon-btn ${moreOpen ? 'active' : ''}`}
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          aria-haspopup="menu"
          aria-label={t('nav.more', { defaultValue: '더보기' })}
          title={t('nav.more', { defaultValue: '더보기' })}
        >
          <span className="planner-bar-more-dots" aria-hidden>
            ⋯
          </span>
        </button>
        {moreOpen && (
          <div className="planner-more-menu" role="menu">
            {onNewTrip &&
              moreItem(t('trip.newTrip'), onNewTrip)}
            {plazaNavVisible &&
              moreItem(t('plazaNav'), () => navigate('/plaza'))}
            {moreItem(t('nav.setup'), () => navigate('/setup'))}
            {moreItem(t('nav.help'), () => navigate('/help'))}
            {onDeleteTrip && summaries.length > 0 && (
              <>
                <div className="planner-more-sep" aria-hidden />
                {moreItem(
                  t('trip.deleteTripMenu', { defaultValue: '여행 삭제' }),
                  onDeleteTrip,
                  true
                )}
              </>
            )}
          </div>
        )}
      </div>

      <AuthBar />
    </header>
  );
}
