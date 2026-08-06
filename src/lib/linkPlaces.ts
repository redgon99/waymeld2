import { getSupabase, isSupabaseConfigured } from './supabase';
import {
  normalizeYoutubePlaces,
  type YoutubePlaceCandidate,
} from './youtubePlaceCategory';
import type { LinkPlatform } from './linkPlatform';

export type { YoutubePlaceCandidate as LinkPlaceCandidate } from './youtubePlaceCategory';

export interface LinkPlacesExtractResult {
  platform: LinkPlatform;
  sourceKey: string;
  sourceUrl: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  places: YoutubePlaceCandidate[];
  sourcesUsed: string[];
  extractable: boolean;
  message?: string | null;
}

export function isLinkPlacesExtractConfigured(): boolean {
  return isSupabaseConfigured;
}

export async function extractPlacesFromLink(
  url: string
): Promise<LinkPlacesExtractResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase가 설정되어야 링크 장소 추출을 사용할 수 있습니다.');
  }
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');

  const { data, error } = await sb.functions.invoke<
    LinkPlacesExtractResult | { error?: string }
  >('link-places-extract', { body: { url: url.trim() } });

  if (error) {
    throw new Error(error.message || '장소 추출에 실패했습니다.');
  }
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
  if (!data || !('places' in data) || !Array.isArray((data as LinkPlacesExtractResult).places)) {
    throw new Error('장소 추출 응답이 올바르지 않습니다.');
  }

  const result = data as LinkPlacesExtractResult;
  return {
    platform: result.platform,
    sourceKey: String(result.sourceKey ?? ''),
    sourceUrl: String(result.sourceUrl ?? url.trim()),
    title: result.title ?? null,
    description: result.description ?? null,
    imageUrl: result.imageUrl ?? null,
    places: normalizeYoutubePlaces(result.places as unknown[]),
    sourcesUsed: Array.isArray(result.sourcesUsed)
      ? result.sourcesUsed.map(String)
      : [],
    extractable: Boolean(result.extractable),
    message: result.message ?? null,
  };
}
