/** 카카오맵 축척 ~50m (로드맵 기준 레벨 3) */
export const KAKAO_LEVEL_50M = 3;

/** 기본 개요 레벨 */
export const KAKAO_LEVEL_DEFAULT = 5;

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
