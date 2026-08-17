import { getSupabase, isSupabaseConfigured } from './supabase';

export function isTourInfoConfigured(): boolean {
  return isSupabaseConfigured;
}

export interface TourPhoto {
  contentId: string;
  title: string;
  imageUrl: string;
  month?: string;
  location?: string;
  photographer?: string;
  keywords: string[];
}

export async function fetchTourPhotos(options: {
  keyword?: string;
  pageNo?: number;
  numOfRows?: number;
}): Promise<{ items: TourPhoto[]; totalCount: number }> {
  const supabase = getSupabase();
  if (!supabase) return { items: [], totalCount: 0 };
  const { data, error } = await supabase.functions.invoke<{ items?: TourPhoto[]; totalCount?: number }>(
    'tour-photos',
    { body: options }
  );
  if (error) throw error;
  return { items: data?.items ?? [], totalCount: data?.totalCount ?? 0 };
}

export type TrailKind = 'DNWW' | 'DNBW';

export interface TourTrailCourse {
  courseId: string;
  routeId: string;
  name: string;
  distanceKm: number;
  totalMinutes: number;
  level: '1' | '2' | '3';
  cycle?: string;
  summary?: string;
  tourInfo?: string;
  travelerInfo?: string;
  region?: string;
  kind: TrailKind;
  gpxUrl?: string;
}

export interface GpxPoint {
  lat: number;
  lng: number;
}

export async function fetchTrailGpxRoute(gpxUrl: string): Promise<{ points: GpxPoint[] }> {
  const supabase = getSupabase();
  if (!supabase) return { points: [] };
  const { data, error } = await supabase.functions.invoke<{ points?: GpxPoint[]; error?: string }>(
    'tour-trail-gpx',
    { body: { gpxUrl } }
  );
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
  return { points: data?.points ?? [] };
}

export async function fetchTourTrails(options: {
  keyword?: string;
  level?: '1' | '2' | '3';
  pageNo?: number;
  numOfRows?: number;
}): Promise<{ items: TourTrailCourse[]; totalCount: number }> {
  const supabase = getSupabase();
  if (!supabase) return { items: [], totalCount: 0 };
  const { data, error } = await supabase.functions.invoke<{
    items?: TourTrailCourse[];
    totalCount?: number;
  }>('tour-trails', { body: options });
  if (error) throw error;
  return { items: data?.items ?? [], totalCount: data?.totalCount ?? 0 };
}

export type PlaceListKind = 'pet' | 'with';

export interface TourFilteredPlace {
  contentId: string;
  contentTypeId: string;
  title: string;
  address: string;
  lat: number;
  lng: number;
  thumbnailUrl?: string;
}

export async function fetchFilteredPlaces(
  kind: PlaceListKind,
  options: { keyword?: string; contentTypeId?: string; pageNo?: number; numOfRows?: number }
): Promise<{ items: TourFilteredPlace[]; totalCount: number }> {
  const supabase = getSupabase();
  if (!supabase) return { items: [], totalCount: 0 };
  const { data, error } = await supabase.functions.invoke<{
    items?: TourFilteredPlace[];
    totalCount?: number;
  }>('tour-filtered-places', { body: { kind, ...options } });
  if (error) throw error;
  return { items: data?.items ?? [], totalCount: data?.totalCount ?? 0 };
}

export interface OdiiSite {
  tid: string;
  tlid: string;
  title: string;
  region: string;
  themeCategory?: string;
  lat: number;
  lng: number;
  imageUrl?: string;
}

export interface OdiiStory {
  stid: string;
  stlid: string;
  title: string;
  audioTitle?: string;
  script?: string;
  playTimeSec?: number;
  audioUrl?: string;
  imageUrl?: string;
}

export async function fetchOdiiSites(options: {
  keyword?: string;
  pageNo?: number;
  numOfRows?: number;
}): Promise<{ items: OdiiSite[]; totalCount: number }> {
  const supabase = getSupabase();
  if (!supabase) return { items: [], totalCount: 0 };
  const { data, error } = await supabase.functions.invoke<{ items?: OdiiSite[]; totalCount?: number }>(
    'tour-odii',
    { body: { mode: 'sites', ...options } }
  );
  if (error) throw error;
  return { items: data?.items ?? [], totalCount: data?.totalCount ?? 0 };
}

export async function fetchOdiiStories(
  tid: string,
  tlid: string
): Promise<{ items: OdiiStory[]; totalCount: number }> {
  const supabase = getSupabase();
  if (!supabase) return { items: [], totalCount: 0 };
  const { data, error } = await supabase.functions.invoke<{ items?: OdiiStory[]; totalCount?: number }>(
    'tour-odii',
    { body: { mode: 'stories', tid, tlid } }
  );
  if (error) throw error;
  return { items: data?.items ?? [], totalCount: data?.totalCount ?? 0 };
}

export type DataLabLevel = 'metco' | 'locgo';

export interface DataLabRegion {
  code: string;
  name: string;
  local: number;
  domestic: number;
  foreign: number;
  total: number;
}

export async function fetchDataLabRegions(
  level: DataLabLevel,
  ymd: string
): Promise<{ regions: DataLabRegion[]; baseYmd: string | null }> {
  const supabase = getSupabase();
  if (!supabase) return { regions: [], baseYmd: null };
  const { data, error } = await supabase.functions.invoke<{
    regions?: DataLabRegion[];
    baseYmd?: string | null;
  }>('tour-datalab', { body: { level, ymd } });
  if (error) throw error;
  return { regions: data?.regions ?? [], baseYmd: data?.baseYmd ?? null };
}

/** KorPetTourService2 / KorWithService2 areaBasedList2·searchKeyword2 의 contentTypeId */
export const TOUR_CONTENT_TYPE_IDS = ['12', '14', '15', '25', '28', '32', '38', '39'] as const;
export type TourContentTypeId = (typeof TOUR_CONTENT_TYPE_IDS)[number];

/** PhotoGalleryService1 gallerySearchList1 키워드 — 사진 API에 분류코드가 없어 검색 키워드로 하위분류 */
export const PHOTO_GALLERY_THEMES = [
  { id: 'night', keyword: '야경' },
  { id: 'festival', keyword: '축제' },
  { id: 'hanok', keyword: '한옥' },
  { id: 'nature', keyword: '자연' },
  { id: 'beach', keyword: '해변' },
  { id: 'temple', keyword: '사찰' },
] as const;
