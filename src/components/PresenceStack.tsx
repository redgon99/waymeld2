import { useTranslation } from 'react-i18next';
import { presenceInitial, type PresenceViewer } from '../lib/tripPresence';

interface Props {
  viewers: PresenceViewer[];
  /** 아바타로 보여줄 최대 인원 — 넘치면 +N으로 접는다 */
  max?: number;
}

/** 같은 여행을 보고 있는 사람들의 아바타 스택 */
export function PresenceStack({ viewers, max = 4 }: Props) {
  const { t } = useTranslation('planner');
  if (viewers.length <= 1) return null;

  const shown = viewers.slice(0, max);
  const overflow = viewers.length - shown.length;

  return (
    <div
      className="presence-stack"
      title={t('presence.viewing', { n: viewers.length })}
      aria-label={t('presence.viewing', { n: viewers.length })}
    >
      {shown.map((v) => (
        <span
          key={v.id}
          className={`presence-avatar ${v.isSelf ? 'is-self' : ''}`}
          style={{ background: v.color }}
          title={v.isSelf ? t('presence.you', { name: v.name }) : v.name}
        >
          {presenceInitial(v.name)}
        </span>
      ))}
      {overflow > 0 && <span className="presence-avatar presence-more">+{overflow}</span>}
    </div>
  );
}
