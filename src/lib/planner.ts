import type {
  PinnedPlace,
  RouteOptions,
  RouteLeg,
  GeneratedRoute,
  Origin,
  TripTheme,
} from '../types';
import { TRAVEL_MODE_META, suggestStayMinutes } from './categories';
import { computeFatigue } from './fatigue';
import { themeBoostScore } from './themes';

// =============================================
// Haversine 거리 계산 (meters)
// =============================================

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** 직선 거리 * 도로 보정 계수 (실제 도로는 직선의 1.3배 정도) */
const ROAD_FACTOR = 1.3;

export function estimateLegDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  return Math.round(haversineMeters(a, b) * ROAD_FACTOR);
}

export function estimateLegMinutes(
  distanceMeters: number,
  mode: keyof typeof TRAVEL_MODE_META
): number {
  const speed = TRAVEL_MODE_META[mode].speedKmh;
  const hours = distanceMeters / 1000 / speed;
  return Math.max(1, Math.round(hours * 60));
}

// =============================================
// 자동 순서 최적화: Nearest Neighbor
// =============================================

function nearestNeighborOrder(
  origin: { lat: number; lng: number } | undefined,
  places: PinnedPlace[],
  preferences?: TripTheme[]
): PinnedPlace[] {
  if (places.length <= 1) return [...places];
  const remaining = [...places];
  const ordered: PinnedPlace[] = [];
  let current: { lat: number; lng: number } =
    origin ?? { lat: remaining[0].lat, lng: remaining[0].lng };

  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversineMeters(current, remaining[i]);
      const boost = themeBoostScore(preferences, remaining[i].category);
      const priority = remaining[i].priority ?? 3;
      const score = d - boost * 500 - priority * 200;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    const next = remaining.splice(bestIdx, 1)[0];
    ordered.push(next);
    current = { lat: next.lat, lng: next.lng };
  }
  return ordered;
}

export function optimizeOrderByNearestNeighbor(
  origin: { lat: number; lng: number } | undefined,
  places: PinnedPlace[],
  preferences?: TripTheme[]
): PinnedPlace[] {
  if (places.length <= 1) return places.map((p, i) => ({ ...p, order: i + 1 }));

  const required = places
    .filter((p) => p.required)
    .sort((a, b) => (b.priority ?? 3) - (a.priority ?? 3));
  const optional = places.filter((p) => !p.required);

  const orderedRequired = nearestNeighborOrder(origin, required, preferences);
  const lastRequired = orderedRequired[orderedRequired.length - 1];
  const continueFrom = lastRequired
    ? { lat: lastRequired.lat, lng: lastRequired.lng }
    : origin;
  const orderedOptional = nearestNeighborOrder(continueFrom, optional, preferences);

  const merged = [...orderedRequired, ...orderedOptional];
  return merged.map((p, i) => ({ ...p, order: i + 1 }));
}

// =============================================
// 시간 유틸 ("HH:MM" 양방향 변환)
// =============================================

function parseHHMM(s: string): number {
  const [h, m] = s.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}
