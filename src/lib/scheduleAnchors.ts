import type { PinnedPlace, RouteStop, TripTheme } from '../types';
import { haversineMeters } from './geo';
import { themeBoostScore } from './themes';
import { formatHHMM, isValidHHMM, parseHHMM } from './timeOfDay';

/**
 * 시각이 정해진 일정을 경로에 반영한다.
 *
 * 앵커는 두 종류다.
 * - 소프트 앵커(일반 핀 + fixedArrival): "가급적 이 시각에". 일찍 도착하면 기다리고,
 *   그만큼 뒤 일정이 통째로 밀린다.
 * - 하드 앵커(예약 아이템): "이 시각에 그 자리에서 시작된다". 공연·투어처럼
 *   내가 늦어도 시작 시각과 끝나는 시각이 바뀌지 않으므로 블록을 고정하고
 *   지각한 만큼만 기록한다.
 */

export function hasFixedArrival(place: Pick<PinnedPlace, 'fixedArrival'>): boolean {
  return isValidHHMM(place.fixedArrival);
}

/** 하드 앵커 — 예약이면서 시작 시각이 정해진 아이템 */
export function isHardAnchor(
  place: Pick<PinnedPlace, 'fixedArrival' | 'itemKind'>,
): boolean {
  return place.itemKind === 'reserved' && isValidHHMM(place.fixedArrival);
}

function fixedMinutes(place: PinnedPlace): number {
  return parseHHMM(place.fixedArrival as string);
}

type Point = { lat: number; lng: number };

/**
 * 고정 도착 장소를 시각 순으로 먼저 배치하고, 나머지는 추가 이동거리가
 * 가장 적은 자리에 끼워 넣는다(cheapest insertion). 고정 장소끼리의
 * 선후 관계는 어떤 삽입으로도 깨지지 않는다.
 */
export function orderWithFixedArrivals(
  origin: Point | undefined,
  places: PinnedPlace[],
  preferences?: TripTheme[],
): PinnedPlace[] {
  const anchors = places
    .filter(hasFixedArrival)
    .sort((a, b) => fixedMinutes(a) - fixedMinutes(b));
  const free = places
    .filter((p) => !hasFixedArrival(p))
    .sort((a, b) => {
      const requiredDiff = Number(Boolean(b.required)) - Number(Boolean(a.required));
      if (requiredDiff !== 0) return requiredDiff;
      return (b.priority ?? 3) - (a.priority ?? 3);
    });

  const route: PinnedPlace[] = [...anchors];

  for (const place of free) {
    // 테마·중요도가 높으면 약간의 우회는 감수한다
    const discount =
      themeBoostScore(preferences, place.category) * 500 + (place.priority ?? 3) * 200;

    let bestIndex = route.length;
    let bestCost = Infinity;

    for (let i = 0; i <= route.length; i++) {
      const prev: Point | undefined = i === 0 ? origin : route[i - 1];
      const next: Point | undefined = i < route.length ? route[i] : undefined;

      let cost: number;
      if (prev && next) {
        cost = haversineMeters(prev, place) + haversineMeters(place, next) - haversineMeters(prev, next);
      } else if (prev) {
        cost = haversineMeters(prev, place);
      } else if (next) {
        cost = haversineMeters(place, next);
      } else {
        cost = 0;
      }

      const score = cost - discount;
      if (score < bestCost) {
        bestCost = score;
        bestIndex = i;
      }
    }

    route.splice(bestIndex, 0, place);
  }

  return route.map((p, i) => ({ ...p, order: i + 1 }));
}

/**
 * 계산된 도착·출발 시각에 앵커를 덮어씌운다.
 *
 * 이동시간 자체는 이미 계산돼 있으므로, 각 정거장 사이의 간격(= 이동시간)을 유지한 채
 * 앵커 시각에 맞춰 앞뒤를 다시 맞춘다.
 *
 * - 소프트 앵커: 일찍 도착 → 대기 후 이후 일정 전체를 뒤로 민다.
 *                늦게 도착 → 되돌릴 수 없으므로 실제 시각을 두고 충돌로 표시.
 * - 하드 앵커(예약): 늦게 도착해도 블록은 그대로. 지각한 분만 기록하고
 *                   이후 일정은 예약 종료 시각부터 다시 이어간다.
 */
export function applyTimeAnchors(
  stops: RouteStop[],
): { stops: RouteStop[]; finishMinutes: number | null } {
  if (stops.length === 0) return { stops, finishMinutes: null };
  if (!stops.some(hasFixedArrival)) return { stops, finishMinutes: null };

  let shift = 0;
  let lastLeave = 0;

  const next: RouteStop[] = stops.map((stop) => {
    const stay = stop.stayMinutes ?? 0;
    const scheduled = parseHHMM(stop.arriveAt) + shift;
    let arrive = scheduled;
    let waitMinutes: number | undefined;
    let timingConflict: number | undefined;

    if (hasFixedArrival(stop)) {
      const target = fixedMinutes(stop);
      if (target >= scheduled) {
        const wait = target - scheduled;
        shift += wait;
        arrive = target;
        waitMinutes = wait > 0 ? wait : undefined;
      } else if (isHardAnchor(stop)) {
        // 예약은 내가 늦어도 그 시각에 시작한다 — 블록을 되돌려 고정하고 지각만 기록
        timingConflict = scheduled - target;
        shift -= timingConflict;
        arrive = target;
      } else {
        timingConflict = scheduled - target;
      }
    }

    lastLeave = arrive + stay;
    return {
      ...stop,
      arriveAt: formatHHMM(arrive),
      leaveAt: formatHHMM(lastLeave),
      waitMinutes,
      timingConflict,
    };
  });

  return { stops: next, finishMinutes: lastLeave };
}

export interface AnchorConflict {
  placeId: string;
  name: string;
  fixedArrival: string;
  lateMinutes: number;
  hard: boolean;
}

/** 지킬 수 없는 앵커 목록 — UI 경고에 쓴다 */
export function listAnchorConflicts(stops: RouteStop[]): AnchorConflict[] {
  return stops
    .filter((stop) => stop.timingConflict && stop.fixedArrival)
    .map((stop) => ({
      placeId: stop.id,
      name: stop.name,
      fixedArrival: stop.fixedArrival as string,
      lateMinutes: stop.timingConflict as number,
      hard: isHardAnchor(stop),
    }));
}
