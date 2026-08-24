import { getSupabase, isSupabaseConfigured } from './supabase';
import type { InsightCollectPeriod } from './insightCollectPeriod';
import type {
  InsightAnalysis,
  InsightCategory,
  InsightCategoryCount,
  InsightCollectionRun,
  InsightItemWithAnalysis,
  InsightKeyword,
  InsightRawItem,
  InsightSource,
} from '../types/insights';

/** 관리자 UI에서 "지금 수집" 버튼이 호출하는 Edge Function 그룹 (naver_blog/naver_kin은 함수 하나로 처리) */
export type InsightCollector = 'youtube' | 'naver' | 'reddit';

const COLLECTOR_FUNCTION: Record<InsightCollector, string> = {
  youtube: 'insight-collect-youtube',
  naver: 'insight-collect-naver',
  reddit: 'insight-collect-reddit',
};

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase가 설정되어야 인사이트 기능을 사용할 수 있습니다.');
  }
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');
  return sb;
}

export async function listInsightKeywords(): Promise<InsightKeyword[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('insight_keywords')
    .select('id, source, keyword, is_active, created_at')
    .order('source', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    source: row.source as InsightSource,
    keyword: row.keyword as string,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
  }));
}

export async function addInsightKeyword(input: {
  source: InsightSource;
  keyword: string;
}): Promise<void> {
  const sb = requireSupabase();
  const keyword = input.keyword.trim();
  if (!keyword) throw new Error('키워드를 입력해 주세요.');
  const { error } = await sb
    .from('insight_keywords')
    .upsert(
      { source: input.source, keyword, is_active: true },
      { onConflict: 'source,keyword' }
    );
  if (error) throw error;
}

export async function setInsightKeywordActive(id: string, isActive: boolean): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('insight_keywords').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

export async function deleteInsightKeyword(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('insight_keywords').delete().eq('id', id);
  if (error) throw error;
}

export async function listInsightItems(filter: {
  source?: InsightSource;
  category?: InsightCategory;
  limit?: number;
} = {}): Promise<InsightItemWithAnalysis[]> {
  const sb = requireSupabase();
  const analysisJoin = filter.category ? 'insight_analysis!inner' : 'insight_analysis';
  let query = sb
    .from('insight_raw_items')
    .select(
      `id, source, external_id, title, content, author, url, source_created_at, collected_at, ${analysisJoin}(id, category, sentiment, summary, mentioned_services, model_used, analyzed_at)`
    )
    .order('collected_at', { ascending: false })
    .limit(filter.limit ?? 100);
  if (filter.source) query = query.eq('source', filter.source);
  if (filter.category) query = query.eq('insight_analysis.category', filter.category);

  const { data, error } = await query;
  if (error) throw error;

  const items: InsightItemWithAnalysis[] = (data ?? []).map((row) => {
    const analysisRow = Array.isArray(row.insight_analysis)
      ? row.insight_analysis[0]
      : row.insight_analysis;
    const analysis: InsightAnalysis | null = analysisRow
      ? {
          id: analysisRow.id as string,
          rawItemId: row.id as string,
          category: analysisRow.category as InsightCategory,
          sentiment: (analysisRow.sentiment as InsightAnalysis['sentiment']) ?? null,
          summary: (analysisRow.summary as string | null) ?? null,
          mentionedServices: (analysisRow.mentioned_services as string[] | null) ?? [],
          modelUsed: (analysisRow.model_used as string | null) ?? null,
          analyzedAt: analysisRow.analyzed_at as string,
        }
      : null;
    const raw: InsightRawItem = {
      id: row.id as string,
      source: row.source as InsightSource,
      externalId: row.external_id as string,
      title: (row.title as string | null) ?? null,
      content: (row.content as string | null) ?? null,
      author: (row.author as string | null) ?? null,
      url: (row.url as string | null) ?? null,
      sourceCreatedAt: (row.source_created_at as string | null) ?? null,
      collectedAt: row.collected_at as string,
    };
    return { ...raw, analysis };
  });

  return items;
}

export async function listInsightCategoryCounts(): Promise<InsightCategoryCount[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('insight_analysis').select('category');
  if (error) throw error;
  const counts = new Map<InsightCategory, number>();
  for (const row of data ?? []) {
    const category = row.category as InsightCategory;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => ({ category, count }));
}

export async function listInsightCollectionRuns(limit = 20): Promise<InsightCollectionRun[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('insight_collection_runs')
    .select('id, source, started_at, finished_at, status, items_collected, error_message')
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    source: row.source as InsightCollectionRun['source'],
    startedAt: row.started_at as string,
    finishedAt: (row.finished_at as string | null) ?? null,
    status: row.status as InsightCollectionRun['status'],
    itemsCollected: (row.items_collected as number) ?? 0,
    errorMessage: (row.error_message as string | null) ?? null,
  }));
}

export async function triggerInsightCollection(
  collector: InsightCollector,
  period?: InsightCollectPeriod
): Promise<{
  itemsCollected: number;
  period?: string;
}> {
  const sb = requireSupabase();
  const body: InsightCollectPeriod = period ?? {};
  const { data, error } = await sb.functions.invoke(COLLECTOR_FUNCTION[collector], {
    body,
  });
  if (error) throw error;
  return {
    itemsCollected: (data?.itemsCollected as number) ?? 0,
    period: typeof data?.period === 'string' ? data.period : undefined,
  };
}

export async function triggerInsightAnalysis(): Promise<{ itemsAnalyzed: number }> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke('insight-analyze', { body: {} });
  if (error) throw error;
  return { itemsAnalyzed: (data?.itemsAnalyzed as number) ?? 0 };
}

/** 분석된 게시물에서 장소 언급을 뽑아 place_reactions 집계를 갱신 */
export async function triggerInsightPlaceMatch(): Promise<{
  itemsProcessed: number;
  mentionsAdded: number;
  placesTouched: number;
}> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke('insight-place-match', { body: {} });
  if (error) throw error;
  return {
    itemsProcessed: (data?.itemsProcessed as number) ?? 0,
    mentionsAdded: (data?.mentionsAdded as number) ?? 0,
    placesTouched: (data?.placesTouched as number) ?? 0,
  };
}
