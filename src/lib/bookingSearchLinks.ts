/**
 * 카테고리별로 "예약할 만한 곳"에 예약 사이트 검색 버튼을 미리 보여주기 위한 매핑.
 *
 * bookingLinks.ts(사용자가 이미 예약한 링크를 인식)와 반대 방향 — 아직 예약 전인
 * 사용자에게 어디서 찾아보면 되는지 안내만 한다. 정확한 상품 딥링크가 아니라
 * 이름 기반 검색 결과로 보내므로, 실제로 그 장소가 맞는지는 사용자가 검색 결과에서
 * 직접 확인해야 한다.
 */

import type { SimpleCategory } from '../types';

export type BookingSearchProviderId =
  | 'naverMap'
  | 'agoda'
  | 'booking'
  | 'airbnb'
  | 'klook'
  | 'kkday';

export interface BookingSearchLink {
  id: BookingSearchProviderId;
  brand: string;
  href: string;
}

const PROVIDERS: Record<
  BookingSearchProviderId,
  { brand: string; buildUrl: (name: string) => string }
> = {
  naverMap: {
    brand: '네이버지도',
    buildUrl: (name) => `https://map.naver.com/p/search/${encodeURIComponent(name)}`,
  },
  agoda: {
    brand: 'Agoda',
    buildUrl: (name) => `https://www.agoda.com/search?q=${encodeURIComponent(name)}`,
  },
  booking: {
    brand: 'Booking.com',
    buildUrl: (name) => `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(name)}`,
  },
  airbnb: {
    brand: 'Airbnb',
    buildUrl: (name) => `https://www.airbnb.co.kr/s/${encodeURIComponent(name)}/homes`,
  },
  klook: {
    brand: 'Klook',
    buildUrl: (name) => `https://www.klook.com/ko/search-result/?query=${encodeURIComponent(name)}`,
  },
  kkday: {
    brand: 'KKday',
    buildUrl: (name) => `https://www.kkday.com/ko/search?keyword=${encodeURIComponent(name)}`,
  },
};

/** 예약 검색 버튼을 보여줄 카테고리와, 카테고리별 제공처 우선순위 */
const PROVIDERS_BY_CATEGORY: Partial<Record<SimpleCategory, BookingSearchProviderId[]>> = {
  food: ['naverMap'],
  stay: ['agoda', 'booking', 'airbnb'],
  tour: ['klook', 'kkday'],
  culture: ['klook', 'kkday'],
};

export function getBookingSearchLinks(
  category: SimpleCategory | undefined,
  placeName: string | undefined,
): BookingSearchLink[] {
  if (!category || !placeName) return [];
  const ids = PROVIDERS_BY_CATEGORY[category];
  if (!ids) return [];
  return ids.map((id) => {
    const p = PROVIDERS[id];
    return { id, brand: p.brand, href: p.buildUrl(placeName) };
  });
}
