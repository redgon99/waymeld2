import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('planner');
  return (
    <nav className="mobile-dock" aria-label={t('chrome.dockAria')}>
      <button
        type="button"
        className={`mobile-dock-btn ${activeSheet === 'search' ? 'active' : ''}`}
        onClick={onOpenSearch}
        aria-pressed={activeSheet === 'search'}
      >
        <Icon name="search" size={18} />
        <span>{t('chrome.tabSearch')}</span>
      </button>
      <button
        type="button"
        className={`mobile-dock-btn ${activeSheet === 'pins' ? 'active' : ''}`}
        onClick={onOpenPins}
        aria-pressed={activeSheet === 'pins'}
      >
        <Icon name="pin" size={18} />
        <span>{pinCount > 0 ? t('chrome.tabPins', { count: pinCount }) : t('pinup.titleShort')}</span>
      </button>
      <button
        type="button"
        className="mobile-dock-btn mobile-dock-route"
        onClick={onOpenRoute}
        disabled={routeDisabled}
        title={routeDisabled ? t('chrome.routeNeedPins') : t('chrome.routeBuild')}
      >
        <Icon name="route" size={18} />
        <span>{t('chrome.tabRoute')}</span>
      </button>
      <button
        type="button"
        className={`mobile-dock-fab ${pickingPinFromMap ? 'active' : ''}`}
        onClick={onPinFromMap}
        aria-pressed={pickingPinFromMap}
        aria-label={t('chrome.pinFromMap')}
        title={t('chrome.pinFromMap')}
      >
        <Icon name="pinPlus" size={22} />
      </button>
    </nav>
  );
}
