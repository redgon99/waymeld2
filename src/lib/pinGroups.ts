import type { PinnedPlace, SimpleCategory } from '../types';
import { applySimpleCategory, DEFAULT_CODE_BY_SIMPLE_CATEGORY, getCategoryMeta } from './categories';
import { arrayMove } from '@dnd-kit/sortable';

const GROUP_ORDER: SimpleCategory[] = [
  'food',
  'cafe',
  'tour',
  'culture',
  'shop',
  'beauty',
  'market',
  'transport',
  'road',
  'stay',
  'other',
];

export interface PinCategoryGroup {
  category: SimpleCategory;
  label: string;
  items: PinnedPlace[];
}

/** 방문 순서를 유지한 채 카테고리별로 묶어 표시 (빈 카테고리 포함) */
export function groupPinnedByCategory(
  pinned: PinnedPlace[],
  includeEmpty = false,
): PinCategoryGroup[] {
  const buckets = new Map<SimpleCategory, PinnedPlace[]>();
  for (const p of pinned) {
    const cat = p.category ?? getCategoryMeta(p.categoryCode).category;
    const list = buckets.get(cat) ?? [];
    list.push(p);
    buckets.set(cat, list);
  }
  const categories = includeEmpty
    ? GROUP_ORDER
    : GROUP_ORDER.filter((cat) => buckets.has(cat));
  return categories.map((cat) => {
    const items = buckets.get(cat) ?? [];
    const sample = items[0];
    const meta = sample
      ? getCategoryMeta(sample.categoryCode)
      : getCategoryMeta(DEFAULT_CODE_BY_SIMPLE_CATEGORY[cat]);
    return {
      category: cat,
      label: meta.label,
      items,
    };
  });
}

/** 핀 칩 제목: 5자 이상이면 4자 + … */
export function truncatePinTitle(name: string): string {
  if (name.length >= 5) return `${name.slice(0, 4)}…`;
  return name;
}

export function formatPinDistance(meters: number | undefined): string {
  if (meters === undefined) return '';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function findInsertIndexForCategory(
  ids: string[],
  pinnedMap: Map<string, PinnedPlace>,
  category: SimpleCategory,
): number {
  let lastIdx = -1;
  for (let i = 0; i < ids.length; i++) {
    const p = pinnedMap.get(ids[i]);
    if (p && getCategoryMeta(p.categoryCode).category === category) {
      lastIdx = i;
    }
  }
  if (lastIdx >= 0) return lastIdx + 1;

  const targetIdx = GROUP_ORDER.indexOf(category);
  for (let i = 0; i < ids.length; i++) {
    const p = pinnedMap.get(ids[i]);
    if (!p) continue;
    const cat = p.category ?? getCategoryMeta(p.categoryCode).category;
    if (GROUP_ORDER.indexOf(cat) > targetIdx) return i;
  }
  return ids.length;
}

/** 드래그앤드롭으로 순서·카테고리 변경 */
export function movePinnedPlace(
  pinned: PinnedPlace[],
  activeId: string,
  overId: string,
): PinnedPlace[] {
  const ids = pinned.map((p) => p.id);
  const oldIdx = ids.indexOf(activeId);
  if (oldIdx === -1) return pinned;

  const pinnedMap = new Map(pinned.map((p) => [p.id, p]));
  const active = pinnedMap.get(activeId)!;
  let targetCategory: SimpleCategory | null = null;
  let newIds: string[];

  if (overId.startsWith('group-')) {
    targetCategory = overId.slice(6) as SimpleCategory;
    const withoutActive = ids.filter((id) => id !== activeId);
    const insertAt = findInsertIndexForCategory(withoutActive, pinnedMap, targetCategory);
    newIds = [
      ...withoutActive.slice(0, insertAt),
      activeId,
      ...withoutActive.slice(insertAt),
    ];
  } else {
    const newIdx = ids.indexOf(overId);
    if (newIdx === -1) return pinned;
    newIds = arrayMove(ids, oldIdx, newIdx);
    const overPlace = pinnedMap.get(overId);
    if (overPlace) {
      targetCategory = getCategoryMeta(overPlace.categoryCode).category;
    }
  }

  const currentCategory = getCategoryMeta(active.categoryCode).category;
  const next = newIds.map((id) => {
    const place = pinnedMap.get(id)!;
    if (id === activeId && targetCategory && targetCategory !== currentCategory) {
      return applySimpleCategory(place, targetCategory);
    }
    return place;
  });

  return next.map((p, i) => ({ ...p, order: i + 1 }));
}
