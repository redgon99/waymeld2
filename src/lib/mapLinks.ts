import type { GeneratedRoute, TravelMode } from '../types';

export interface PlaceMapLinks {
  kakao: string;
  naver: string;
  google: string;
}

interface MapPoint {
  name: string;
  lat: number;
  lng: number;
  address?: string;
}

/** 장소별 외부 지도 링크 (Kakao / Naver / Google) */
export function buildPlaceMapLinks(point: MapPoint): PlaceMapLinks {
  const name = point.name || '장소';
  const enc = encodeURIComponent;
  const addr = point.address ?? `${point.lat},${point.lng}`;
  return {
    kakao: `https://map.kakao.com/link/map/${enc(name)},${point.lat},${point.lng}`,
    naver: `https://map.naver.com/v5/search/${enc(addr)}?c=${point.lng},${point.lat},15,0,0,0,dh`,
    google: `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`,
  };
}

/** 구간별 길찾기 링크 */
export function buildLegMapLinks(
  from: MapPoint,
  to: MapPoint,
  mode: TravelMode = 'car'
): PlaceMapLinks {
  const enc = encodeURIComponent;
  const kakaoSegment =
    mode === 'transit' ? 'public' : mode === 'walk' ? 'walk' : mode === 'bike' ? 'bicycle' : 'car';
  if (mode === 'car') {
    return {
      kakao: `https://map.kakao.com/?sX=${from.lng}&sY=${from.lat}&sName=${enc(from.name)}&eX=${to.lng}&eY=${to.lat}&eName=${enc(to.name)}`,
      naver: `https://map.naver.com/v5/directions/${from.lng},${from.lat},${enc(from.name)}/${to.lng},${to.lat},${enc(to.name)}`,
      google: `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=driving`,
    };
  }
  return {
    kakao: `https://map.kakao.com/link/by/${kakaoSegment}/${enc(from.name)},${from.lat},${from.lng}/${enc(to.name)},${to.lat},${to.lng}`,
    naver: `https://map.naver.com/v5/directions/${from.lng},${from.lat},${enc(from.name)}/${to.lng},${to.lat},${enc(to.name)}`,
    google: `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lng}&destination=${to.lat},${to.lng}&travelmode=${mode === 'walk' ? 'walking' : mode === 'transit' ? 'transit' : 'bicycling'}`,
  };
}

/** 카카오맵 길찾기 링크 (이동수단별) */
export function buildKakaoMapDirectionsUrl(route: GeneratedRoute): string {
  if (route.stops.length === 0) return 'https://map.kakao.com/';

  const mode = route.options.travelMode;
  if (mode === 'car') {
    return buildCarMapUrl(route);
  }
  return buildPointToPointUrl(route, mode);
}

function buildCarMapUrl(route: GeneratedRoute): string {
  const last = route.stops[route.stops.length - 1];
  const params: string[] = [];

  if (route.origin.lat && route.origin.lng) {
    params.push(`sX=${route.origin.lng}`);
    params.push(`sY=${route.origin.lat}`);
    params.push(`sName=${encodeURIComponent(route.origin.label)}`);
  }
  params.push(`eX=${last.lng}`);
  params.push(`eY=${last.lat}`);
  params.push(`eName=${encodeURIComponent(last.name)}`);

  if (route.stops.length > 1) {
    const viaList = route.stops.slice(0, -1).map(
      (s) => `${encodeURIComponent(s.name)},${s.lng},${s.lat}`
    );
    params.push(`via=${viaList.join(',')}`);
  }

  return `https://map.kakao.com/?${params.join('&')}`;
}

/** 도보·대중교통·자전거: 카카오맵 by 링크 (최대 출발·도착 2지점) */
function buildPointToPointUrl(route: GeneratedRoute, mode: TravelMode): string {
  const segment =
    mode === 'transit' ? 'public' : mode === 'bike' ? 'bicycle' : 'walk';

  const from = route.origin.lat && route.origin.lng
    ? {
        name: route.origin.label || '출발',
        lat: route.origin.lat,
        lng: route.origin.lng,
      }
    : {
        name: route.stops[0].name,
        lat: route.stops[0].lat,
        lng: route.stops[0].lng,
      };

  const to = route.stops[route.stops.length - 1];
  const enc = (s: string) => encodeURIComponent(s);
  return `https://map.kakao.com/link/by/${segment}/${enc(from.name)},${from.lat},${from.lng}/${enc(to.name)},${to.lat},${to.lng}`;
}

/** 로드뷰 새 탭 링크 */
export function buildKakaoRoadviewUrl(lat: number, lng: number): string {
  return `https://map.kakao.com/link/roadview/${lat},${lng}`;
}
