import type { SimpleCategory } from '../types';
import { getSimpleCategoryMeta } from './categories';

/** YouTube 추출 장소 후보 (카테고리는 지도 마커 테마와 동일 팔레트) */
export type YoutubePlaceCategory = Extract<
  SimpleCategory,
  'food' | 'cafe' | 'tour' | 'stay' | 'culture' | 'shop' | 'other'
>;

export interface YoutubePlaceCandidate {
  name: string;
  category: YoutubePlaceCategory;
}

const CATEGORY_SET = new Set<string>([
  'food',
  'cafe',
  'tour',
  'stay',
  'culture',
  'shop',
  'other',
]);

export function normalizeYoutubePlaceCategory(raw: unknown): YoutubePlaceCategory {
  if (typeof raw === 'string' && CATEGORY_SET.has(raw)) {
    return raw as YoutubePlaceCategory;
  }
  return 'tour';
}

/** 이름 휴리스틱 — API가 category를 안 줄 때·배포 전 폴백 */
export function guessYoutubePlaceCategory(name: string): YoutubePlaceCategory {
  const n = name.toLowerCase();
  if (
    /hotel|hostel|motel|resort|inn\b|숙소|호텔|모텔|게스트하우스|펜션|리조트|에어비앤비|airbnb|hanok stay/i.test(
      n
    )
  ) {
    return 'stay';
  }
  if (/cafe|coffee|카페|커피|스타벅스|투썸|베이커리|bakery|디저트/i.test(n)) {
    return 'cafe';
  }
  if (
    /restaurant|bbq|chicken|ramen|sushi|맛집|식당|음식|한식|중식|일식|분식|치킨|국수|고기|뷔페|food\b/i.test(
      n
    )
  ) {
    return 'food';
  }
  if (
    /museum|gallery|palace|temple|cathedral|박물관|미술관|전시|궁궐|사찰|성당|문화재|heritage/i.test(n)
  ) {
    return 'culture';
  }
  if (/mart|market|mall|outlet|백화점|마트|시장|쇼핑|이마트|코스트코|shopping/i.test(n)) {
    return 'shop';
  }
  if (/parking|주차/i.test(n)) {
    return 'other';
  }
  return 'tour';
}

export function normalizeYoutubePlaces(raw: unknown[]): YoutubePlaceCandidate[] {
  const seen = new Set<string>();
  const out: YoutubePlaceCandidate[] = [];
  for (const item of raw) {
    let name = '';
    let category: YoutubePlaceCategory | null = null;
    if (typeof item === 'string') {
      name = item.trim();
    } else if (item && typeof item === 'object' && 'name' in item) {
      name = String((item as { name: unknown }).name).trim();
      category = normalizeYoutubePlaceCategory((item as { category?: unknown }).category);
    }
    if (name.length < 2 || name.length > 80) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      name,
      category: category ?? guessYoutubePlaceCategory(name),
    });
    if (out.length >= 20) break;
  }
  return out;
}

export function youtubePlaceChipStyle(category: YoutubePlaceCategory): {
  background: string;
  color: string;
  borderColor: string;
} {
  const meta = getSimpleCategoryMeta(category);
  return {
    background: meta.bgColor,
    color: meta.iconColor,
    borderColor: meta.iconColor,
  };
}
