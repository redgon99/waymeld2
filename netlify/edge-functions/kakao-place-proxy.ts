/** Kakao Place API 프록시 — Vite dev proxy와 동일한 upstream 헤더 주입 (406 방지) */
const KAKAO_UPSTREAM = 'https://place-api.map.kakao.com/places';

const KAKAO_PROXY_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://place.map.kakao.com',
  Referer: 'https://place.map.kakao.com/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Pf: 'web',
};

export default async (request: Request) => {
  const url = new URL(request.url);
  const subpath = url.pathname.replace(/^\/api\/kakao-place/, '') || '/';
  const target = `${KAKAO_UPSTREAM}${subpath}${url.search}`;

  const upstream = await fetch(target, {
    method: request.method,
    headers: KAKAO_PROXY_HEADERS,
  });

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get('Content-Type');
  if (contentType) responseHeaders.set('Content-Type', contentType);
  responseHeaders.set('Cache-Control', 'public, max-age=300');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
};

export const config = { path: '/api/kakao-place/*' };
