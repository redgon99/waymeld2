/**
 * 장소 상세 응답에서 영업시간 원문을 꺼낸다.
 * 출처마다 담기는 자리가 다르므로 여기서 한 번에 흡수한다.
 */

export interface PlaceHoursText {
  hours?: string;
  restDate?: string;
}

function str(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t || undefined;
}

export function readPanelHours(
  panel: Record<string, unknown> | null | undefined,
): PlaceHoursText | null {
  if (!panel) return null;

  // Google Places: summary.openingText = weekday_text 줄바꿈 연결
  const summary = panel.summary as Record<string, unknown> | undefined;
  const googleHours = str(summary?.openingText) ?? str(summary?.todayHours);
  if (googleHours) return { hours: googleHours };

  // TourAPI: intro.hours / intro.restDate
  const intro = panel.intro as Record<string, unknown> | undefined;
  const tourHours = str(intro?.hours);
  const tourRest = str(intro?.restDate);
  if (tourHours || tourRest) return { hours: tourHours, restDate: tourRest };

  return null;
}
