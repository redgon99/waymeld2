import { getSupabase, isSupabaseConfigured } from './supabase';

const ADMIN_EMAILS_FROM_ENV = String(import.meta.env.VITE_ADMIN_EMAILS ?? '')
  .split(',')
  .map((v) => v.trim().toLowerCase())
  .filter(Boolean);

export interface AdminUserRow {
  userId: string;
  tripCount: number;
  firstTripAt: string | null;
  lastUpdatedAt: string | null;
  isVerified: boolean;
  memo: string | null;
  verifiedAt: string | null;
}

export interface AdminShareStats {
  totalTrips: number;
  publicTrips: number;
  listedTrips: number;
  totalMaterials: number;
  totalImports: number;
  recentListed: Array<{
    id: string;
    title: string;
    ownerId: string | null;
    listedAt: string | null;
    materialsCount: number;
  }>;
}

export interface AdminNotice {
  id: string;
  title: string;
  body: string;
  isPublished: boolean;
  pinned: boolean;
  updatedAt: string;
}

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase가 설정되어야 관리자 기능을 사용할 수 있습니다.');
  }
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');
  return sb;
}

function readMaterialsCount(payload: unknown): number {
  const row = payload as { materials?: unknown };
  if (!Array.isArray(row?.materials)) return 0;
  return row.materials.length;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const sb = requireSupabase();
  const { data: userData } = await sb.auth.getUser();
  const email = userData.user?.email?.trim().toLowerCase();
  if (!email) return false;
  if (ADMIN_EMAILS_FROM_ENV.includes(email)) return true;
  const { data, error } = await sb
    .from('admin_users')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (error) return false;
  return Boolean(data?.email);
}

export async function listAdminUserRows(): Promise<AdminUserRow[]> {
  const sb = requireSupabase();
  const { data: trips, error: tripsError } = await sb
    .from('tripsasist')
    .select('owner_id, created_at, updated_at')
    .not('owner_id', 'is', null)
    .order('updated_at', { ascending: false });
  if (tripsError) throw tripsError;

  const { data: verifications, error: verificationError } = await sb
    .from('admin_user_verifications')
    .select('user_id, is_verified, memo, verified_at');
  if (verificationError) throw verificationError;

  const verifyMap = new Map(
    (verifications ?? []).map((row) => [
      row.user_id as string,
      {
        isVerified: Boolean(row.is_verified),
        memo: (row.memo as string | null) ?? null,
        verifiedAt: (row.verified_at as string | null) ?? null,
      },
    ])
  );

  const agg = new Map<
    string,
    { count: number; firstAt: string | null; lastAt: string | null }
  >();
  for (const row of trips ?? []) {
    const userId = row.owner_id as string | null;
    if (!userId) continue;
    const createdAt = (row.created_at as string | null) ?? null;
    const updatedAt = (row.updated_at as string | null) ?? null;
    const prev = agg.get(userId);
    if (!prev) {
      agg.set(userId, { count: 1, firstAt: createdAt, lastAt: updatedAt });
      continue;
    }
    prev.count += 1;
    if (createdAt && (!prev.firstAt || createdAt < prev.firstAt)) prev.firstAt = createdAt;
    if (updatedAt && (!prev.lastAt || updatedAt > prev.lastAt)) prev.lastAt = updatedAt;
  }

  return [...agg.entries()]
    .map(([userId, item]) => {
      const verified = verifyMap.get(userId);
      return {
        userId,
        tripCount: item.count,
        firstTripAt: item.firstAt,
        lastUpdatedAt: item.lastAt,
        isVerified: verified?.isVerified ?? false,
        memo: verified?.memo ?? null,
        verifiedAt: verified?.verifiedAt ?? null,
      };
    })
    .sort((a, b) => {
      const av = a.lastUpdatedAt ?? '';
      const bv = b.lastUpdatedAt ?? '';
      return bv.localeCompare(av);
    });
}

