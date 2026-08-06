import { Icon } from '../Icon';

export type MobileDockTab = 'search' | 'pins' | null;

interface Props {
  activeSheet: MobileDockTab;
  pinCount: number;
  routeDisabled: boolean;
  onOpenSearch: () => void;
  onOpenPins: () => void;
  onOpenRoute: () => void;
  onPinFromMap: () => void;
  pickingPinFromMap?: boolean;
}

export function MobileDock({
  activeSheet,
  pinCount,
  routeDisabled,
  onOpenSearch,
  onOpenPins,
  onOpenRoute,
  onPinFromMap,
  pickingPinFromMap = false,
}: Props) {
  return (
    <nav className="mobile-dock" aria-label="주요 메뉴">
      <button
        type="button"
        className={`mobile-dock-btn ${activeSheet === 'search' ? 'active' : ''}`}
        onClick={onOpenSearch}
        aria-pressed={activeSheet === 'search'}
      >
        <Icon name="search" size={18} />
        <span>검색</span>
      </button>
      <button
        type="button"
        className={`mobile-dock-btn ${activeSheet === 'pins' ? 'active' : ''}`}
        onClick={onOpenPins}
        aria-pressed={activeSheet === 'pins'}
      >
        <Icon name="pin" size={18} />
        <span>핀 {pinCount > 0 ? pinCount : ''}</span>
      </button>
      <button
        type="button"
        className="mobile-dock-btn mobile-dock-route"
        onClick={onOpenRoute}
        disabled={routeDisabled}
        title={routeDisabled ? '핀 2개 이상 필요' : '동선 만들기'}
      >
        <Icon name="route" size={18} />
        <span>동선</span>
      </button>
      <button
        type="button"
        className={`mobile-dock-fab ${pickingPinFromMap ? 'active' : ''}`}
        onClick={onPinFromMap}
        aria-pressed={pickingPinFromMap}
        aria-label="지도에서 핀업"
        title="지도에서 핀업"
      >
        <Icon name="pinPlus" size={22} />
      </button>
    </nav>
  );
}
