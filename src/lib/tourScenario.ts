import { getSupabase, isSupabaseConfigured } from './supabase';
import { applyImportRows, type PinImportResult, type RawPinRow } from './importPins';
import type { PinnedPlace } from '../types';

export type ScenarioTheme =
  | 'meditation'
  | 'wellbeing'
  | 'shopping'
  | 'family'
  | 'honeymoon'
  | 'night'
  | 'hallyu'
  | 'camping'
  | 'walking'
  | 'marine';

export const SCENARIO_THEMES: ScenarioTheme[] = [
  'meditation',
  'wellbeing',
  'shopping',
  'family',
  'honeymoon',
  'night',
  'hallyu',
  'camping',
  'walking',
  'marine',
];

export interface ScenarioStop {
  placeId: string;
  contentId: string;
  contentTypeId: string;
  title: string;
  titleKo?: string;
  address: string;
  lat: number;
  lng: number;
  thumbnailUrl?: string;
  note: string;
}

export interface ScenarioDay {
  day: number;
  dayTitle: string;
  stops: ScenarioStop[];
}

export interface TourScenario {
  theme: ScenarioTheme;
  region: string;
  regionLabel?: string;
  title: string;
  intro: string;
  days: ScenarioDay[];
  offeredRegions: Array<{ region: string; candidateCount: number }>;
  droppedStopContentIds: string[];
}

/** contentTypeId(TourAPI) → 기존 가져오기 파이프라인이 이해하는 한글 카테고리 라벨 */
const CONTENT_TYPE_TO_CATEGORY_LABEL: Record<string, string> = {
  '12': '관광지',
  '14': '문화',
  '15': '문화',
  '25': '관광지',
  '28': '관광지',
  '32': '숙소',
  '38': '쇼핑',
  '39': '맛집',
};

export function isTourScenarioConfigured(): boolean {
  return isSupabaseConfigured;
}

export async function generateTourScenario(
  theme: ScenarioTheme,
  days: number,
  locale: string
): Promise<TourScenario | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase.functions.invoke<TourScenario>('tour-scenario', {
    body: { theme, days, locale },
  });
  if (error) {
    console.warn('tour-scenario function error', error.message);
    return null;
  }
  if (!data || !Array.isArray(data.days)) return null;
  return data;
}

/**
 * 생성된 시나리오를 기존 핀 가져오기 파이프라인(importPins.ts)에 태워
 * 일자별 PinnedPlace로 변환한다. 새 매핑 로직을 만들지 않고 검증된
 * applyImportRows()를 그대로 재사용해 day/order/카테고리 처리 일관성을 유지한다.
 */
export function applyScenarioToTrip(
  scenario: TourScenario,
  options: { currentDay: number; totalDays: number; existingByDay: Record<number, PinnedPlace[]> }
): PinImportResult {
  const rows: RawPinRow[] = scenario.days.flatMap((day) =>
    day.stops.map((stop, i) => ({
      day: day.day,
      order: i + 1,
      name: stop.titleKo || stop.title,
      categoryLabel: CONTENT_TYPE_TO_CATEGORY_LABEL[stop.contentTypeId] ?? '기타',
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      note: stop.note,
      placeUrl: `https://www.visitkorea.or.kr/detail/ms_detail.do?contentId=${stop.contentId}`,
    }))
  );

  return applyImportRows(rows, {
    currentDay: options.currentDay,
    totalDays: options.totalDays,
    existingByDay: options.existingByDay,
    scope: 'all',
    mode: 'merge',
  });
}
