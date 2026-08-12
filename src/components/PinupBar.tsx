import { Icon } from './Icon';
import { ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { GeneratedRoute, PinnedPlace, SimpleCategory } from '../types';
import { getCategoryMeta, DEFAULT_CODE_BY_SIMPLE_CATEGORY } from '../lib/categories';
import { groupPinnedByCategory, movePinnedPlace, truncatePinTitle } from '../lib/pinGroups';
import { SortableItem } from './Sortable';
import { PinExportMenu } from './PinExportMenu';
import { PinImportMenu } from './PinImportMenu';
import type { PinImportResult } from '../lib/importPins';

interface Props {
  pinned: PinnedPlace[];
  tripTitle?: string;
  currentDay?: number;
  totalDays?: number;
  pinnedByDay?: Record<number, PinnedPlace[]>;
  generatedRouteByDay?: Record<number, GeneratedRoute | null>;
  onExportNotify?: (message: string) => void;
  onUpgradeRequest?: () => void;
  onImportPins?: (result: PinImportResult) => void;
  mapCategoryFilter?: SimpleCategory | null;
  onToggleMapCategoryFilter?: (category: SimpleCategory) => void;
  mustVisitOnly?: boolean;
  onToggleMustVisitOnly?: () => void;
  onToggleRequired?: (id: string) => void;
  onShowTaxiCard?: (place: PinnedPlace) => void;
  onRemove: (id: string) => void;
  onReorder: (next: PinnedPlace[]) => void;
  onSelectPin?: (place: PinnedPlace) => void;
  selectedPinIds?: ReadonlySet<string>;
  onTogglePinSelection?: (id: string) => void;
  onClearAll?: () => void;
  onOpenRouteOptions: () => void;
  routeOptionsOpen: boolean;
  presentationMode?: boolean;
  onTogglePresentation?: () => void;
  variant?: 'default' | 'compact' | 'panel';
  hideTransferMenus?: boolean;
  hideHeader?: boolean;
}

function DroppableGroupChips({
  category,
  children,
}: {
  category: SimpleCategory;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `group-${category}` });
  return (
    <div
      ref={setNodeRef}
      className={`group-chips ${isOver ? 'group-chips-drop-over' : ''}`}
    >
      {children}
    </div>
  );
}

