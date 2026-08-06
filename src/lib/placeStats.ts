import type { Place } from '../types';
import { buildKakaoPhotosUrl } from './kakaoPlaceUrls';
import { fetchKakaoPlaceJson, proxiedThumbnailUrl } from './kakaoPlaceApi';
import { parseOpeningFromPanel3 } from './openHoursStatus';

export interface PlacePanelData {
  rating?: number;
  reviewCount?: number;
  thumbnailUrl?: string;
  photosUrl?: string;
  openingStatus?: Place['openingStatus'];
  isOpenNow?: boolean;
  closesAt?: number;
  opensAt?: number;
}

/** 카카오맵 장소 패널 + 사진 탭 API */
export async function fetchPlacePanel(placeId: string): Promise<PlacePanelData> {
  const photosUrl = buildKakaoPhotosUrl(placeId);

  const [panelData, thumbnailFromTab] = await Promise.all([
    fetchKakaoPlaceJson<Record<string, unknown>>(`/panel3/${placeId}`),
    fetchThumbnailFromPhotosTab(placeId),
  ]);

  const parsed = panelData
    ? parsePanel3Response(panelData, placeId)
    : { photosUrl };

  const thumbnailUrl =
    thumbnailFromTab ??
    parsed.thumbnailUrl ??
    findPlacePhotoUrlInData(panelData);

  return {
    ...parsed,
    photosUrl: parsed.photosUrl ?? photosUrl,
    ...(thumbnailUrl
      ? { thumbnailUrl: proxiedThumbnailUrl(normalizePhotoUrl(thumbnailUrl)) }
      : {}),
  };
}

/** @deprecated fetchPlacePanel 사용 */
export async function fetchPlaceStats(
  placeId: string
): Promise<{ rating?: number; reviewCount?: number }> {
  const panel = await fetchPlacePanel(placeId);
  return { rating: panel.rating, reviewCount: panel.reviewCount };
}

async function fetchPhotosTabRaw(
  placeId: string
): Promise<Array<{ url?: string; type?: string }>> {
  const data = await fetchKakaoPlaceJson<{
    photos?: Array<{ url?: string; type?: string }>;
  }>(`/tab/photos/${placeId}`);
  return Array.isArray(data?.photos) ? data.photos : [];
}

function toProxiedPhotoUrls(
  list: Array<{ url?: string; type?: string }>
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (!item.url || !isPlacePhotoUrl(item.url)) continue;
    const proxied = proxiedThumbnailUrl(normalizePhotoUrl(item.url));
    if (!proxied || seen.has(proxied)) continue;
    seen.add(proxied);
    out.push(proxied);
  }
  return out;
}

/** 장소 사진 탭 API — 모달 갤러리용 */
export async function fetchPlacePhotos(placeId: string): Promise<string[]> {
  return toProxiedPhotoUrls(await fetchPhotosTabRaw(placeId));
}

async function fetchThumbnailFromPhotosTab(
  placeId: string
): Promise<string | undefined> {
  const list = await fetchPhotosTabRaw(placeId);
  if (list.length === 0) return undefined;

  const priority = ['INDOOR', 'FOOD', 'OUTDOOR', 'KMAPREVIEW', 'BLOG'];
  for (const type of priority) {
    const hit = list.find(
      (p) => p.type === type && p.url && isPlacePhotoUrl(p.url)
    );
    if (hit?.url) return hit.url;
  }
  const any = list.find((p) => p.url && isPlacePhotoUrl(p.url));
  return any?.url;
}

