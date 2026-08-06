/** 카카오맵 장소 페이지 — 사진 탭(딥링크) */
export function buildKakaoPhotosUrl(placeId: string, placeUrl?: string): string {
  const base =
    placeUrl?.replace(/[#?].*$/, '').replace(/\/$/, '') ||
    `https://place.map.kakao.com/${placeId}`;
  return `${base}#photo`;
}
