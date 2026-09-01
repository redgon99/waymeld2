import type { Place } from '../types';
import { searchPlacesByCategory } from './kakao';
import { enrichPlacesWithStats } from './placeStats';
import { DEFAULT_CODE_BY_SIMPLE_CATEGORY } from './categories';

export interface NearbyRankingEntry extends Place {
  rating: number;
  reviewCount: number;
  score: number;
}

export interface NearbyRankingResult {
  entries: NearbyRankingEntry[];
  /** 대상 장소의 순위 (1부터) — 리뷰가 없어 채점 불가하면 null */
  currentRank: number | null;
}

const RANKING_RADIUS_M = 1000;
const RANKING_POOL_SIZE = 15;

/** 평점 자체보다 후기 수가 받쳐줄수록 신뢰도가 높다고 보고 가중 */
function rankScore(rating: number, reviewCount: number): number {
  return rating * Math.log10(reviewCount + 1);
}

/**
 * 카카오맵 공식 랭킹(비공개 API, 개별 장소 응답엔 포함 여부만 있고 순위·목록이 없음) 대신,
 * 카카오 지도 SDK의 공식 카테고리 검색 + 평점/후기수로 앱 자체 인근 랭킹을 계산한다.
 */
export async function computeNearbyRanking(
  place: Place
): Promise<NearbyRankingResult | null> {
  const categoryGroupCode =
    place.categoryCode !== 'OTHER'
      ? place.categoryCode
      : DEFAULT_CODE_BY_SIMPLE_CATEGORY[place.category];
  if (!categoryGroupCode || categoryGroupCode === 'OTHER') return null;

  let pool: Place[];
  try {
    const result = await searchPlacesByCategory({
      categoryGroupCode,
      center: { lat: place.lat, lng: place.lng },
      radiusMeters: RANKING_RADIUS_M,
      size: RANKING_POOL_SIZE,
    });
    pool = result.places;
  } catch {
    return null;
  }

  if (!pool.some((p) => p.id === place.id)) {
    pool = [place, ...pool];
  }

  const enriched = await enrichPlacesWithStats(pool);
  const entries = enriched
    .filter(
      (p): p is Place & { rating: number; reviewCount: number } =>
        typeof p.rating === 'number' && (p.reviewCount ?? 0) > 0
    )
    .map((p) => ({ ...p, score: rankScore(p.rating, p.reviewCount) }))
    .sort((a, b) => b.score - a.score);

  if (entries.length === 0) return null;

  const currentIndex = entries.findIndex((p) => p.id === place.id);
  return {
    entries,
    currentRank: currentIndex >= 0 ? currentIndex + 1 : null,
  };
}
