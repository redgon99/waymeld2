import { Icon } from '../Icon';
import { PwaInstallButton } from '../PwaInstallButton';
import { SaveStatusBadge, type SaveStatus } from '../SaveStatusBadge';

interface Props {
  onOpenSearch: () => void;
  tripTitle?: string;
  saveStatus: SaveStatus;
  lastSavedAt?: number | null;
  onGuestSaveClick?: () => void;
}

export function MobileTopBar({
  onOpenSearch,
  tripTitle,
  saveStatus,
  lastSavedAt,
  onGuestSaveClick,
}: Props) {
  return (
    <header className="mobile-top-bar">
      <button type="button" className="mobile-search-pill" onClick={onOpenSearch}>
        <Icon name="search" size={18} />
        <span className="mobile-search-pill-text">
          <span className="mobile-search-pill-label">장소 검색</span>
          {tripTitle && (
            <span className="mobile-search-pill-trip" title={tripTitle}>
              {tripTitle}
            </span>
          )}
        </span>
      </button>
      <div className="mobile-save-status">
        <SaveStatusBadge
          status={saveStatus}
          lastSavedAt={lastSavedAt}
          onGuestClick={onGuestSaveClick}
        />
      </div>
      <PwaInstallButton className="mobile-pwa-install" />
    </header>
  );
}
