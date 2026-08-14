import { getSupabase } from './supabase';

export interface StaySuggestInput {
  id: string;
  name: string;
  category: string;
  categoryLabel: string;
  address: string;
}

export interface StaySuggestion {
  id: string;
  minutes: number;
  reason: string;
}

/**
 * 하루 동선 전체를 한 번에 Claude에 보내 장소별 체류시간을 추천받는다.
 * 기존 STAY_TIME_BY_CATEGORY(카테고리별 고정값)와 달리 장소 이름·규모를
 * 개별적으로 판단하고, 하루 전체 장소 수를 고려해 배분한다.
 */
export async function fetchAiStaySuggestions(
  places: StaySuggestInput[],
  locale: string
): Promise<StaySuggestion[] | null> {
  const supabase = getSupabase();
  if (!supabase || places.length === 0) return null;

  const { data, error } = await supabase.functions.invoke<{ suggestions?: StaySuggestion[] }>(
    'route-stay-suggest',
    { body: { places, locale } }
  );
  if (error) {
    console.warn('route-stay-suggest function error', error.message);
    return null;
  }
  if (!data || !Array.isArray(data.suggestions)) return null;
  return data.suggestions;
}
