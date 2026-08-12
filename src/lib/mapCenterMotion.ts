export interface MapLatLng {
  lat: number;
  lng: number;
}

/** 드래그 동기화 등 미세 좌표 차이는 애니메이션 생략 */
export function mapCentersNear(
  a: MapLatLng,
  b: MapLatLng,
  epsilon = 0.000015
): boolean {
  return Math.abs(a.lat - b.lat) < epsilon && Math.abs(a.lng - b.lng) < epsilon;
}

export interface ApplyMapCenterOptions {
  /** 최초 1회는 즉시 이동 (초기화) */
  isInitial?: boolean;
  /** true면 panTo, false면 setCenter */
  animate?: boolean;
}

/** Kakao / Google 공통 — 칩·검색 결과 선택 시 부드럽게 이동 */
export function shouldAnimateMapCenter(
  current: MapLatLng | null,
  target: MapLatLng,
  opts?: ApplyMapCenterOptions
): boolean {
  if (opts?.isInitial) return false;
  if (opts?.animate === false) return false;
  if (current && mapCentersNear(current, target)) return false;
  return true;
}