export function PinupBar({
  pinned,
  tripTitle: tripTitleProp,
  currentDay = 1,
  totalDays = 1,
  pinnedByDay = {},
  generatedRouteByDay,
  onExportNotify,
  onUpgradeRequest,
  onImportPins,
  mapCategoryFilter = null,
  onToggleMapCategoryFilter,
  mustVisitOnly = false,
  onToggleMustVisitOnly,
  onToggleRequired,
  onShowTaxiCard,
  onRemove,
  onReorder,
  onSelectPin,
  selectedPinIds = new Set(),
  onTogglePinSelection,
  onClearAll,
  onOpenRouteOptions,
  routeOptionsOpen,
  presentationMode = false,
  onTogglePresentation,
  variant = 'default',
  hideTransferMenus = false,
  hideHeader = false,
}: Props) {
  const { t } = useTranslation('planner');
  const { t: tc } = useTranslation('common');
  const tripTitle = tripTitleProp ?? t('export.tripName');
  const categoryLabel = (category: SimpleCategory) => tc(`category.${category}`);
  const compact = variant === 'compact';
  const panel = variant === 'panel';
  const [dragActive, setDragActive] = useState(false);
  const ids = pinned.map((p) => p.id);
  const selectionCount = selectedPinIds.size;
  const routeTargetCount = selectionCount > 0 ? selectionCount : pinned.length;
  const visiblePinned = mustVisitOnly ? pinned.filter((p) => p.required) : pinned;
  const groups = groupPinnedByCategory(visiblePinned, dragActive);
  const transferMenus = hideTransferMenus ? null : onImportPins ? (
    <div className="pin-transfer-actions">
      <PinImportMenu
        currentDay={currentDay}
        totalDays={totalDays}
        pinnedByDay={pinnedByDay}
        onImport={onImportPins}
        onNotify={onExportNotify}
      />
      <PinExportMenu
        tripTitle={tripTitle}
        currentDay={currentDay}
        totalDays={totalDays}
        pinnedByDay={pinnedByDay}
        generatedRouteByDay={generatedRouteByDay}
        onNotify={onExportNotify}
        onUpgradeRequest={onUpgradeRequest}
      />
    </div>
  ) : (
    <PinExportMenu
      tripTitle={tripTitle}
      currentDay={currentDay}
      totalDays={totalDays}
      pinnedByDay={pinnedByDay}
      generatedRouteByDay={generatedRouteByDay}
      onNotify={onExportNotify}
      onUpgradeRequest={onUpgradeRequest}
    />
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(_event: DragStartEvent) {
    setDragActive(true);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDragActive(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const next = movePinnedPlace(pinned, String(active.id), String(over.id));
    onReorder(next);
  }

  function handleDragCancel() {
    setDragActive(false);
  }

  const presentationBtn =
    pinned.length > 0 && onTogglePresentation ? (
      <button
        type="button"
        className={`pinup-presentation-btn ${presentationMode ? 'active' : ''}`}
        onClick={onTogglePresentation}
        title={
          presentationMode ? t('pinup.presentationExitTitle') : t('pinup.presentation')
        }
        aria-pressed={presentationMode}
        aria-label={
          presentationMode ? t('pinup.presentationExit') : t('pinup.presentation')
        }
      >
        <Icon name={presentationMode ? 'minimize' : 'presentation'} />
      </button>
    ) : null;

  if (pinned.length === 0) {
    return (
      <div
        className={`pinup-bar empty ${panel ? 'pinup-bar-panel' : ''} ${presentationMode ? 'presentation-active' : ''}`}
      >
        <Icon name="pin" />
        <span>{t('trip.emptyPins')}</span>
        {transferMenus}
      </div>
    );
  }

  const groupsContent = (
    <div className="pinup-groups">
      {groups.map((group) => {
        const label = categoryLabel(group.category);
        const headMeta = getCategoryMeta(
          group.items[0]?.categoryCode ?? DEFAULT_CODE_BY_SIMPLE_CATEGORY[group.category],
        );
        return (
          <section
            key={group.category}
            className={`pinup-group ${group.items.length === 0 ? 'pinup-group-empty' : ''}`}
            aria-label={label}
          >
            <div className="pinup-group-row">
              <div className="pinup-group-head">
                <button
                  type="button"
                  className={`group-icon group-icon-toggle ${mapCategoryFilter === group.category ? 'active' : ''}`}
                  style={{ background: headMeta.bgColor, color: headMeta.iconColor }}
                  onClick={() => onToggleMapCategoryFilter?.(group.category)}
                  title={
                    mapCategoryFilter === group.category
                      ? t('pinup.filterClear', { label })
                      : t('pinup.filterOnly', { label })
                  }
                  aria-pressed={mapCategoryFilter === group.category}
                >
                  <Icon name={headMeta.icon} />
                </button>
                <span className="group-label">{label}</span>
                <span className="group-count">{group.items.length}</span>
              </div>
              <DroppableGroupChips category={group.category}>
                {group.items.map((p) => {
                  const meta = getCategoryMeta(p.categoryCode);
                  const borderColor = meta.bgColor;
                  const isSelected = selectedPinIds.has(p.id);
                  return (
                    <SortableItem key={p.id} id={p.id}>
                      {({ listeners, setActivatorNodeRef, isDragging }) => (
                        <div
                          className={`pin-chip ${isDragging ? 'dragging' : ''} ${isSelected ? 'is-selected' : ''}`}
                          style={{
                            borderColor,
                            boxShadow: isSelected
                              ? `0 0 0 2px var(--color-primary), 0 0 0 3px ${borderColor}55`
                              : `0 0 0 1px ${borderColor}40`,
                          }}
                          title={p.name}
                        >
                          <span
                            ref={setActivatorNodeRef}
                            {...listeners}
                            className="chip-order chip-drag"
                            style={{
                              background: `${borderColor}22`,
                              color: meta.iconColor,
                            }}
                            title={t('pinup.dragOrder')}
                          >
                            {p.order}
                          </span>
                          {onToggleRequired && (
                            <button
                              type="button"
                              className={`chip-required ${p.required ? 'active' : ''}`}
                              onClick={() => onToggleRequired(p.id)}
                              title={p.required ? t('pinup.unmarkRequired') : t('pinup.markRequired')}
                              aria-pressed={!!p.required}
                            >
                              <Icon name="flag" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="chip-body"
                            aria-pressed={isSelected}
                            onClick={() => {
                              onTogglePinSelection?.(p.id);
                              onSelectPin?.(p);
                            }}
                            onDoubleClick={() => onSelectPin?.(p)}
                          >
                            <span className="chip-name">{truncatePinTitle(p.name)}</span>
                            {p.rating !== undefined && (
                              <span className="chip-rating">
                                <Icon name="star" />
                                {p.rating.toFixed(1)}
                              </span>
                            )}
                          </button>
                          {onShowTaxiCard && (
                            <button
                              type="button"
                              className="chip-taxi"
                              onClick={() => onShowTaxiCard(p)}
                              title={t('taxi.showCard')}
                              aria-label={t('taxi.showCard')}
                            >
                              <Icon name="transportCar" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="chip-delete"
                            onClick={() => onRemove(p.id)}
                            aria-label={t('pinup.removePin', { name: p.name })}
                          >
                            <Icon name="close" />
                          </button>
                        </div>
                      )}
                    </SortableItem>
                  );
                })}
              </DroppableGroupChips>
            </div>
          </section>
        );
      })}
    </div>
  );

  return (
    <div className={`pinup-bar ${presentationMode ? 'presentation-active' : ''} ${compact ? 'pinup-bar-compact' : ''} ${panel ? 'pinup-bar-panel' : ''}`}>
      {!hideHeader && !panel && (
      <div className="pinup-header">
        <div className="pinup-title-block">
          <Icon name="pin" />
          <span className="pinup-title">
            {compact ? t('pinup.titleShort') : t('pinup.title')}
          </span>
          <span className="pinup-count">{pinned.length}</span>
          {presentationBtn}
        </div>
        {!compact && (
          <span className="pinup-hint">
            {selectionCount > 0
              ? t('pinup.hintSelection', { count: selectionCount })
              : t('pinup.hintDefault')}
          </span>
        )}
        {onToggleMustVisitOnly && pinned.some((p) => p.required) && !compact && (
          <button
            type="button"
            className={`pinup-must-visit-btn ${mustVisitOnly ? 'active' : ''}`}
            onClick={onToggleMustVisitOnly}
            aria-pressed={mustVisitOnly}
          >
            <Icon name="flag" /> {t('pinup.mustVisitOnly')}
          </button>
        )}
        {onClearAll && pinned.length > 0 && !compact && (
          <button type="button" className="pinup-clear-btn" onClick={onClearAll}>
            {t('pinup.clearAll')}
          </button>
        )}
        {transferMenus}
        <button
          className={`route-cta ${routeOptionsOpen ? 'active' : ''}`}
          onClick={onOpenRouteOptions}
          disabled={routeTargetCount < 2}
          title={
            selectionCount > 0
              ? t('pinup.routeTitleSelected', { count: selectionCount })
              : t('pinup.routeTitleAll')
          }
        >
          <Icon name="route" />
          {compact
            ? t('pinup.routeCtaShort')
            : selectionCount > 0
              ? t('pinup.routeCtaCount', { count: selectionCount })
              : t('pinup.routeCta')}
        </button>
      </div>
      )}

      {panel ? (
        <>
          <div className="pinup-panel-scroll">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              <SortableContext items={ids} strategy={verticalListSortingStrategy}>
                {groupsContent}
              </SortableContext>
            </DndContext>
          </div>
          <div className="pinup-panel-footer">
            <button
              type="button"
              className={`route-cta panel-route-cta ${routeOptionsOpen ? 'active' : ''}`}
              onClick={onOpenRouteOptions}
              disabled={routeTargetCount < 2}
            >
              Set up route · 동선 만들기 →
            </button>
          </div>
        </>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext items={ids} strategy={horizontalListSortingStrategy}>
            {groupsContent}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
