import { getSupabase, isSupabaseConfigured } from './supabase';
import { placeKey, placeKeyCandidates } from './placeKey';
import type { Place } from '../types';
import type { PlaceReaction, PlaceReactionAspect } from '../types/insights';

/** 배지를 띄우기에 근거가 너무 얇은 장소는 숨긴다 */
const MIN_MENTIONS = 3;

const ASPECTS: PlaceReactionAspect[] = [
  'crowd',
  'price',
  'access',
  'food',
  'view',
  'service',
  'facility',
];

/** place_key → 조회 결과. null은 "조회했지만 없음"이라 재요청하지 않는다 */
const cache = new Map<string, PlaceReaction | null>();

export function isPlaceReactionsConfigured(): boolean {
  return isSupabaseConfigured;
}

function mapRow(row: Record<string, unknown>): PlaceReaction {
  const aspects = ((row.top_aspects as string[] | null) ?? []).filter((a): a is PlaceReactionAspect =>
    ASPECTS.includes(a as PlaceReactionAspect),
  );
  return {
    placeKey: row.place_key as string,
    placeName: row.place_name as string,
    placeContentId: (row.place_content_id as string | null) ?? null,
    mentionCount: (row.mention_count as number) ?? 0,
    positiveCount: (row.positive_count as number) ?? 0,
    neutralCount: (row.neutral_count as number) ?? 0,
    negativeCount: (row.negative_count as number) ?? 0,
    topAspects: aspects,
    updatedAt: (row.updated_at as string) ?? '',
  };
}

/** 검색 결과 전체에 대해 한 번에 조회 — 카드마다 요청하지 않는다 */
export async function loadPlaceReactions(places: Place[]): Promise<void> {
  if (!isSupabaseConfigured || places.length === 0) return;

  const wanted = new Set<string>();
  for (const place of places) {
    for (const key of placeKeyCandidates(place.name, place.nameKo)) {
      if (!cache.has(key)) wanted.add(key);
    }
  }
  if (wanted.size === 0) return;

  const keys = [...wanted];
  const sb = getSupabase();
  if (!sb) return;

  const { data, error } = await sb
    .from('place_reactions')
    .select('*')
    .in('place_key', keys)
    .gte('mention_count', MIN_MENTIONS);

  // 배지는 부가 정보라 실패해도 조용히 넘어간다 (캐시에 남기지 않아 다음 검색에서 재시도)
  if (error) return;

  for (const key of keys) cache.set(key, null);
  for (const row of data ?? []) {
    const mapped = mapRow(row as Record<string, unknown>);
    cache.set(mapped.placeKey, mapped);
  }
}

export function getPlaceReaction(place: Place): PlaceReaction | null {
  for (const key of placeKeyCandidates(place.name, place.nameKo)) {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  return null;
}

export function getPlaceReactionByName(name: string): PlaceReaction | null {
  return cache.get(placeKey(name)) ?? null;
}

export type ReactionTone = 'positive' | 'mixed' | 'negative';

export function reactionTone(reaction: PlaceReaction): ReactionTone {
  const { positiveCount, negativeCount, mentionCount } = reaction;
  if (positiveCount >= negativeCount * 2 && positiveCount / mentionCount >= 0.5) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'mixed';
}
