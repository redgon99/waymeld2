import type { Origin } from '../types';
import { resolveAddressToCoords } from './kakao';

/** 경로 생성 전 출발지 좌표 확보 */
export async function resolveOriginForRoute(origin: Origin): Promise<Origin> {
  if (origin.type === 'address' && origin.address?.trim() && !origin.lat) {
    const resolved = await resolveAddressToCoords(origin.address.trim());
    if (!resolved) {
      throw new Error('ADDRESS_NOT_FOUND');
    }
    return {
      ...origin,
      lat: resolved.lat,
      lng: resolved.lng,
      label: resolved.label,
    };
  }

  if (origin.type === 'current' && !origin.lat) {
    const pos = await getApproximateLocation();
    if (!pos) {
      throw new Error('GPS_UNAVAILABLE');
    }
    return { ...origin, lat: pos.lat, lng: pos.lng };
  }

  if (origin.type === 'map-click' && (!origin.lat || !origin.lng)) {
    throw new Error('MAP_ORIGIN_REQUIRED');
  }

  return origin;
}

import { getApproximateLocation } from './geolocation';
