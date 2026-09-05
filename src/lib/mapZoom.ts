/** 카카오맵 축척 ~50m (로드맵 기준 레벨 3) */
export const KAKAO_LEVEL_50M = 3;

/** 기본 개요 레벨 */
export const KAKAO_LEVEL_DEFAULT = 5;

/**
 * 장소 상세를 열었을 때 맞출 축척.
 * 주변 골목·건물이 보일 만큼 당기되(4 ≈ 100m), 주변 지형지물이 사라져
 * "여기가 어디인지" 감이 없어질 정도로 붙이지는 않는 선.
 */
export const KAKAO_LEVEL_PLACE_FOCUS = 4;

/**
 * 화면 가로 픽셀 오프셋 → 경도 차이.
 *
 * 장소 상세를 지도 옆에 붙이면 지도의 가운데가 패널에 가린다. 대상 좌표를
 * 그냥 중심에 놓으면 정작 그 장소가 패널 뒤로 들어가므로, 중심을 서쪽으로
 * 밀어 대상이 남는 지도 영역 한가운데 오도록 만든다.
 *
 * 웹 메르카토르 기준 타일 1장 = 256px, 줌 z에서 세계 폭 = 256·2^z px.
 */
export function lngOffsetForPixels(pixels: number, kakaoLevel: number): number {
  const zoom = kakaoLevelToGoogleZoom(kakaoLevel);
  const degreesPerPixel = 360 / (256 * Math.pow(2, zoom));
  return pixels * degreesPerPixel;
}

/**
 * 카카오 레벨 → Google zoom (축척 근사)
 * 레벨 3 ≈ 50m → Google zoom 17
 */
export function kakaoLevelToGoogleZoom(level: number): number {
  const table: Record<number, number> = {
    1: 19,
    2: 18,
    3: 17,
    4: 16,
    5: 15,
    6: 14,
    7: 13,
    8: 12,
    9: 11,
    10: 10,
    11: 9,
    12: 8,
    13: 7,
    14: 6,
  };
  return table[level] ?? Math.max(3, Math.min(21, 20 - level));
}

export function googleZoomToKakaoLevel(zoom: number): number {
  const z = Math.round(zoom);
  for (let level = 1; level <= 14; level++) {
    if (kakaoLevelToGoogleZoom(level) === z) return level;
  }
  if (z >= 19) return 1;
  if (z <= 6) return 14;
  return Math.max(1, Math.min(14, 20 - z));
}

/** 플래너에서 구글 지도가 대륙/세계 축척으로 풀리지 않도록 하한 */
export const MIN_PLANNER_GOOGLE_ZOOM = 12;

/** 저장된 카카오 레벨이 구글에서 너무 멀면 기본 줌으로 복구 */
export function googleZoomForPlannerLevel(level: number): {
  zoom: number;
  recoveredLevel: number | null;
} {
  const zoom = kakaoLevelToGoogleZoom(level);
  if (zoom >= MIN_PLANNER_GOOGLE_ZOOM) {
    return { zoom, recoveredLevel: null };
  }
  return {
    zoom: kakaoLevelToGoogleZoom(KAKAO_LEVEL_DEFAULT),
    recoveredLevel: KAKAO_LEVEL_DEFAULT,
  };
}
