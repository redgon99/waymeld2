import type { GooglePlaceDetail } from './googlePlaceDetail';

/** Place Details 재호출 방지 — 30분 TTL */
const TTL_MS = 30 * 60 * 1000;
const MAX_ENTRIES = 80;

interface CacheEntry {
  detail: GooglePlaceDetail;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();

export function googlePlaceDetailCacheKey(placeId: string, language: string): string {
  const id = placeId.startsWith('g:') ? placeId.slice(2) : placeId;
  return `${id}:${language}`;
}

export function readGooglePlaceDetailCache(key: string): GooglePlaceDetail | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.detail;
}

export function writeGooglePlaceDetailCache(key: string, detail: GooglePlaceDetail): void {
  if (cache.has(key)) {
    cache.delete(key);
  } else if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { detail, fetchedAt: Date.now() });
}

export function clearGooglePlaceDetailCache(): void {
  cache.clear();
}
