import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import type { IncomingMessage, ServerResponse } from 'http';
import type { ClientRequest } from 'http';

function kakaoProxyHeaders(proxyReq: ClientRequest, _req: IncomingMessage) {
  proxyReq.setHeader('Accept', 'application/json, text/plain, */*');
  proxyReq.setHeader('Origin', 'https://place.map.kakao.com');
  proxyReq.setHeader('Referer', 'https://place.map.kakao.com/');
  proxyReq.setHeader(
    'User-Agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );
  proxyReq.setHeader('Pf', 'web');
}

function buildTourSearchUrl(keyword: string, serviceKey: string): string {
  const params = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'WayMeld',
    _type: 'json',
    keyword: keyword.trim(),
    numOfRows: '10',
    pageNo: '1',
    arrange: 'C',
  });
  const base = 'https://apis.data.go.kr/B551011/KorService2/searchKeyword2';
  const keyPart = serviceKey.includes('%')
    ? `serviceKey=${serviceKey}`
    : `serviceKey=${encodeURIComponent(serviceKey)}`;
  return `${base}?${keyPart}&${params.toString()}`;
}

/** 로컬 dev: Tour API CORS 우회 (VITE_TOUR_API_KEY 필요) */
function tourApiDevProxyPlugin(tourApiKey: string) {
  return {
    name: 'tour-api-dev-proxy',
    configureServer(server: { middlewares: { use: Function } }) {
      server.middlewares.use(
        '/api/tour-search',
        async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
          if (req.method !== 'GET') {
            next();
            return;
          }
          if (!tourApiKey) {
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'VITE_TOUR_API_KEY not set' }));
            return;
          }
          try {
            const url = new URL(req.url ?? '', 'http://localhost');
            const keyword = url.searchParams.get('keyword') ?? '';
            const upstream = await fetch(buildTourSearchUrl(keyword, tourApiKey), {
              headers: { Accept: 'application/json' },
            });
            const text = await upstream.text();
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/json');
            res.end(text);
          } catch (e) {
            console.error('[tour-api-dev-proxy]', e);
            res.statusCode = 502;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Tour API proxy failed' }));
          }
        }
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const tourApiKey = env.VITE_TOUR_API_KEY ?? '';

  return {
  plugins: [
    react(),
    tourApiDevProxyPlugin(tourApiKey),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '여로담 — 가고 싶은 곳을 담으면, 여행길이 됩니다',
        short_name: '여로담',
        description: '장소를 담고 여행길을 엮는 WayMeld',
        theme_color: '#1f2937',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/',
        lang: 'ko',
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api/kakao-place': {
        target: 'https://place-api.map.kakao.com/places',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kakao-place/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', kakaoProxyHeaders);
        },
      },
      '/api/kakao-img-t1': {
        target: 'https://t1.daumcdn.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kakao-img-t1/, ''),
      },
      '/api/kakao-img-cdn': {
        target: 'https://img1.kakaocdn.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kakao-img-cdn/, ''),
      },
      '/api/kakao-img-naver': {
        target: 'https://postfiles.pstatic.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/kakao-img-naver/, ''),
      },
    },
  },
  };
});
