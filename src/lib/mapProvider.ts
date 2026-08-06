export type MapProvider = 'kakao' | 'google';
type MapProviderForce = MapProvider | 'auto';
type MapProviderChoice = MapProvider | 'auto';

const KOREA_BOUNDS = {
  latMin: 32.5,
  latMax: 39.5,
  lngMin: 123.0,
  lngMax: 132.5,
};

export function isKoreaRegion(center: { lat: number; lng: number }): boolean {
  return (
    center.lat >= KOREA_BOUNDS.latMin &&
    center.lat <= KOREA_BOUNDS.latMax &&
    center.lng >= KOREA_BOUNDS.lngMin &&
    center.lng <= KOREA_BOUNDS.lngMax
  );
}

export function inferMapProviderFromLocation(center: { lat: number; lng: number }): MapProvider {
  return resolveMapProvider(center, 'auto');
}

export function resolveMapProvider(
  center: { lat: number; lng: number },
  choice: MapProviderChoice = 'auto'
): MapProvider {
  const hasGoogleKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY);

  if (choice === 'google' && hasGoogleKey) return 'google';
  if (choice === 'kakao') return 'kakao';

  const force = String(import.meta.env.VITE_MAP_PROVIDER_FORCE ?? 'auto')
    .trim()
    .toLowerCase() as MapProviderForce;
  if (force === 'google' && hasGoogleKey) return 'google';
  if (force === 'kakao') return 'kakao';

  if (!isKoreaRegion(center) && hasGoogleKey) return 'google';
  return 'kakao';
}
