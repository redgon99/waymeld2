import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../Icon';
import { MobileSheet } from './MobileSheet';
import { DayTabs } from '../DayTabs';
import { PinupBar } from '../PinupBar';
import { PinImportMenu } from '../PinImportMenu';
import { PinExportMenu } from '../PinExportMenu';
import { TripBar } from '../TripBar';
import { ThemePreferenceChips } from '../ThemePreferenceChips';
import { FoodRestrictionChips } from '../FoodRestrictionChips';
import { pathWithLocale, normalizeLocale } from '../../lib/locale';
import i18n from '../../lib/i18n';
import type { Trip, TripSummary } from '../../lib/trips';
import type { PinImportResult } from '../../lib/importPins';
import type { PinnedPlace, SimpleCategory, TripTheme, FoodRestriction } from '../../types';
import { Link } from 'react-router-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  trip: Trip;
  tripSummaries?: TripSummary[];
  onTitleChange?: (title: string) => void;
  onSelectTrip?: (tripId: string) => void;
  pinned: PinnedPlace[];
  countsByDay: Record<number, number>;
  currentDay: number;
  routeOptionsOpen: boolean;
  onSelectDay: (day: number) => void;
  onAddDay: () => void;
  onRemoveDay: (day: number) => void;
  onOpenRoute: () => void;
  onOpenMaterials?: () => void;
  materialsCount?: number;
  onNewTrip?: () => void;
  onDeleteTrip?: () => void;
  onClearAll?: () => void;
  onImportPins?: (result: PinImportResult) => void;
  onExportNotify?: (message: string) => void;
  onUpgradeRequest?: () => void;
  mapCategoryFilter?: SimpleCategory | null;
  onToggleMapCategoryFilter?: (category: SimpleCategory) => void;
  onRemove: (id: string) => void;
  onReorder: (next: PinnedPlace[]) => void;
  onSelectPin?: (place: PinnedPlace) => void;
  selectedPinIds?: ReadonlySet<string>;
  onTogglePinSelection?: (id: string) => void;
  presentationMode?: boolean;
  onTogglePresentation?: () => void;
  mustVisitOnly?: boolean;
  onToggleMustVisitOnly?: () => void;
  onToggleRequired?: (id: string) => void;
  preferences?: TripTheme[];
  onPreferencesChange?: (next: TripTheme[]) => void;
  foodRestrictions?: FoodRestriction[];
  onFoodRestrictionsChange?: (next: FoodRestriction[]) => void;
}

