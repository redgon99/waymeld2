import type { TripMaterial } from '../types';

export type MaterialDisplayItem =
  | { type: 'single'; material: TripMaterial }
  | { type: 'album'; albumId: string; materials: TripMaterial[] };

/** 필터된 자료를 단일 항목·사진 앨범(2장 이상)으로 묶어 표시용 목록 생성 */
export function buildMaterialDisplayItems(materials: TripMaterial[]): MaterialDisplayItem[] {
  const sorted = [...materials].sort((a, b) => b.updatedAt - a.updatedAt);
  const byAlbum = new Map<string, TripMaterial[]>();

  for (const m of sorted) {
    if (m.kind === 'image' && m.albumId) {
      const arr = byAlbum.get(m.albumId) ?? [];
      arr.push(m);
      byAlbum.set(m.albumId, arr);
    }
  }

  const emittedAlbums = new Set<string>();
  const items: MaterialDisplayItem[] = [];

  for (const m of sorted) {
    if (m.kind === 'image' && m.albumId) {
      const group = byAlbum.get(m.albumId)!;
      if (group.length >= 2) {
        if (!emittedAlbums.has(m.albumId)) {
          emittedAlbums.add(m.albumId);
          const materialsInAlbum = [...group].sort((a, b) => b.createdAt - a.createdAt);
          items.push({ type: 'album', albumId: m.albumId, materials: materialsInAlbum });
        }
        continue;
      }
    }
    items.push({ type: 'single', material: m });
  }

  return items;
}

export function albumDisplayTitle(materials: TripMaterial[]): string {
  if (materials.length === 0) return '사진';
  const first = materials[0]!;
  if (materials.length === 1) return first.title;
  return `사진 ${materials.length}장`;
}
