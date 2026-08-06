import { getSupabase, isSupabaseConfigured } from './supabase';
import {
  normalizeYoutubePlaces,
  type YoutubePlaceCandidate,
} from './youtubePlaceCategory';

export type { YoutubePlaceCandidate } from './youtubePlaceCategory';

export interface YoutubePlacesExtractResult {
  videoId: string;
  title: string | null;
  places: YoutubePlaceCandidate[];
  sourcesUsed: string[];
}

const YOUTUBE_ID_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function parseYoutubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
        const id = parts[1];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    /* ignore */
  }
  return trimmed.match(YOUTUBE_ID_RE)?.[1] ?? null;
}

export function isYoutubePlacesExtractConfigured(): boolean {
  return isSupabaseConfigured;
}

export async function extractPlacesFromYoutubeUrl(
  url: string
): Promise<YoutubePlacesExtractResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase가 설정되어야 YouTube 장소 추출을 사용할 수 있습니다.');
  }
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');

  const videoId = parseYoutubeVideoId(url);
  if (!videoId) {
    throw new Error('유효한 YouTube 영상 링크를 입력해 주세요.');
  }

  const { data, error } = await sb.functions.invoke<YoutubePlacesExtractResult | { error?: string }>(
    'youtube-places-extract',
    { body: { url: url.trim() } }
  );

  if (error) {
    throw new Error(error.message || '장소 추출에 실패했습니다.');
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
  if (!data || !('places' in data) || !Array.isArray(data.places)) {
    throw new Error('장소 추출 응답이 올바르지 않습니다.');
  }
  return {
    videoId: String(data.videoId),
    title: data.title ?? null,
    places: normalizeYoutubePlaces(data.places as unknown[]),
    sourcesUsed: Array.isArray(data.sourcesUsed) ? data.sourcesUsed.map(String) : [],
  };
}
