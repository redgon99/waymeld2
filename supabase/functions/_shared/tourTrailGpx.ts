/**
 * 두루누비 코스의 gpxpath는 durunubi.kr이 직접 서빙하는 정적 파일이라
 * 브라우저에서 바로 fetch하면 CORS로 막힌다(Access-Control-Allow-Origin 없음).
 * 서버에서 대신 받아 trkpt 좌표만 뽑아 가볍게 내려준다.
 */

const ALLOWED_HOSTS = new Set(['www.durunubi.kr', 'durunubi.kr']);

/** 임의 URL을 그대로 fetch하는 오픈 프록시가 되지 않도록 두루누비 도메인만 허용 */
export function isAllowedGpxUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && ALLOWED_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export interface GpxPoint {
  lat: number;
  lng: number;
}

/** 코스 하나가 수백~수천 트랙포인트를 가질 수 있어(예: 973개/13km) 지도에 그리기 적당한 개수로 솎아낸다 */
export function downsamplePoints(points: GpxPoint[], maxPoints = 200): GpxPoint[] {
  if (points.length <= maxPoints) return points;
  const step = points.length / maxPoints;
  const out: GpxPoint[] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(points[Math.floor(i * step)]);
  }
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

export function parseGpxTrackPoints(gpxText: string): GpxPoint[] {
  const points: GpxPoint[] = [];
  const re = /<trkpt\s+lat="(-?[\d.]+)"\s+lon="(-?[\d.]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(gpxText)) !== null) {
    const lat = parseFloat(m[1]);
    const lng = parseFloat(m[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) points.push({ lat, lng });
  }
  return points;
}

export async function fetchGpxRoute(gpxUrl: string): Promise<GpxPoint[]> {
  const res = await fetch(gpxUrl, { headers: { Accept: 'application/gpx+xml,text/xml,*/*' } });
  if (!res.ok) return [];
  const text = await res.text();
  return downsamplePoints(parseGpxTrackPoints(text));
}
