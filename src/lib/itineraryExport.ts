import type { GeneratedRoute, PinnedPlace } from '../types';
import { buildPlaceMapLinks } from './mapLinks';

export function formatPlaceKoreanLine(place: PinnedPlace): string {
  const koName = place.nameKo ?? place.name;
  const addr = place.roadAddress || place.address;
  return [koName, addr].filter(Boolean).join(' — ');
}

export function formatTaxiPhrase(place: PinnedPlace): string {
  const koName = place.nameKo ?? place.name;
  const addr = place.roadAddress || place.address;
  return `여기로 가주세요. ${koName}${addr ? ` (${addr})` : ''}`;
}

export function formatFullItinerary(
  route: GeneratedRoute,
  tripTitle: string
): string {
  const lines: string[] = [
    `# ${tripTitle}`,
    `Departure: ${route.options.departTime}`,
    `Finish: ${route.finishAt}`,
    `Distance: ${route.totalDistanceKm}km · Travel: ${route.totalTravelMinutes}min`,
    '',
    '--- Itinerary ---',
  ];

  route.stops.forEach((stop, i) => {
    const leg = route.legs[i];
    if (leg) {
      lines.push(
        '',
        `→ ${(leg.distanceMeters / 1000).toFixed(1)}km · ${leg.durationMinutes}min`
      );
    }
    const reserved = stop.itemKind === 'reserved' && stop.fixedArrival;
    lines.push(
      `${stop.order}. ${stop.name}${reserved ? ` [reserved ${stop.fixedArrival}]` : ''}`,
      `   ${stop.arriveAt}–${stop.leaveAt} · ${stop.categoryLabel} · ${stop.stayMinutes ?? 0}min`,
      `   ${stop.roadAddress || stop.address}`,
      `   Taxi: ${formatTaxiPhrase(stop)}`,
      `   Maps: ${buildPlaceMapLinks(stop).google}`
    );
    if (stop.note) lines.push(`   Note: ${stop.note}`);
  });

  lines.push('', '--- Taxi phrases (Korean) ---');
  route.stops.forEach((stop) => {
    lines.push(formatTaxiPhrase(stop));
  });

  return lines.join('\n');
}