export function MobilePinSheet({
  open,
  onClose,
  trip,
  tripSummaries = [],
  onTitleChange,
  onSelectTrip,
  pinned,
  countsByDay,
  currentDay,
  routeOptionsOpen,
  onSelectDay,
  onAddDay,
  onRemoveDay,
  onOpenRoute,
  onOpenMaterials,
  materialsCount = 0,
  onNewTrip,
  onDeleteTrip,
  onClearAll,
  onImportPins,
  onExportNotify,
  onUpgradeRequest,
  mapCategoryFilter,
  onToggleMapCategoryFilter,
  onRemove,
  onReorder,
  onSelectPin,
  selectedPinIds,
  onTogglePinSelection,
  presentationMode,
  onTogglePresentation,
  mustVisitOnly,
  onToggleMustVisitOnly,
  onToggleRequired,
  preferences = [],
  onPreferencesChange,
  foodRestrictions = [],
  onFoodRestrictionsChange,
}: Props) {
  const locale = normalizeLocale(i18n.language);
  const { t } = useTranslation('planner');
  const { t: tc } = useTranslation('common');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const handleRoute = () => {
    onOpenRoute();
    onClose();
  };

  return (
    <MobileSheet open={open} onClose={onClose} height="medium">
      <div className="mobile-pin-sheet">
        <div className="mobile-pin-sheet-header">
          <DayTabs
            compact
            totalDays={trip.totalDays}
            currentDay={currentDay}
            countsByDay={countsByDay}
            onSelect={onSelectDay}
            onAddDay={onAddDay}
            onRemoveDay={onRemoveDay}
          />
          <div className="mobile-pin-sheet-actions">
            <span className="mobile-pin-count">{t('pinup.pinCount', { count: pinned.length })}</span>
            <div className="mobile-pin-overflow" ref={menuRef}>
              <button
                type="button"
                className="mobile-pin-overflow-btn"
                onClick={() => setMenuOpen((v) => !v)}
                aria-expanded={menuOpen}
                aria-label={tc('more')}
              >
                ⋯
              </button>
              {menuOpen && (
                <div className="mobile-pin-overflow-menu" role="menu">
                  {onOpenMaterials && (
                    <button type="button" role="menuitem" onClick={() => { onOpenMaterials(); setMenuOpen(false); }}>
                      {t('trip.materials')}
                      {materialsCount > 0 ? ` (${materialsCount})` : ''}
                    </button>
                  )}
                  {onNewTrip && (
                    <button type="button" role="menuitem" onClick={() => { onNewTrip(); setMenuOpen(false); }}>
                      +{t('trip.newTrip')}
                    </button>
                  )}
                  {onDeleteTrip && (
                    <button
                      type="button"
                      role="menuitem"
                      className="mobile-pin-menu-delete"
                      onClick={() => { onDeleteTrip(); setMenuOpen(false); }}
                    >
                      {t('trip.deleteTripMenu')}
                    </button>
                  )}
                  {onClearAll && pinned.length > 0 && (
                    <button type="button" role="menuitem" onClick={() => { onClearAll(); setMenuOpen(false); }}>
                      {t('pinup.clearAll')}
                    </button>
                  )}
                  {onImportPins && (
                    <div className="mobile-pin-overflow-import" role="none">
                      <PinImportMenu
                        currentDay={currentDay}
                        totalDays={trip.totalDays}
                        pinnedByDay={trip.pinnedByDay}
                        onImport={onImportPins}
                        onNotify={(msg) => {
                          onExportNotify?.(msg);
                          setMenuOpen(false);
                        }}
                        label={t('trip.import')}
                      />
                    </div>
                  )}
                  <div className="mobile-pin-overflow-export" role="none">
                    <PinExportMenu
                      tripTitle={trip.title}
                      currentDay={currentDay}
                      totalDays={trip.totalDays}
                      pinnedByDay={trip.pinnedByDay}
                      onNotify={onExportNotify}
                      onUpgradeRequest={onUpgradeRequest}
                    />
                  </div>
                </div>
              )}
            </div>
            <button
              type="button"
              className="mobile-pin-route-btn"
              onClick={handleRoute}
              disabled={pinned.length < 2}
            >
              <Icon name="route" size={16} />
              {t('pinup.routeCtaShort')}
            </button>
          </div>
        </div>
        {onTitleChange && onSelectTrip && (
          <div className="mobile-pin-sheet-trip-bar">
            <TripBar
              variant="compact"
              hideActions
              trip={trip}
              summaries={tripSummaries}
              onTitleChange={onTitleChange}
              onSelectTrip={onSelectTrip}
              onDeleteTrip={onDeleteTrip}
            />
          </div>
        )}
        {onPreferencesChange && (
          <div className="mobile-pin-preferences">
            <ThemePreferenceChips
              selected={preferences}
              onChange={onPreferencesChange}
              compact
            />
            {onFoodRestrictionsChange && (
              <FoodRestrictionChips
                selected={foodRestrictions}
                onChange={onFoodRestrictionsChange}
              />
            )}
          </div>
        )}
        <nav className="mobile-plan-nav" aria-label={t('nav.setup')}>
          <Link to={pathWithLocale('/setup', locale)}>{t('nav.setup')}</Link>
          <Link to={pathWithLocale('/help', locale)}>{t('nav.help')}</Link>
          <Link to={pathWithLocale('/themes', locale)}>{t('nav.themes')}</Link>
        </nav>
        <PinupBar
          variant="compact"
          pinned={pinned}
          tripTitle={trip.title}
          currentDay={currentDay}
          totalDays={trip.totalDays}
          pinnedByDay={trip.pinnedByDay}
          mapCategoryFilter={mapCategoryFilter}
          onToggleMapCategoryFilter={onToggleMapCategoryFilter}
          onRemove={onRemove}
          onReorder={onReorder}
          onSelectPin={onSelectPin}
          selectedPinIds={selectedPinIds}
          onTogglePinSelection={onTogglePinSelection}
          onOpenRouteOptions={handleRoute}
          routeOptionsOpen={routeOptionsOpen}
          presentationMode={presentationMode}
          onTogglePresentation={onTogglePresentation}
          hideTransferMenus
          hideHeader
          mustVisitOnly={mustVisitOnly}
          onToggleMustVisitOnly={onToggleMustVisitOnly}
          onToggleRequired={onToggleRequired}
        />
      </div>
    </MobileSheet>
  );
}
