import { useTranslation } from 'react-i18next';
import { reactionTone } from '../lib/placeReactions';
import type { PlaceReaction } from '../types/insights';

type Props = {
  reaction: PlaceReaction | null;
  className?: string;
};

/**
 * Reddit·YouTube·블로그에서 수집·분석된 언급을 장소 단위로 요약한 배지.
 * 별점(플랫폼 평점)과 달리 "무엇이 화제였는지"(혼잡·가격 등)를 함께 보여준다.
 */
export function PlaceReactionBadge({ reaction, className = '' }: Props) {
  const { t } = useTranslation('planner');
  if (!reaction) return null;

  const tone = reactionTone(reaction);
  const aspect = reaction.topAspects[0];
  const label = aspect
    ? t(`reactions.aspect.${aspect}`)
    : t(`reactions.tone.${tone}`);

  // i18next에서 count는 복수형 키 조회를 유발하므로 mentions로 넘긴다
  const title = t('reactions.tooltip', {
    mentions: reaction.mentionCount,
    positive: reaction.positiveCount,
    negative: reaction.negativeCount,
  });

  return (
    <span className={`place-reaction-badge is-${tone} ${className}`.trim()} title={title}>
      <span className="place-reaction-badge-label">{label}</span>
      <span className="place-reaction-badge-count">{reaction.mentionCount}</span>
    </span>
  );
}
