import type { Place, SimpleCategory } from '../types';
import { DEFAULT_CODE_BY_SIMPLE_CATEGORY } from './categories';
import { getSupabase, isSupabaseConfigured } from './supabase';

interface TourApiItem {
  contentid: string;
  contenttypeid?: string;
  title: string;
  addr1?: string;
  addr2?: string;
  mapy: string;
  mapx: string;
  tel?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
  firstimage?: string;
  firstimage2?: string;
}

interface TourApiResponse {
  response?: {
    body?: {
      items?: { item?: TourApiItem | TourApiItem[] };
    };
  };
}

/** Supabase Edge Function 배포 또는 로컬 Vite 프록시 사용 가능 여부 */
export function isTourApiConfigured(): boolean {
  if (isSupabaseConfigured) return true;
  if (import.meta.env.DEV && import.meta.env.VITE_TOUR_API_KEY?.trim()) return true;
  return false;
}

/** 한국관광공사 Tour API 키워드 검색 (서버 프록시 경유) */
export async function searchTourPlaces(keyword: string): Promise<Place[]> {
  if (!keyword.trim() || !isTourApiConfigured()) return [];

  try {
    const json = await fetchTourApiJson(keyword.trim());
    if (!json) return [];
    return parseTourApiResponse(json);
  } catch (e) {
    console.warn('Tour API search failed', e);
    return [];
  }
}

async function fetchTourApiJson(keyword: string): Promise<TourApiResponse | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.functions.invoke<TourApiResponse>('tour-search', {
      body: { keyword },
    });
    if (!error && data && 'response' in data) {
      return data;
    }
    if (error) {
      console.warn('tour-search function error', error.message);
    }
    if (import.meta.env.DEV) {
      return fetchTourApiJsonViaDevProxy(keyword);
    }
    return null;
  }

  if (import.meta.env.DEV) {
    return fetchTourApiJsonViaDevProxy(keyword);
  }

  return null;
}

async function fetchTourApiJsonViaDevProxy(keyword: string): Promise<TourApiResponse | null> {
  const params = new URLSearchParams({ keyword });
  const res = await fetch(`/api/tour-search?${params.toString()}`);
  if (!res.ok) return null;
  return (await res.json()) as TourApiResponse;
}

/**
 * 한국관광공사 Tour API 위치기반 조회(locationBasedList2) — 키워드/카테고리 없이
 * 지도 주변만 둘러볼 때 Kakao/Google 커버리지가 얕은 지역을 보완한다.
 */
export async function searchTourPlacesNearby(
  center: { lat: number; lng: number },
  radiusMeters: number
): Promise<Place[]> {
  if (!isTourApiConfigured()) return [];

  try {
    const json = await fetchTourNearbyJson(center, radiusMeters);
    if (!json) return [];
    return parseTourApiResponse(json);
  } catch (e) {
    console.warn('Tour API nearby search failed', e);
    return [];
  }
}

async function fetchTourNearbyJson(
  center: { lat: number; lng: number },
  radiusMeters: number
): Promise<TourApiResponse | null> {
  const body = { mapX: center.lng, mapY: center.lat, radius: radiusMeters };
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.functions.invoke<TourApiResponse>('tour-nearby', {
      body,
    });
    if (!error && data && 'response' in data) return data;
    if (error) console.warn('tour-nearby function error', error.message);
    if (import.meta.env.DEV) return fetchTourNearbyJsonViaDevProxy(center, radiusMeters);
    return null;
  }
  if (import.meta.env.DEV) return fetchTourNearbyJsonViaDevProxy(center, radiusMeters);
  return null;
}

async function fetchTourNearbyJsonViaDevProxy(
  center: { lat: number; lng: number },
  radiusMeters: number
): Promise<TourApiResponse | null> {
  const params = new URLSearchParams({
    mapX: String(center.lng),
    mapY: String(center.lat),
    radius: String(radiusMeters),
  });
  const res = await fetch(`/api/tour-nearby?${params.toString()}`);
  if (!res.ok) return null;
  return (await res.json()) as TourApiResponse;
}

export function parseTourApiResponse(json: TourApiResponse): Place[] {
  const raw = json.response?.body?.items?.item;
  const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return items.map(tourItemToPlace).filter((p): p is Place => !!p);
}

function tourCategory(item: TourApiItem): SimpleCategory {
  const cat = `${item.cat1 ?? ''}${item.cat2 ?? ''}${item.cat3 ?? ''}`;
  if (cat.includes('A05')) return 'food';
  if (cat.includes('A02')) return 'tour';
  if (cat.includes('A03')) return 'culture';
  if (cat.includes('A04')) return 'shop';
  return 'tour';
}

function tourItemToPlace(item: TourApiItem): Place | null {
  const lat = parseFloat(item.mapy);
  const lng = parseFloat(item.mapx);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const category = tourCategory(item);
  const code = DEFAULT_CODE_BY_SIMPLE_CATEGORY[category];
  const contentTypeId = item.contenttypeid?.trim() || '0';
  const thumbnail = item.firstimage?.trim() || item.firstimage2?.trim() || undefined;
  return {
    id: `tour:${contentTypeId}:${item.contentid}`,
    name: item.title.replace(/<[^>]+>/g, ''),
    nameKo: item.title.replace(/<[^>]+>/g, ''),
    category,
    categoryCode: code,
    categoryLabel: '관광',
    categoryDetail: 'Tour API',
    address: [item.addr1, item.addr2].filter(Boolean).join(' '),
    phone: item.tel || undefined,
    thumbnailUrl: thumbnail,
    lat,
    lng,
    placeUrl: `https://www.visitkorea.or.kr/detail/ms_detail.do?contentId=${item.contentid}`,
  };
}

/** place.id ("tour:{contentTypeId}:{contentId}")에서 KTO contentId/contentTypeId 추출 */
export function parseTourPlaceId(
  placeId: string
): { contentId: string; contentTypeId: string } | null {
  const m = placeId.match(/^tour:([^:]*):(.+)$/);
  if (!m) return null;
  return { contentTypeId: m[1], contentId: m[2] };
}
