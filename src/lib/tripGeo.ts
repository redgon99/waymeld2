import type { Trip } from './trips';

export interface TripCenter {
  lat: number;
  lng: number;
}

/** 모든 일차 핀 위·경도 평균. 핀 없으면 null */
export function computeTripCenter(trip: Pick<Trip, 'pinnedByDay'>): TripCenter | null {
  let sumLat = 0;
  let sumLng = 0;
  let count = 0;

  for (const list of Object.values(trip.pinnedByDay ?? {})) {
    for (const pin of list) {
      if (typeof pin.lat === 'number' && typeof pin.lng === 'number') {
        sumLat += pin.lat;
        sumLng += pin.lng;
        count++;
      }
    }
  }

  if (count === 0) return null;
  return { lat: sumLat / count, lng: sumLng / count };
}
