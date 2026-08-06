import type { CategoryCode, Place, SearchScope } from '../types';
import { getCategoryMeta } from './categories';
import i18n from './i18n';
import { googleMapsLanguage, normalizeLocale } from './locale';
import { clearGooglePlaceDetailCache } from './googlePlaceDetailCache';

export type { GooglePlaceDetail, GooglePlaceReview } from './googlePlaceDetail';
export {
  fetchGooglePlaceDetail,
  getGoogleMapsApiKey,
  buildGoogleMapEmbedUrl,
  googlePlaceDetailModalPayload,
} from './googlePlaceDetail';

declare global {
  interface Window {
    google: any;
  }
}

let googleSdkPromise: Promise<typeof window.google> | null = null;
let loadedSdkLanguage: string | null = null;

export function resetGoogleMapsSdk(): void {
  googleSdkPromise = null;
  loadedSdkLanguage = null;
  clearGooglePlaceDetailCache();
  document.querySelectorAll('script[src*="maps.googleapis.com"]').forEach((el) => el.remove());
  if (typeof window !== 'undefined') {
    delete (window as { google?: unknown }).google;
  }
}

function placesLanguage(): string {
  return googleMapsLanguage(normalizeLocale(i18n.language));
}

export function loadGoogleMapsSdk(
  apiKey: string,
  language = placesLanguage()
): Promise<typeof window.google> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));

  if (googleSdkPromise && loadedSdkLanguage === language) {
    return googleSdkPromise;
  }

  if (loadedSdkLanguage && loadedSdkLanguage !== language) {
    resetGoogleMapsSdk();
  }

  loadedSdkLanguage = language;

  googleSdkPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve(window.google);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=${encodeURIComponent(language)}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google?.maps) resolve(window.google);
      else reject(new Error('Google Maps SDK load failed'));
    };
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });

  return googleSdkPromise;
}

export async function reverseGeocodeWithGoogle(lat: number, lng: number): Promise<string> {
  if (!window.google?.maps?.Geocoder) {
    throw new Error('Google Maps SDK not loaded');
  }
  const geocoder = new window.google.maps.Geocoder();
  const result = await geocoder.geocode({ location: { lat, lng } });
  const first = result?.results?.[0];
  return first?.formatted_address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export interface GoogleUnifiedSearchParams {
  keyword?: string;
  categoryGroupCode?: CategoryCode | null;
  scope: SearchScope;
  center?: { lat: number; lng: number };
  radiusMeters?: number;
  size?: number;
  page?: number;
}

export interface GooglePlacesSearchResult {
  places: Place[];
  page: number;
  hasMore: boolean;
}

function mapKakaoCategoryToGoogleType(
  code?: CategoryCode | null
): string | undefined {
  if (!code || code === 'OTHER') return undefined;
  if (code === 'FD6') return 'restaurant';
  if (code === 'CE7') return 'cafe';
  if (code === 'AT4') return 'tourist_attraction';
  if (code === 'AD5') return 'lodging';
  if (code === 'CT1') return 'museum';
  if (code === 'MT1') return 'supermarket';
  if (code === 'CS2') return 'convenience_store';
  if (code === 'PK6') return 'parking';
  return undefined;
}

function inferCategoryCodeByTypes(types: string[] | undefined): CategoryCode | 'OTHER' {
  const t = new Set(types ?? []);
  if (t.has('restaurant') || t.has('meal_takeaway') || t.has('meal_delivery')) return 'FD6';
  if (t.has('cafe')) return 'CE7';
  if (t.has('lodging')) return 'AD5';
  if (t.has('tourist_attraction') || t.has('park') || t.has('amusement_park')) return 'AT4';
  if (t.has('museum') || t.has('art_gallery') || t.has('library')) return 'CT1';
  if (t.has('supermarket') || t.has('shopping_mall') || t.has('department_store')) return 'MT1';
  if (t.has('convenience_store')) return 'CS2';
  if (t.has('parking')) return 'PK6';
  return 'OTHER';
}

function normalizeGooglePlace(row: any): Place | null {
  const loc = row?.geometry?.location;
  const lat = typeof loc?.lat === 'function' ? loc.lat() : loc?.lat;
  const lng = typeof loc?.lng === 'function' ? loc.lng() : loc?.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const categoryCode = inferCategoryCodeByTypes(row?.types);
  const meta = getCategoryMeta(categoryCode);
  const placeId = String(row.place_id ?? '').trim();
  if (!placeId) return null;

  return {
    id: `g:${placeId}`,
    name: String(row.name ?? 'Unknown'),
    category: meta.category,
    categoryCode,
    categoryLabel: meta.label,
    categoryDetail: Array.isArray(row.types) ? row.types.join(' > ') : undefined,
    address: String(row.formatted_address ?? row.vicinity ?? ''),
    roadAddress: String(row.formatted_address ?? row.vicinity ?? ''),
    lat,
    lng,
    rating: typeof row.rating === 'number' ? row.rating : undefined,
    reviewCount: typeof row.user_ratings_total === 'number' ? row.user_ratings_total : undefined,
    thumbnailUrl: row.photos?.[0]?.getUrl?.({ maxWidth: 300, maxHeight: 300 }),
    placeUrl: placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : undefined,
    photosUrl: placeId ? `https://www.google.com/maps/place/?q=place_id:${placeId}` : undefined,
    openingStatus: 'unknown',
  };
}

function createPlacesService(): any {
  const container = document.createElement('div');
  return new window.google.maps.places.PlacesService(container);
}

function textSearchOnce(req: any): Promise<{ results: any[]; hasMore: boolean; pagination?: any }> {
  return new Promise((resolve, reject) => {
    const service = createPlacesService();
    service.textSearch(req, (results: any[], status: string, pagination: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        resolve({
          results: Array.isArray(results) ? results : [],
          hasMore: Boolean(pagination?.hasNextPage),
          pagination,
        });
        return;
      }
      if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve({ results: [], hasMore: false, pagination: undefined });
        return;
      }
      reject(new Error(`Google textSearch failed: ${status}`));
    });
  });
}

