import { Icon } from './Icon';
import { useTranslation } from 'react-i18next';
import { formatTime } from '../lib/format';
import { normalizeLocale } from '../lib/locale';
import i18n from '../lib/i18n';

export type SaveStatus = 'local' | 'cloud' | 'syncing' | 'guest';

interface Props {
  status: SaveStatus;
  lastSavedAt?: number | null;
  onGuestClick?: () => void;
}

function formatSavedAt(ts: number): string {
  return formatTime(ts, { hour: '2-digit', minute: '2-digit' }, normalizeLocale(i18n.language));
}

const ICONS: Record<SaveStatus, 'save' | 'cloudOk' | 'loader' | 'cloud'> = {
  local: 'save',
  cloud: 'cloudOk',
  syncing: 'loader',
  guest: 'cloud',
};

export function SaveStatusBadge({ status, lastSavedAt, onGuestClick }: Props) {
  const { t } = useTranslation('planner');
  const labels: Record<SaveStatus, string> = {
    local: t('save.local'),
    cloud: t('save.saved'),
    syncing: t('save.saving'),
    guest: t('save.pending'),
  };
  const clickable = status === 'guest' && !!onGuestClick;
  return (
    <div
      className={`save-status-badge save-status-${status}${clickable ? ' save-status-clickable' : ''}`}
      title={lastSavedAt ? `마지막 저장 ${formatSavedAt(lastSavedAt)}` : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onGuestClick : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onGuestClick?.();
              }
            }
          : undefined
      }
    >
      <Icon name={ICONS[status]} spin={status === 'syncing'} size={14} />
      <span>{labels[status]}</span>
      {status !== 'syncing' && lastSavedAt != null && (
        <span className="save-status-time">{formatSavedAt(lastSavedAt)}</span>
      )}
    </div>
  );
}
