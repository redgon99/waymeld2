import type { FoodRestriction, SimpleCategory } from '../types';

const RESTRICTION_KEYWORDS: Record<FoodRestriction, string[]> = {
  halal: ['할랄', 'halal', 'muslim', '이슬람'],
  vegetarian: ['채식', 'vegetarian', 'vegan', '비건'],
  no_spicy: ['순한', '안맵', '안 매', 'mild', 'not spicy'],
  no_pork: ['돼지', 'no pork', 'pork-free'],
  gluten_free: ['글루텐', 'gluten', 'gluten-free'],
};

function haystack(place: {
  name: string;
  nameKo?: string;
  categoryDetail?: string;
  note?: string;
  categoryLabel?: string;
}): string {
  return [
    place.name,
    place.nameKo,
    place.categoryDetail,
    place.categoryLabel,
    place.note,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

/** 음식 제약이 있을 때 장소가 필터를 통과하는지 */
export function placeMatchesFoodRestrictions(
  place: {
    category: SimpleCategory;
    name: string;
    nameKo?: string;
    categoryDetail?: string;
    note?: string;
    categoryLabel?: string;
  },
  restrictions: FoodRestriction[] | undefined
): boolean {
  if (!restrictions?.length) return true;
  if (place.category !== 'food' && place.category !== 'cafe') return true;

  const text = haystack(place);
  return restrictions.some((r) =>
    RESTRICTION_KEYWORDS[r].some((kw) => text.includes(kw.toLowerCase()))
  );
}

export function filterPlacesByFoodRestrictions<T extends {
  category: SimpleCategory;
  name: string;
  nameKo?: string;
  categoryDetail?: string;
  note?: string;
  categoryLabel?: string;
}>(places: T[], restrictions: FoodRestriction[] | undefined): T[] {
  if (!restrictions?.length) return places;
  return places.filter((p) => placeMatchesFoodRestrictions(p, restrictions));
}