function nearbySearchOnce(req: any): Promise<{ results: any[]; hasMore: boolean; pagination?: any }> {
  return new Promise((resolve, reject) => {
    const service = createPlacesService();
    service.nearbySearch(req, (results: any[], status: string, pagination: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        resolve({
          results: Array.isArray(results) ? results : [],
          hasMore: Boolean(pagination?.hasNextPage),
          pagination,
        });
        return;
      }
      if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve({ results: [], hasMore: false, pagination: undefined });
        return;
      }
      reject(new Error(`Google nearbySearch failed: ${status}`));
    });
  });
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchNextPage(pagination: any): Promise<{ results: any[]; hasMore: boolean; pagination?: any }> {
  return new Promise((resolve, reject) => {
    if (!pagination?.hasNextPage || typeof pagination.nextPage !== 'function') {
      resolve({ results: [], hasMore: false, pagination: undefined });
      return;
    }

    const cb = (results: any[], status: string, nextPagination: any) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        resolve({
          results: Array.isArray(results) ? results : [],
          hasMore: Boolean(nextPagination?.hasNextPage),
          pagination: nextPagination,
        });
        return;
      }
      if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        resolve({ results: [], hasMore: false, pagination: nextPagination });
        return;
      }
      reject(new Error(`Google nextPage failed: ${status}`));
    };

    // Places pagination은 즉시 호출 시 INVALID_REQUEST가 날 수 있어 짧게 대기
    pagination.nextPage(cb);
  });
}

function googleRequestLanguage(): string {
  return placesLanguage();
}

export async function searchPlacesUnifiedWithGoogle(
  params: GoogleUnifiedSearchParams
): Promise<GooglePlacesSearchResult> {
  if (!window.google?.maps?.places) {
    throw new Error('Google Maps SDK not loaded');
  }
  const language = googleRequestLanguage();
  const keyword = params.keyword?.trim() ?? '';
  const categoryType = mapKakaoCategoryToGoogleType(params.categoryGroupCode);
  const nearby = params.scope === 'nearby';
  const center = params.center;
  const radius = params.radiusMeters ?? 5000;

  const page = Math.max(1, params.page ?? 1);

  if (!keyword && !categoryType) {
    return { places: [], page: 1, hasMore: false };
  }

  let raw: { results: any[]; hasMore: boolean; pagination?: any };
  if (nearby && center) {
    raw = await nearbySearchOnce({
      location: new window.google.maps.LatLng(center.lat, center.lng),
      radius,
      language,
      ...(keyword ? { keyword } : {}),
      ...(categoryType ? { type: categoryType } : {}),
    });
  } else {
    const query = [keyword, categoryType].filter(Boolean).join(' ').trim();
    if (!query) return { places: [], page: 1, hasMore: false };
    raw = await textSearchOnce({
      query,
      language,
      ...(center ? { location: new window.google.maps.LatLng(center.lat, center.lng), radius } : {}),
    });
  }

  const places = raw.results
    .map((r) => normalizeGooglePlace(r))
    .filter((p): p is Place => Boolean(p))
    .slice(0, params.size ?? 15);

  let current = raw;
  if (page > 1) {
    for (let i = 2; i <= page; i++) {
      if (!current.pagination?.hasNextPage) {
        return { places: [], page, hasMore: false };
      }
      await wait(1200);
      current = await fetchNextPage(current.pagination);
    }
  }

  const pagePlaces = current.results
    .map((r) => normalizeGooglePlace(r))
    .filter((p): p is Place => Boolean(p))
    .slice(0, params.size ?? 15);

  return { places: pagePlaces, page, hasMore: current.hasMore };
}

