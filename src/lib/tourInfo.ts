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