function formatHHMM(totalMin: number): string {
  const m = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// =============================================
// 식사 시간 반영: 점심(12:00~13:30) 시간대에
// 맛집 카테고리가 있으면 그 시간대에 도착하도록 보정
// =============================================

function adjustForMealTime(
  schedule: Array<{ place: PinnedPlace; arrive: number; leave: number }>,
  enabled: boolean
): Array<{ place: PinnedPlace; arrive: number; leave: number }> {
  if (!enabled) return schedule;
  // 가장 먼저 등장하는 food를 점심 시간대로 슬라이드
  const lunchStart = 11 * 60 + 30; // 11:30
  const lunchEnd = 13 * 60 + 30;   // 13:30
  const foodIdx = schedule.findIndex((s) => s.place.category === 'food');
  if (foodIdx === -1) return schedule;

  const food = schedule[foodIdx];
  if (food.arrive >= lunchStart && food.arrive <= lunchEnd) return schedule;

  // 도착시간이 점심 시간대 이전이면, 식사시간으로 미루기
  if (food.arrive < lunchStart) {
    const shift = lunchStart - food.arrive;
    return schedule.map((s, i) => (i >= foodIdx ? { ...s, arrive: s.arrive + shift, leave: s.leave + shift } : s));
  }
  return schedule;
}

// =============================================
// 메인: 경로 생성
// =============================================

export function generateRoute(
  pinned: PinnedPlace[],
  options: RouteOptions
): GeneratedRoute {
  // 1. 체류시간 자동 추천 적용
  const withStay = pinned.map((p) => ({
    ...p,
    stayMinutes:
      options.autoStayTime && (p.stayMinutes === undefined || p.stayMinutes === null)
        ? suggestStayMinutes(p.category).minutes
        : p.stayMinutes ?? suggestStayMinutes(p.category).minutes,
  }));

  // 2. 순서 결정
  const originPoint = options.origin.lat !== undefined && options.origin.lng !== undefined
    ? { lat: options.origin.lat, lng: options.origin.lng }
    : undefined;

  const ordered = options.autoOrder
    ? optimizeOrderByNearestNeighbor(originPoint, withStay, options.preferences)
    : withStay.map((p, i) => ({ ...p, order: i + 1 }));

  // 3. 구간별 거리/시간 계산 + 도착·출발 시각
  const legs: RouteLeg[] = [];
  const departMin = parseHHMM(options.departTime);
  let cursor = departMin;

  const stops: GeneratedRoute['stops'] = [];

  let prevPoint: { lat: number; lng: number } | undefined = originPoint;
  let prevId = 'origin';

  for (let i = 0; i < ordered.length; i++) {
    const place = ordered[i];
    if (prevPoint) {
      const dist = estimateLegDistance(prevPoint, place);
      const travelMin = estimateLegMinutes(dist, options.travelMode);
      legs.push({
        fromId: prevId,
        toId: place.id,
        distanceMeters: dist,
        durationMinutes: travelMin,
      });
      cursor += travelMin;
    }
    const arrive = cursor;
    const stay = place.stayMinutes ?? 0;
    const leave = arrive + stay;
    stops.push({
      ...place,
      arriveAt: formatHHMM(arrive),
      leaveAt: formatHHMM(leave),
    });
    cursor = leave;
    prevPoint = { lat: place.lat, lng: place.lng };
    prevId = place.id;
  }

  // 4. 식사시간 반영 (선택 옵션)
  if (options.reflectMealTime) {
    const sched = stops.map((s) => ({
      place: s,
      arrive: parseHHMM(s.arriveAt),
      leave: parseHHMM(s.leaveAt),
    }));
    const adjusted = adjustForMealTime(sched, true);
    adjusted.forEach((a, i) => {
      stops[i] = {
        ...stops[i],
        arriveAt: formatHHMM(a.arrive),
        leaveAt: formatHHMM(a.leave),
      };
    });
    cursor = adjusted.length > 0 ? adjusted[adjusted.length - 1].leave : cursor;
  }

  const totalDistanceM = legs.reduce((s, l) => s + l.distanceMeters, 0);
  const totalTravelMin = legs.reduce((s, l) => s + l.durationMinutes, 0);
  const totalStayMin = stops.reduce((s, p) => s + (p.stayMinutes ?? 0), 0);

  const route: GeneratedRoute = {
    origin: options.origin,
    stops,
    legs,
    totalDistanceKm: Math.round(totalDistanceM / 100) / 10,
    totalTravelMinutes: totalTravelMin,
    totalStayMinutes: totalStayMin,
    finishAt: formatHHMM(cursor),
    options,
  };
  const fatigue = computeFatigue(route);
  return { ...route, fatigueScore: fatigue.score, fatigueLevel: fatigue.level };
}

// =============================================
// 비동기 버전: 실제 길찾기 API 결과로 재계산
// =============================================

/**
 * generateRoute로 만든 경로의 각 leg를 실제 길찾기 API 결과로 갱신합니다.
 * (출발지부터 마지막 stop까지 순서대로 호출)
 */
export async function refineRouteWithRealLegs(
  route: GeneratedRoute,
  fetchLegs: (
    points: Array<{ lat: number; lng: number }>,
    mode: GeneratedRoute['options']['travelMode']
  ) => Promise<
    Array<{
      distanceMeters: number;
      durationMinutes: number;
      polyline?: Array<{ lat: number; lng: number }>;
      source?: 'api' | 'estimate';
    }>
  >
): Promise<GeneratedRoute> {
  const points: Array<{ lat: number; lng: number }> = [];
  if (route.origin.lat && route.origin.lng) {
    points.push({ lat: route.origin.lat, lng: route.origin.lng });
  }
  route.stops.forEach((s) => points.push({ lat: s.lat, lng: s.lng }));

  const newLegs = await fetchLegs(points, route.options.travelMode);

  // 도착·출발 시각 재계산
  const departMin = (() => {
    const [h, m] = route.options.departTime.split(':').map((n) => parseInt(n, 10));
    return h * 60 + m;
  })();
  let cursor = departMin;
  const stops = route.stops.map((s, i) => {
    cursor += newLegs[i]?.durationMinutes ?? 0;
    const arrive = cursor;
    const stay = s.stayMinutes ?? 0;
    const leave = arrive + stay;
    cursor = leave;
    const arriveStr = formatMinutes(arrive);
    const leaveStr = formatMinutes(leave);
    return { ...s, arriveAt: arriveStr, leaveAt: leaveStr };
  });

  const legs = newLegs.map((nl, i) => ({
    fromId: i === 0 ? 'origin' : route.stops[i - 1].id,
    toId: route.stops[i].id,
    distanceMeters: nl.distanceMeters,
    durationMinutes: nl.durationMinutes,
    source: nl.source,
  }));

  const totalDistanceM = legs.reduce((s, l) => s + l.distanceMeters, 0);
  const totalTravelMin = legs.reduce((s, l) => s + l.durationMinutes, 0);

  const routePath: Array<{ lat: number; lng: number }> = [];
  for (const leg of newLegs) {
    if (leg.polyline?.length) {
      if (routePath.length > 0) {
        const last = routePath[routePath.length - 1];
        const first = leg.polyline[0];
        if (last.lat === first.lat && last.lng === first.lng) {
          routePath.push(...leg.polyline.slice(1));
        } else {
          routePath.push(...leg.polyline);
        }
      } else {
        routePath.push(...leg.polyline);
      }
    }
  }

  const refined: GeneratedRoute = {
    ...route,
    legs,
    stops,
    totalDistanceKm: Math.round(totalDistanceM / 100) / 10,
    totalTravelMinutes: totalTravelMin,
    finishAt: formatMinutes(cursor),
    routePath: routePath.length > 0 ? routePath : undefined,
  };
  const fatigue = computeFatigue(refined);
  return { ...refined, fatigueScore: fatigue.score, fatigueLevel: fatigue.level };
}

function formatMinutes(totalMin: number): string {
  const m = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
