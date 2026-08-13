import type { ReactNode } from 'react';
import { Icon } from './Icon';

export type PlannerPanelTab = 'search' | 'pins' | 'route' | 'scenario';

interface Props {
  open: boolean;
  tab: PlannerPanelTab;
  pinCount: number;
  onTabChange: (tab: PlannerPanelTab) => void;
  onCollapse: () => void;
  searchSlot: ReactNode;
  pinsSlot: ReactNode;
  routeSlot: ReactNode;
  scenarioSlot?: ReactNode;
}

const TAB_LABELS: Record<PlannerPanelTab, string> = {
  search: 'Search 검색',
  pins: 'Pins',
  route: 'Route 동선',
  scenario: 'AI 시나리오',
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
  scenarioSlot,
}: Props) {
  if (!open) return null;

  const tabs = scenarioSlot
    ? (['search', 'pins', 'route', 'scenario'] as const)
    : (['search', 'pins', 'route'] as const);

  return (
    <aside className="planner-side-panel desktop-only-overlay" aria-label="플래너 패널">
      <div className="planner-side-tabs">
        <div className="planner-side-tabs-track" role="tablist">
          {tabs.map((id) => (
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
        {tab === 'scenario' && scenarioSlot}
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
