import type { Place, SearchCategoryFilter } from '../types';
import type { FoodRestriction } from '../types';

/** 검색 카테고리 하부 필터 ID */
export type SearchSubFilterId =
  | FoodRestriction
  | 'hotel'
  | 'motel'
  | 'hanok'
  | 'pension'
  | 'guesthouse'
  | 'beach'
  | 'nature'
  | 'museum'
  | 'park'
  | 'supermarket'
  | 'market'
  | 'convenience';

export interface SearchSubFilterOption {
  id: SearchSubFilterId;
  /** 칩 라벨 (시안처럼 EN + KO) */
  label: string;
  keywords: string[];
}

export interface SearchSubFilterGroup {
  categoryCode: NonNullable<SearchCategoryFilter>;
  /** 섹션 헤더 */
  label: string;
  options: SearchSubFilterOption[];
}

/** 카테고리별 하부 필터 (맛집 음식 제약 · 숙소 유형 등) */
export const SEARCH_SUB_FILTER_GROUPS: SearchSubFilterGroup[] = [
  {
    categoryCode: 'FD6',
    label: 'DIETARY 음식 제약',
    options: [
      {
        id: 'halal',
        label: 'Halal',
        keywords: ['할랄', 'halal', 'muslim', '이슬람'],
      },
      {
        id: 'vegetarian',
        label: 'Vegan',
        keywords: ['채식', 'vegetarian', 'vegan', '비건'],
      },
      {
        id: 'no_pork',
        label: 'No pork',
        keywords: ['돼지', 'no pork', 'pork-free'],
      },
    ],
  },
  {
    categoryCode: 'AD5',
    label: 'STAY TYPE 숙소 유형',
    options: [
      {
        id: 'hotel',
        label: 'Hotel 호텔',
        keywords: ['호텔', 'hotel', '리조트', 'resort'],
      },
      {
        id: 'motel',
        label: 'Motel 모텔',
        keywords: ['모텔', 'motel'],
      },
      {
        id: 'hanok',
        label: 'Hanok 한옥',
        keywords: ['한옥', 'hanok', '한옥모텔', '한옥호텔', '한옥스테이'],
      },
      {
        id: 'pension',
        label: 'Pension 펜션',
        keywords: ['펜션', 'pension'],
      },
      {
        id: 'guesthouse',
        label: 'Guesthouse 게스트하우스',
        keywords: ['게스트하우스', 'guesthouse', 'guest house', '호스텔', 'hostel'],
      },
    ],
  },
  {
    categoryCode: 'AT4',
    label: 'SIGHT TYPE 관광 유형',
    options: [
      {
        id: 'beach',
        label: 'Beach 해변',
        keywords: ['해변', '해수욕', 'beach', '해안', '바다'],
      },
      {
        id: 'nature',
        label: 'Nature 자연',
        keywords: ['자연', '산', '오름', '폭포', '숲', 'nature', '트레킹', '등산'],
      },
      {
        id: 'museum',
        label: 'Museum 전시',
        keywords: ['박물관', '미술관', '전시', 'museum', 'gallery', '기념관'],
      },
      {
        id: 'park',
        label: 'Park 공원',
        keywords: ['공원', 'park', '테마파크', '놀이공원'],
      },
    ],
  },
  {
    categoryCode: 'MT1',
    label: 'SHOP TYPE 쇼핑 유형',
    options: [
      {
        id: 'supermarket',
        label: 'Mart 대형마트',
        keywords: [
          '대형마트',
          '대형슈퍼',
          '슈퍼마켓',
          'supermarket',
          '이마트',
          '홈플러스',
          '코스트코',
          '트레이더스',
          '하나로마트',
          '롯데마트',
          '농협',
        ],
      },
      {
        id: 'convenience',
        label: 'Convenience 편의점',
        keywords: [
          '편의점',
          'convenience',
          'cu',
          '씨유',
          'gs25',
          'gs 25',
          '지에스25',
          '세븐일레븐',
          '7-eleven',
          '7eleven',
          '이마트24',
          'emart24',
          '미니스톱',
          'ministop',
          '패밀리마트',
          'familymart',
          'family mart',
          '스토리웨이',
          'buy the way',
        ],
      },
      {
        id: 'market',
        label: 'Market 시장',
        keywords: ['시장', 'market', '전통시장', '재래시장'],
      },
    ],
  },
];

const GROUP_BY_CODE = new Map(
  SEARCH_SUB_FILTER_GROUPS.map((g) => [g.categoryCode, g])
);

export function getSearchSubFilterGroup(
  code: SearchCategoryFilter
): SearchSubFilterGroup | null {
  if (!code) return null;
  return GROUP_BY_CODE.get(code) ?? null;
}

function haystack(place: Pick<Place, 'name' | 'nameKo' | 'categoryDetail' | 'categoryLabel'>): string {
  return [place.name, place.nameKo, place.categoryDetail, place.categoryLabel]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** 선택된 하부 필터 중 하나라도 키워드 매칭되면 통과 (OR) */
export function placeMatchesSubFilters(
  place: Pick<
    Place,
    'name' | 'nameKo' | 'categoryDetail' | 'categoryLabel' | 'categoryCode'
  >,
  group: SearchSubFilterGroup,
  selectedIds: readonly string[] | undefined
): boolean {
  if (!selectedIds?.length) return true;
  const selected = group.options.filter((o) => selectedIds.includes(o.id));
  if (!selected.length) return true;
  const text = haystack(place);
  const code = place.categoryCode;
  return selected.some((opt) => {
    if (opt.id === 'convenience' && code === 'CS2') return true;
    if (opt.id === 'supermarket' && code === 'MT1') return true;
    return opt.keywords.some((kw) => text.includes(kw.toLowerCase()));
  });
}

export function filterPlacesBySubFilters<
  T extends Pick<
    Place,
    'name' | 'nameKo' | 'categoryDetail' | 'categoryLabel' | 'categoryCode'
  >,
>(
  places: T[],
  categoryCode: SearchCategoryFilter,
  selectedIds: readonly string[] | undefined
): T[] {
  const group = getSearchSubFilterGroup(categoryCode);
  if (!group || !selectedIds?.length) return places;
  return places.filter((p) => placeMatchesSubFilters(p, group, selectedIds));
}
