/**
 * 관리자 감사 로그 조회.
 *
 * 기록은 DB 트리거(`log_admin_action`)가 남기므로 앱에는 쓰기 경로가 없다
 * (마이그레이션 20260904020000 참고). 로그 테이블에는 SELECT 정책만 있어
 * 관리자라도 자기 흔적을 지울 수 없다.
 */
import { getSupabase, isSupabaseConfigured } from './supabase';

export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AdminAuditEntry {
  id: number;
  /** 서비스 롤(엣지 함수·크론)로 들어온 변경은 null */
  actorEmail: string | null;
  actorId: string | null;
  tableName: string;
  operation: AuditOperation;
  rowId: string | null;
  /** UPDATE에서 실제로 값이 달라진 컬럼 (INSERT/DELETE면 빈 배열) */
  changedFields: string[];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
}

/** 감사 대상 테이블 → 관리자 화면에서 쓰는 이름 */
export const AUDIT_TABLE_LABEL: Record<string, string> = {
  admin_users: '관리자 계정',
  admin_notices: '공지',
  admin_user_verifications: '사용자 검증',
  guide_articles: '가이드 카드',
  scenario_catalog: '시나리오 카탈로그',
  landing_promo: '랜딩페이지',
  distribution_accounts: '배포 계정',
  insight_keywords: '수집 키워드',
  content_reports: '신고 검수',
};

export const AUDIT_TABLES = Object.keys(AUDIT_TABLE_LABEL);

export const OPERATION_LABEL: Record<AuditOperation, string> = {
  INSERT: '추가',
  UPDATE: '수정',
  DELETE: '삭제',
};

export function auditTableLabel(tableName: string): string {
  return AUDIT_TABLE_LABEL[tableName] ?? tableName;
}

function requireSupabase() {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase가 설정되어야 감사 로그를 볼 수 있습니다.');
  }
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');
  return sb;
}

function mapRow(row: Record<string, unknown>): AdminAuditEntry {
  return {
    id: row.id as number,
    actorEmail: (row.actor_email as string | null) ?? null,
    actorId: (row.actor_id as string | null) ?? null,
    tableName: row.table_name as string,
    operation: row.operation as AuditOperation,
    rowId: (row.row_id as string | null) ?? null,
    changedFields: (row.changed_fields as string[] | null) ?? [],
    before: (row.before as Record<string, unknown> | null) ?? null,
    after: (row.after as Record<string, unknown> | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export interface AuditFilter {
  tableName?: string;
  actorEmail?: string;
  operation?: AuditOperation;
  /** 키셋 페이지네이션 커서 — 이 id보다 작은 항목만 가져온다 */
  beforeId?: number;
  limit?: number;
}

export const AUDIT_PAGE_SIZE = 50;

/**
 * 최신순 조회. 전량을 클라이언트로 가져와 잘라내는 대신 id 키셋으로
 * 페이지를 넘긴다 — 로그는 계속 쌓이기만 하는 테이블이라 offset 방식은
 * 뒤로 갈수록 느려진다.
 */
export async function listAdminAuditLog(filter: AuditFilter = {}): Promise<AdminAuditEntry[]> {
  const sb = requireSupabase();
  let query = sb
    .from('admin_audit_log')
    .select('id, actor_email, actor_id, table_name, operation, row_id, changed_fields, before, after, created_at')
    .order('id', { ascending: false })
    .limit(filter.limit ?? AUDIT_PAGE_SIZE);

  if (filter.tableName) query = query.eq('table_name', filter.tableName);
  if (filter.operation) query = query.eq('operation', filter.operation);
  if (filter.actorEmail) query = query.eq('actor_email', filter.actorEmail);
  if (filter.beforeId != null) query = query.lt('id', filter.beforeId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
}

/** 필터 드롭다운용 작업자 목록. 최근 로그에서 추려 중복을 제거한다. */
export async function listAuditActors(): Promise<string[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('admin_audit_log')
    .select('actor_email')
    .not('actor_email', 'is', null)
    .order('id', { ascending: false })
    .limit(1000);
  if (error) throw error;
  const seen = new Set<string>();
  for (const row of data ?? []) {
    const email = (row as { actor_email: string | null }).actor_email;
    if (email) seen.add(email);
  }
  return [...seen].sort();
}

/** 대상을 사람이 알아볼 이름으로. UPDATE는 바뀐 컬럼만 담기므로 못 찾을 수 있다. */
const SUBJECT_KEYS = ['email', 'title', 'slug', 'keyword', 'name', 'platform', 'label'];

export function auditSubject(entry: AdminAuditEntry): string {
  const source = entry.after ?? entry.before ?? {};
  for (const key of SUBJECT_KEYS) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return entry.rowId ? `#${entry.rowId.slice(0, 8)}` : '-';
}

/**
 * 로그 한 줄을 요약 문구로. status 전환은 관리자가 실제로 인지하는 행위
 * (게시/게시중지)로 바꿔 보여준다 — 원본 컬럼명만 보여주면 무슨 일이
 * 있었는지 읽어내기 어렵다.
 */
export function describeAuditEntry(entry: AdminAuditEntry): string {
  if (entry.operation === 'INSERT') return '추가';
  if (entry.operation === 'DELETE') return '삭제';

  if (entry.changedFields.includes('status')) {
    const from = entry.before?.status;
    const to = entry.after?.status;
    if (to === 'published') return '게시';
    if (from === 'published' && to === 'draft') return '게시중지';
    if (to === 'archived') return '보관';
    if (typeof to === 'string') return `상태 → ${to}`;
  }

  if (entry.changedFields.length === 0) return '수정';
  return `수정 (${entry.changedFields.join(', ')})`;
}
