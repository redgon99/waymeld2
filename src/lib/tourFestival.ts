import type { Place } from '../types';
import { getSupabase, isSupabaseConfigured } from './supabase';

interface TourFestivalItem {
  contentid: string;
  contenttypeid?: string;
  title: string;
  addr1?: string;
  addr2?: string;
  mapy: string;
  mapx: string;
  tel?: string;
  firstimage?: string;
  firstimage2?: string;
  eventstartdate?: string;
  eventenddate?: string;
}

interface TourFestivalResponse {
  response?: {
    body?: {
      items?: { item?: TourFestivalItem | TourFestivalItem[] };
    };
  };
}

export function isTourFestivalConfigured(): boolean {
  if (isSupabaseConfigured) return true;
  if (import.meta.env.DEV && import.meta.env.VITE_TOUR_API_KEY?.trim()) return true;
  return false;
}

function yyyymmdd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function formatEventDate(raw: string | undefined): string {
  if (!raw || raw.length !== 8) return '';
  return `${raw.slice(0, 4)}.${raw.slice(4, 6)}.${raw.slice(6, 8)}`;
}

/**
 * 오늘부터 +daysAhead일 이내 진행되는 축제/행사 (Tour API searchFestival2).
 *
 * Tour API의 레거시 areaCode/sigunguCode 파라미터는 이 데이터셋에서 해당 컬럼이
 * 비어 있어 항상 0건을 반환하므로 서버 파라미터로 지역을 거르지 않는다.
 * 대신 항상 전국을 가져온 뒤, regionPrefix(예: "제주특별자치도")가 있으면
 * 각 항목의 주소가 그 문자열로 시작하는 것만 클라이언트에서 남긴다.
 */
export async function searchTourFestivals(options?: {
  daysAhead?: number;
  regionPrefix?: string;
}): Promise<Place[]> {
  if (!isTourFestivalConfigured()) return [];
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + (options?.daysAhead ?? 60));

  try {
    const json = await fetchTourFestivalJson(yyyymmdd(start), yyyymmdd(end));
    if (!json) return [];
    const places = parseTourFestivalResponse(json);
    if (!options?.regionPrefix) return places;
    return places.filter((p) => p.address.startsWith(options.regionPrefix!));
  } catch (e) {
    console.warn('Tour Festival API search failed', e);
    return [];
  }
}

async function fetchTourFestivalJson(
  eventStartDate: string,
  eventEndDate: string
): Promise<TourFestivalResponse | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.functions.invoke<TourFestivalResponse>('tour-festival', {
      body: { eventStartDate, eventEndDate },
    });
    if (!error && data && 'response' in data) return data;
    if (error) console.warn('tour-festival function error', error.message);
    if (import.meta.env.DEV) return fetchTourFestivalJsonViaDevProxy(eventStartDate, eventEndDate);
    return null;
  }
  if (import.meta.env.DEV) return fetchTourFestivalJsonViaDevProxy(eventStartDate, eventEndDate);
  return null;
}

async function fetchTourFestivalJsonViaDevProxy(
  eventStartDate: string,
  eventEndDate: string
): Promise<TourFestivalResponse | null> {
  const params = new URLSearchParams({ eventStartDate, eventEndDate });
  const res = await fetch(`/api/tour-festival?${params.toString()}`);
  if (!res.ok) return null;
  return (await res.json()) as TourFestivalResponse;
}

function parseTourFestivalResponse(json: TourFestivalResponse): Place[] {
  const raw = json.response?.body?.items?.item;
  const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return items.map(festivalItemToPlace).filter((p): p is Place => !!p);
}

function festivalItemToPlace(item: TourFestivalItem): Place | null {
  const lat = parseFloat(item.mapy);
  const lng = parseFloat(item.mapx);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const contentTypeId = item.contenttypeid?.trim() || '15';
  const thumbnail = item.firstimage?.trim() || item.firstimage2?.trim() || undefined;
  const dateRange = [formatEventDate(item.eventstartdate), formatEventDate(item.eventenddate)]
    .filter(Boolean)
    .join(' ~ ');
  return {
    id: `tour:${contentTypeId}:${item.contentid}`,
    name: item.title.replace(/<[^>]+>/g, ''),
    nameKo: item.title.replace(/<[^>]+>/g, ''),
    category: 'culture',
    categoryCode: 'CT1',
    categoryLabel: '축제/행사',
    categoryDetail: dateRange ? `축제 · ${dateRange}` : '축제',
    address: [item.addr1, item.addr2].filter(Boolean).join(' '),
    phone: item.tel || undefined,
    thumbnailUrl: thumbnail,
    lat,
    lng,
    placeUrl: `https://www.visitkorea.or.kr/detail/ms_detail.do?contentId=${item.contentid}`,
  };
}
