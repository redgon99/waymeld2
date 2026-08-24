import { getSupabase, isSupabaseConfigured } from './supabase';

export type ReportTargetType = 'trip' | 'plaza_listing' | 'guide' | 'place';

export type ReportReason =
  | 'spam'
  | 'inappropriate'
  | 'wrong_info'
  | 'copyright'
  | 'other';

export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'rejected';

export const REPORT_REASONS: ReportReason[] = [
  'spam',
  'inappropriate',
  'wrong_info',
  'copyright',
  'other',
];

export const REPORT_STATUSES: ReportStatus[] = [
  'open',
  'reviewing',
  'resolved',
  'rejected',
];

export interface ReportTarget {
  type: ReportTargetType;
  id: string;
  label?: string;
  url?: string;
}

export interface ContentReport {
  id: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel: string | null;
  targetUrl: string | null;
  reason: ReportReason;
  detail: string | null;
  reporterId: string | null;
  reporterLocale: string | null;
  status: ReportStatus;
  adminNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

const REPORT_SELECT =
  'id, target_type, target_id, target_label, target_url, reason, detail, reporter_id, reporter_locale, status, admin_note, reviewed_at, created_at';

interface ReportRow {
  id: string;
  target_type: ReportTargetType;
  target_id: string;
  target_label: string | null;
  target_url: string | null;
  reason: ReportReason;
  detail: string | null;
  reporter_id: string | null;
  reporter_locale: string | null;
  status: ReportStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

function rowToReport(row: ReportRow): ContentReport {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    targetUrl: row.target_url,
    reason: row.reason,
    detail: row.detail,
    reporterId: row.reporter_id,
    reporterLocale: row.reporter_locale,
    status: row.status,
    adminNote: row.admin_note,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase가 설정되어야 신고를 접수할 수 있습니다.');
  }
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');
  return sb;
}

/** 이미 같은 대상을 신고해 접수 대기 중인지 — 중복 인덱스 위반 코드 */
const UNIQUE_VIOLATION = '23505';

export class DuplicateReportError extends Error {
  constructor() {
    super('이미 접수된 신고입니다.');
    this.name = 'DuplicateReportError';
  }
}

export async function submitContentReport(params: {
  target: ReportTarget;
  reason: ReportReason;
  detail?: string;
  reporterId?: string | null;
  locale?: string;
}): Promise<void> {
  const sb = requireSupabase();
  const detail = params.detail?.trim();
  const { error } = await sb.from('content_reports').insert({
    target_type: params.target.type,
    target_id: params.target.id,
    target_label: params.target.label ?? null,
    target_url: params.target.url ?? null,
    reason: params.reason,
    detail: detail || null,
    reporter_id: params.reporterId ?? null,
    reporter_locale: params.locale ?? null,
  });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new DuplicateReportError();
    throw error;
  }
}

export async function listContentReports(
  status?: ReportStatus | 'all',
): Promise<ContentReport[]> {
  const sb = requireSupabase();
  let query = sb
    .from('content_reports')
    .select(REPORT_SELECT)
    .order('created_at', { ascending: false })
    .limit(200);
  if (status && status !== 'all') query = query.eq('status', status);
  const { data, error } = await query;
  if (error) throw error;
  return (data as ReportRow[] | null)?.map(rowToReport) ?? [];
}

export async function updateContentReport(
  id: string,
  patch: { status?: ReportStatus; adminNote?: string },
  reviewerId?: string | null,
): Promise<void> {
  const sb = requireSupabase();
  const next: Record<string, unknown> = {};
  if (patch.status) {
    next.status = patch.status;
    next.reviewed_at = new Date().toISOString();
    next.reviewed_by = reviewerId ?? null;
  }
  if (patch.adminNote !== undefined) next.admin_note = patch.adminNote.trim() || null;
  if (Object.keys(next).length === 0) return;
  const { error } = await sb.from('content_reports').update(next).eq('id', id);
  if (error) throw error;
}

export async function countOpenReports(): Promise<number> {
  const sb = requireSupabase();
  const { count, error } = await sb
    .from('content_reports')
    .select('id', { count: 'exact', head: true })
    .in('status', ['open', 'reviewing']);
  if (error) return 0;
  return count ?? 0;
}
