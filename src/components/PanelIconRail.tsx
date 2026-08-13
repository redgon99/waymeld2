import { Icon } from './Icon';
import type { PlannerPanelTab } from './PlannerSidePanel';

interface Props {
  visible: boolean;
  pinCount: number;
  activeTab?: PlannerPanelTab | null;
  onOpen: (tab: PlannerPanelTab) => void;
}

export function PanelIconRail({ visible, pinCount, activeTab, onOpen }: Props) {
  if (!visible) return null;

  return (
    <nav className="planner-icon-rail desktop-only-overlay" aria-label="패널 바로가기">
      <button
        type="button"
        className={`planner-rail-btn ${activeTab === 'search' ? 'active' : ''}`}
        onClick={() => onOpen('search')}
        title="Search 검색"
        aria-label="검색 열기"
      >
        <Icon name="search" size={18} />
      </button>
      <button
        type="button"
        className={`planner-rail-btn ${activeTab === 'pins' ? 'active' : ''}`}
        onClick={() => onOpen('pins')}
        title="Pins 핀"
        aria-label="핀 목록 열기"
      >
        <Icon name="pin" size={18} />
        {pinCount > 0 && <span className="planner-rail-badge">{pinCount}</span>}
      </button>
      <button
        type="button"
        className={`planner-rail-btn ${activeTab === 'route' ? 'active' : ''}`}
        onClick={() => onOpen('route')}
        title="Route 동선"
        aria-label="동선 열기"
      >
        <Icon name="route" size={18} />
      </button>
      <button
        type="button"
        className={`planner-rail-btn ${activeTab === 'scenario' ? 'active' : ''}`}
        onClick={() => onOpen('scenario')}
        title="AI 시나리오"
        aria-label="테마 여행 시나리오 열기"
      >
        <Icon name="sparkles" size={18} />
      </button>
    </nav>
  );
}
