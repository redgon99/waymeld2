import type { RouteOptions } from '../types';
import type { Trip } from './trips';

export const DEFAULT_ROUTE_OPTIONS: RouteOptions = {
  origin: { type: 'current', label: '현재 위치' },
  departTime: '09:00',
  travelMode: 'car',
  optimizeBy: 'distance',
  autoOrder: true,
  reflectMealTime: true,
  autoStayTime: true,
  useHighway: true,
  useRealTimeTraffic: false,
};

/** 저장 데이터 호환 + 일차별 옵션 보장 */
export function normalizeTrip(trip: Trip): Trip {
  const totalDays = Math.max(trip.totalDays, 1);
  const legacy = trip.routeOptions ?? DEFAULT_ROUTE_OPTIONS;
  const byDay: Record<number, RouteOptions> = {
    ...(trip.routeOptionsByDay ?? {}),
  };

  for (let d = 1; d <= totalDays; d++) {
    if (!byDay[d]) {
      byDay[d] = { ...DEFAULT_ROUTE_OPTIONS, ...legacy };
    }
  }

  const currentDay = Math.min(Math.max(trip.currentDay, 1), totalDays);
  return {
    ...trip,
    totalDays,
    currentDay,
    routeOptionsByDay: byDay,
    routeOptions: byDay[currentDay],
    materials: Array.isArray(trip.materials) ? trip.materials : [],
  };
}

export function getRouteOptionsForDay(trip: Trip, day: number): RouteOptions {
  const normalized = normalizeTrip(trip);
  return normalized.routeOptionsByDay[day] ?? DEFAULT_ROUTE_OPTIONS;
}

export function patchRouteOptionsForDay(
  trip: Trip,
  day: number,
  options: RouteOptions
): Trip {
  const normalized = normalizeTrip(trip);
  return {
    ...normalized,
    routeOptionsByDay: { ...normalized.routeOptionsByDay, [day]: options },
    routeOptions: day === normalized.currentDay ? options : normalized.routeOptions,
    updatedAt: Date.now(),
  };
}

export function copyRouteOptionsFromDay(
  trip: Trip,
  fromDay: number,
  toDay: number
): Trip {
  const source = getRouteOptionsForDay(trip, fromDay);
  return patchRouteOptionsForDay(trip, toDay, {
    ...source,
    origin: { ...source.origin },
  });
}