export async function upsertUserVerification(input: {
  userId: string;
  isVerified: boolean;
  memo?: string;
}): Promise<void> {
  const sb = requireSupabase();
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError) throw userError;
  const adminId = userData.user?.id;
  if (!adminId) throw new Error('로그인이 필요합니다.');

  const { error } = await sb.from('admin_user_verifications').upsert(
    {
      user_id: input.userId,
      is_verified: input.isVerified,
      memo: input.memo?.trim() || null,
      verified_at: input.isVerified ? new Date().toISOString() : null,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );
  if (error) throw error;
}

export async function fetchAdminShareStats(): Promise<AdminShareStats> {
  const sb = requireSupabase();
  const { data: trips, error: tripsError } = await sb
    .from('tripsasist')
    .select('id, title, owner_id, is_public, listed_in_plaza, plaza_listed_at, payload');
  if (tripsError) throw tripsError;

  const { count: importsCount, error: importsError } = await sb
    .from('share_plaza_imports')
    .select('id', { count: 'exact', head: true });
  if (importsError) throw importsError;

  const rows = trips ?? [];
  const publicTrips = rows.filter((r) => Boolean(r.is_public)).length;
  const listedTrips = rows.filter((r) => Boolean(r.listed_in_plaza)).length;
  const totalMaterials = rows.reduce((sum, row) => sum + readMaterialsCount(row.payload), 0);
  const recentListed = rows
    .filter((r) => Boolean(r.listed_in_plaza))
    .sort((a, b) => {
      const av = (a.plaza_listed_at as string | null) ?? '';
      const bv = (b.plaza_listed_at as string | null) ?? '';
      return bv.localeCompare(av);
    })
    .slice(0, 12)
    .map((row) => ({
      id: row.id as string,
      title: (row.title as string) || '제목 없음',
      ownerId: (row.owner_id as string | null) ?? null,
      listedAt: (row.plaza_listed_at as string | null) ?? null,
      materialsCount: readMaterialsCount(row.payload),
    }));

  return {
    totalTrips: rows.length,
    publicTrips,
    listedTrips,
    totalMaterials,
    totalImports: importsCount ?? 0,
    recentListed,
  };
}

export async function listAdminNotices(): Promise<AdminNotice[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('admin_notices')
    .select('id, title, body, is_published, pinned, updated_at')
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    title: (row.title as string) || '',
    body: (row.body as string) || '',
    isPublished: Boolean(row.is_published),
    pinned: Boolean(row.pinned),
    updatedAt: (row.updated_at as string) || new Date(0).toISOString(),
  }));
}

export async function createAdminNotice(input: {
  title: string;
  body: string;
  isPublished: boolean;
  pinned: boolean;
}): Promise<void> {
  const sb = requireSupabase();
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError) throw userError;
  const createdBy = userData.user?.id;
  if (!createdBy) throw new Error('로그인이 필요합니다.');

  const { error } = await sb.from('admin_notices').insert({
    title: input.title.trim(),
    body: input.body.trim(),
    is_published: input.isPublished,
    pinned: input.pinned,
    created_by: createdBy,
  });
  if (error) throw error;
}

export async function updateAdminNotice(
  id: string,
  patch: Partial<{
    title: string;
    body: string;
    isPublished: boolean;
    pinned: boolean;
  }>
): Promise<void> {
  const sb = requireSupabase();
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.title !== undefined) updatePayload.title = patch.title.trim();
  if (patch.body !== undefined) updatePayload.body = patch.body.trim();
  if (patch.isPublished !== undefined) updatePayload.is_published = patch.isPublished;
  if (patch.pinned !== undefined) updatePayload.pinned = patch.pinned;
  const { error } = await sb.from('admin_notices').update(updatePayload).eq('id', id);
  if (error) throw error;
}

export async function deleteAdminNotice(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('admin_notices').delete().eq('id', id);
  if (error) throw error;
}
