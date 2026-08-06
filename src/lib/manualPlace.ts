import type { Place } from '../types';

/** 지도 클릭으로 만든 수동 장소 ID 접두사 */
export const MANUAL_PLACE_ID_PREFIX = 'manual:';

export function isManualPlaceId(id: string): boolean {
  return id.startsWith(MANUAL_PLACE_ID_PREFIX);
}

export function createManualPlace(params: {
  lat: number;
  lng: number;
  name: string;
  address: string;
}): Place {
  const id = `${MANUAL_PLACE_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: params.name.trim() || params.address,
    category: 'other',
    categoryCode: 'OTHER',
    categoryLabel: '직접 지정',
    address: params.address,
    lat: params.lat,
    lng: params.lng,
  };
}
