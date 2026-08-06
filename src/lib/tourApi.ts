import type { Place, SimpleCategory } from '../types';
import { DEFAULT_CODE_BY_SIMPLE_CATEGORY } from './categories';
import { getSupabase, isSupabaseConfigured } from './supabase';

interface TourApiItem {
  contentid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  mapy: string;
  mapx: string;
  tel?: string;
  cat1?: string;
  cat2?: string;
  cat3?: string;
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
  return {
    id: `tour:${item.contentid}`,
    name: item.title.replace(/<[^>]+>/g, ''),
    nameKo: item.title.replace(/<[^>]+>/g, ''),
    category,
    categoryCode: code,
    categoryLabel: '관광',
    categoryDetail: 'Tour API',
    address: [item.addr1, item.addr2].filter(Boolean).join(' '),
    phone: item.tel || undefined,
    lat,
    lng,
    placeUrl: `https://www.visitkorea.or.kr/detail/ms_detail.do?contentId=${item.contentid}`,
  };
}