function parsePanel3Response(
  root: Record<string, unknown>,
  placeId: string
): PlacePanelData {
  const summary = root.summary as Record<string, unknown> | undefined;
  const kakaoReview = root.kakaomap_review as Record<string, unknown> | undefined;
  const blogReview = root.blog_review as Record<string, unknown> | undefined;

  const rating = pickNumber(
    summary?.rating,
    summary?.average_score,
    summary?.star_rating,
    summary?.score
  );

  const reviewCount = pickNumber(
    kakaoReview?.review_count,
    kakaoReview?.count,
    kakaoReview?.total_count,
    blogReview?.review_count,
    blogReview?.count,
    summary?.review_count
  );

  const confirmId = pickString(summary?.confirm_id) ?? placeId;
  const thumbnailUrl =
    extractThumbnailUrl(root.photos) ?? findPlacePhotoUrlInData(root);

  const opening = parseOpeningFromPanel3(root);

  return {
    ...(rating !== undefined ? { rating } : {}),
    ...(reviewCount !== undefined ? { reviewCount } : {}),
    ...(thumbnailUrl
      ? { thumbnailUrl: proxiedThumbnailUrl(normalizePhotoUrl(thumbnailUrl)) }
      : {}),
    photosUrl: buildKakaoPhotosUrl(confirmId),
    openingStatus: opening.openingStatus,
    ...(opening.isOpenNow !== undefined ? { isOpenNow: opening.isOpenNow } : {}),
    ...(opening.closesAt != null ? { closesAt: opening.closesAt } : {}),
    ...(opening.opensAt != null ? { opensAt: opening.opensAt } : {}),
  };
}

function findPlacePhotoUrlInData(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const urls: string[] = [];
  collectUrls(data, urls, 0);
  return urls.find(isPlacePhotoUrl);
}

function collectUrls(obj: unknown, out: string[], depth: number): void {
  if (depth > 12) return;
  if (typeof obj === 'string' && obj.startsWith('http')) {
    out.push(obj);
    return;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) collectUrls(item, out, depth + 1);
    return;
  }
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj)) collectUrls(v, out, depth + 1);
  }
}

function isPlacePhotoUrl(url: string): boolean {
  if (/roadview|map_roadview/i.test(url)) return false;
  if (/kakaomapPhoto|local\/kakaomapPhoto/i.test(url)) return true;
  if (/img\d*\.kakaocdn\.net/i.test(url)) return true;
  if (/postfiles\.pstatic\.net/i.test(url)) return true;
  if (/daumcdn\.net/i.test(url) && !/profile/i.test(url)) return true;
  return false;
}

function normalizePhotoUrl(url: string): string {
  const u = url.trim();
  if (u.startsWith('http://')) return `https://${u.slice(7)}`;
  return u;
}

function extractThumbnailUrl(photos: unknown): string | undefined {
  if (!photos) return undefined;
  if (typeof photos === 'string' && isPlacePhotoUrl(photos)) return photos;
  if (Array.isArray(photos)) {
    for (const item of photos) {
      const u = urlFromPhotoItem(item);
      if (u && isPlacePhotoUrl(u)) return u;
    }
  }
  if (typeof photos !== 'object') return undefined;
  const p = photos as Record<string, unknown>;
  const listCandidates = [p.photos, p.list, p.photo_list, p.photoList, p.items];
  for (const list of listCandidates) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const u = urlFromPhotoItem(item);
      if (u && isPlacePhotoUrl(u)) return u;
    }
  }
  const single = pickString(p.thumbnail_url, p.main_photo_url, p.url);
  return single && isPlacePhotoUrl(single) ? single : undefined;
}

function urlFromPhotoItem(item: unknown): string | undefined {
  if (!item) return undefined;
  if (typeof item === 'string' && item.startsWith('http')) return item;
  if (typeof item !== 'object') return undefined;
  const o = item as Record<string, unknown>;
  return pickString(o.url, o.origin_url, o.photo_url, o.thumbnail_url, o.img_url);
}

function pickString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const v of values) {
    if (v === undefined || v === null || v === '') continue;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  return undefined;
}

const ENRICH_CONCURRENCY = 4;

/** 검색 결과에 평점·리뷰·썸네일 병렬 보강 */
export async function enrichPlacesWithStats(places: Place[]): Promise<Place[]> {
  const out = [...places];
  for (let i = 0; i < out.length; i += ENRICH_CONCURRENCY) {
    const chunk = out.slice(i, i + ENRICH_CONCURRENCY);
    const panels = await Promise.all(chunk.map((p) => fetchPlacePanel(p.id)));
    chunk.forEach((p, j) => {
      const panel = panels[j];
      out[i + j] = {
        ...p,
        ...panel,
        photosUrl: panel.photosUrl ?? buildKakaoPhotosUrl(p.id, p.placeUrl),
      };
    });
  }
  return out;
}
