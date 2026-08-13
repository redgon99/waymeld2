import { getSupabase, isSupabaseConfigured } from './supabase';
import type { PlacePanelDetail } from './placePanelTabs';
import { parseTourPlaceId } from './tourApi';

interface TourDetailResponse {
  overview: string | null;
  homepage: string | null;
  tel: string | null;
  address: string | null;
  images: string[];
  intro: {
    hours?: string;
    restDate?: string;
    parking?: string;
    infoCenter?: string;
    fee?: string;
  };
}

async function fetchTourDetailJson(
  contentId: string,
  contentTypeId: string
): Promise<TourDetailResponse | null> {
  const supabase = getSupabase();
  if (supabase) {
    const { data, error } = await supabase.functions.invoke<TourDetailResponse>('tour-detail', {
      body: { contentId, contentTypeId },
    });
    if (!error && data && 'images' in data) return data;
    if (error) console.warn('tour-detail function error', error.message);
    if (import.meta.env.DEV) return fetchTourDetailViaDevProxy(contentId, contentTypeId);
    return null;
  }
  if (import.meta.env.DEV) return fetchTourDetailViaDevProxy(contentId, contentTypeId);
  return null;
}

async function fetchTourDetailViaDevProxy(
  contentId: string,
  contentTypeId: string
): Promise<TourDetailResponse | null> {
  const params = new URLSearchParams({ contentId, contentTypeId });
  const res = await fetch(`/api/tour-detail?${params.toString()}`);
  if (!res.ok) return null;
  return (await res.json()) as TourDetailResponse;
}

/** place.id가 "tour:{contentTypeId}:{contentId}" 형태일 때 KTO 상세정보를 PlacePanelDetail 형태로 조회 */
export async function fetchTourPlaceDetail(placeId: string): Promise<PlacePanelDetail> {
  const parsed = parseTourPlaceId(placeId);
  const empty: PlacePanelDetail = {
    panel: null,
    tabs: [
      { id: 'PHOTO', label: '사진' },
      { id: 'SUMMARY', label: '요약' },
    ],
    photos: [],
  };
  if (!parsed) return empty;

  const detail = await fetchTourDetailJson(parsed.contentId, parsed.contentTypeId);
  if (!detail) return empty;

  return {
    panel: {
      provider: 'tour',
      overview: detail.overview,
      homepage: detail.homepage,
      tel: detail.tel,
      address: detail.address,
      intro: detail.intro,
    },
    tabs: empty.tabs,
    photos: detail.images,
  };
}
