import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type PlannerPanelTab = 'search' | 'pins' | 'route';

interface Props {
  open: boolean;
  tab: PlannerPanelTab;
  pinCount: number;
  onTabChange: (tab: PlannerPanelTab) => void;
  onCollapse: () => void;
  searchSlot: ReactNode;
  pinsSlot: ReactNode;
  routeSlot: ReactNode;
}

const TAB_LABELS: Record<PlannerPanelTab, string> = {
  search: 'Search 검색',
  pins: 'Pins',
  route: 'Route 동선',
};

export function PlannerSidePanel({
  open,
  tab,
  pinCount,
  onTabChange,
  onCollapse,
  searchSlot,
  pinsSlot,
  routeSlot,
}: Props) {
  if (!open) return null;

  return (
    <aside className="planner-side-panel desktop-only-overlay" aria-label="플래너 패널">
      <div className="planner-side-tabs">
        <div className="planner-side-tabs-track" role="tablist">
          {(['search', 'pins', 'route'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`planner-side-tab ${tab === id ? 'active' : ''}`}
              onClick={() => onTabChange(id)}
            >
              {id === 'pins' ? `Pins 핀 ${pinCount}` : TAB_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="planner-side-body">
        {tab === 'search' && searchSlot}
        {tab === 'pins' && pinsSlot}
        {tab === 'route' && routeSlot}
      </div>

      <button
        type="button"
        className="planner-side-collapse"
        onClick={onCollapse}
        aria-label="패널 접기"
        title="패널 접기"
      >
        <Icon name="chevronLeft" size={16} />
      </button>
    </aside>
  );
}
