import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** insight_* 테이블 전용 서비스롤 클라이언트 (RLS 우회) */
export function getServiceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

export interface RawItemInput {
  source: string;
  externalId: string;
  title?: string | null;
  content?: string | null;
  author?: string | null;
  url?: string | null;
  sourceCreatedAt?: string | null;
  rawPayload?: unknown;
}

/** source+external_id 기준 upsert. 반환값은 실제 반영된 행 수(정확도 불필요, 진행 로그용). */
export async function upsertRawItems(sb: SupabaseClient, items: RawItemInput[]): Promise<number> {
  if (items.length === 0) return 0;
  const rows = items.map((it) => ({
    source: it.source,
    external_id: it.externalId,
    title: it.title ?? null,
    content: it.content ?? null,
    author: it.author ?? null,
    url: it.url ?? null,
    source_created_at: it.sourceCreatedAt ?? null,
    raw_payload: it.rawPayload ?? null,
  }));
  const { error } = await sb
    .from('insight_raw_items')
    .upsert(rows, { onConflict: 'source,external_id', ignoreDuplicates: false });
  if (error) throw error;
  return rows.length;
}

export async function listActiveKeywords(
  sb: SupabaseClient,
  sources: string[]
): Promise<Array<{ source: string; keyword: string }>> {
  const { data, error } = await sb
    .from('insight_keywords')
    .select('source, keyword')
    .in('source', sources)
    .eq('is_active', true);
  if (error) throw error;
  return (data ?? []) as Array<{ source: string; keyword: string }>;
}

export async function startRun(sb: SupabaseClient, source: string): Promise<string> {
  const { data, error } = await sb
    .from('insight_collection_runs')
    .insert({ source, status: 'running' })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function finishRun(
  sb: SupabaseClient,
  runId: string,
  patch: { status: 'success' | 'error'; itemsCollected?: number; errorMessage?: string }
): Promise<void> {
  await sb
    .from('insight_collection_runs')
    .update({
      status: patch.status,
      items_collected: patch.itemsCollected ?? 0,
      error_message: patch.errorMessage ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq('id', runId);
}
