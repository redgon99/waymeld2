import { getSupabase, isSupabaseConfigured } from './supabase';
import type {
  DistributionAccount,
  DistributionAccountInput,
  DistributionPlatform,
  DistributionPost,
  DistributionPostStatus,
} from '../types/distribution';

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase가 설정되어야 배포관리 기능을 사용할 수 있습니다.');
  }
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');
  return sb;
}

function mapAccountRow(row: Record<string, unknown>): DistributionAccount {
  return {
    id: row.id as string,
    platform: row.platform as DistributionPlatform,
    country: row.country as string,
    label: row.label as string,
    handle: (row.handle as string | null) ?? null,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
  };
}

function mapPostRow(row: Record<string, unknown>): DistributionPost {
  return {
    id: row.id as string,
    platform: row.platform as DistributionPlatform,
    country: row.country as string,
    locale: (row.locale as string) ?? 'ko',
    accountId: (row.account_id as string | null) ?? null,
    sourceGuideId: (row.source_guide_id as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    body: (row.body as string) ?? '',
    mediaUrls: (row.media_urls as string[] | null) ?? [],
    status: row.status as DistributionPostStatus,
    scheduledAt: (row.scheduled_at as string | null) ?? null,
    postedAt: (row.posted_at as string | null) ?? null,
    externalPostId: (row.external_post_id as string | null) ?? null,
    externalUrl: (row.external_url as string | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function listDistributionAccounts(): Promise<DistributionAccount[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('distribution_accounts')
    .select('id, platform, country, label, handle, is_active, created_at')
    .order('platform', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapAccountRow(row as Record<string, unknown>));
}

export async function addDistributionAccount(input: DistributionAccountInput): Promise<void> {
  const sb = requireSupabase();
  const label = input.label.trim();
  if (!label) throw new Error('계정 이름을 입력해 주세요.');
  const { error } = await sb.from('distribution_accounts').insert({
    platform: input.platform,
    country: input.country.trim().toUpperCase(),
    label,
    handle: input.handle?.trim() || null,
    credentials: input.credentials ?? {},
  });
  if (error) throw error;
}

export async function setDistributionAccountActive(id: string, isActive: boolean): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb
    .from('distribution_accounts')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDistributionAccount(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('distribution_accounts').delete().eq('id', id);
  if (error) throw error;
}

export async function listDistributionPosts(filter: {
  platform?: DistributionPlatform;
  status?: DistributionPostStatus;
  country?: string;
  limit?: number;
} = {}): Promise<DistributionPost[]> {
  const sb = requireSupabase();
  let query = sb
    .from('distribution_posts')
    .select(
      'id, platform, country, locale, account_id, source_guide_id, title, body, media_urls, status, scheduled_at, posted_at, external_post_id, external_url, error_message, created_at, updated_at'
    )
    .order('created_at', { ascending: false })
    .limit(filter.limit ?? 100);
  if (filter.platform) query = query.eq('platform', filter.platform);
  if (filter.status) query = query.eq('status', filter.status);
  if (filter.country) query = query.eq('country', filter.country);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapPostRow(row as Record<string, unknown>));
}

export async function updateDistributionPost(
  id: string,
  patch: Partial<{
    title: string | null;
    body: string;
    mediaUrls: string[];
    accountId: string | null;
    status: DistributionPostStatus;
  }>
): Promise<void> {
  const sb = requireSupabase();
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.body !== undefined) row.body = patch.body;
  if (patch.mediaUrls !== undefined) row.media_urls = patch.mediaUrls;
  if (patch.accountId !== undefined) row.account_id = patch.accountId;
  if (patch.status !== undefined) row.status = patch.status;
  const { error } = await sb.from('distribution_posts').update(row).eq('id', id);
  if (error) throw error;
}

export async function approveDistributionPost(id: string): Promise<void> {
  await updateDistributionPost(id, { status: 'approved' });
}

export async function deleteDistributionPost(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('distribution_posts').delete().eq('id', id);
  if (error) throw error;
}

export async function triggerDistributionDraft(options: {
  guideIds?: string[];
  platforms: DistributionPlatform[];
  countries: string[];
}): Promise<{ created: number; ids: string[] }> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke<{
    created?: number;
    ids?: string[];
    error?: string;
  }>('distribution-draft', { body: options });
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
  return { created: (data?.created as number) ?? 0, ids: (data?.ids as string[]) ?? [] };
}

export async function triggerDistributionPublish(
  postId: string
): Promise<{ externalUrl?: string }> {
  const sb = requireSupabase();
  const { data, error } = await sb.functions.invoke<{
    externalUrl?: string;
    error?: string;
  }>('distribution-publish', { body: { postId } });
  if (error) throw error;
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String(data.error));
  }
  return { externalUrl: data?.externalUrl };
}

export function isDistributionConfigured(): boolean {
  return isSupabaseConfigured;
}
