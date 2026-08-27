/** Vite dev / Netlify Edge 프록시 경유 (브라우저 CORS 우회) */
export const KAKAO_PLACE_API_BASE = '/api/kakao-place';

const FETCH_TIMEOUT_MS = 12_000;

export async function fetchKakaoPlaceJson<T = unknown>(
  path: string
): Promise<T | null> {
  try {
    // Origin·Referer·User-Agent·Pf는 프록시가 주입 (브라우저 fetch로는 설정 불가)
    const res = await fetch(`${KAKAO_PLACE_API_BASE}${path}`, {
      headers: { Accept: 'application/json, text/plain, */*' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** 외부 CDN 이미지를 로컬 프록시 경유 (hotlink·CORS 우회) */
export function proxiedThumbnailUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const parsed = new URL(url);
    const path = `${parsed.pathname}${parsed.search}`;
    if (parsed.hostname === 't1.daumcdn.net') {
      return `/api/kakao-img-t1${path}`;
    }
    if (/^img\d*\.kakaocdn\.net$/i.test(parsed.hostname)) {
      return `/api/kakao-img-cdn${path}`;
    }
    if (parsed.hostname === 'postfiles.pstatic.net') {
      return `/api/kakao-img-naver${path}`;
    }
  } catch {
    return url;
  }
  return url;
}
