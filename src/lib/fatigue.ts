import type { FatigueLevel, GeneratedRoute } from '../types';

export function computeFatigue(route: GeneratedRoute): {
  score: number;
  level: FatigueLevel;
} {
  const stops = route.stops.length;
  const travel = route.totalTravelMinutes;
  const stay = route.totalStayMinutes;
  const walkBonus = route.options.travelMode === 'walk' ? 15 : 0;
  const transitBonus = route.options.travelMode === 'transit' ? 8 : 0;
  const score = Math.min(
    100,
    Math.round(stops * 7 + travel * 0.35 + stay * 0.08 + walkBonus + transitBonus)
  );
  const level: FatigueLevel =
    score < 35 ? 'low' : score < 65 ? 'medium' : 'high';
  return { score, level };
}
