import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AdminHeader } from '../components/AdminHeader';
import { isCurrentUserAdmin } from '../lib/admin';
import {
  listContentReports,
  updateContentReport,
  REPORT_STATUSES,
  type ContentReport,
  type ReportStatus,
} from '../lib/contentReports';
import '../styles/app.css';

const STATUS_LABEL: Record<ReportStatus, string> = {
  open: '접수',
  reviewing: '검토 중',
  resolved: '조치 완료',
  rejected: '반려',
};

const REASON_LABEL: Record<ContentReport['reason'], string> = {
  spam: '스팸·광고',
  inappropriate: '부적절한 내용',
  wrong_info: '잘못된 정보',
  copyright: '저작권 침해',
  other: '기타',
};

const TARGET_LABEL: Record<ContentReport['targetType'], string> = {
  trip: '여행',
  plaza_listing: '공유마당',
  guide: '가이드',
  place: '장소',
};

type StatusFilter = ReportStatus | 'all';

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { hour12: false });
}

export default function AdminReportsPage() {
  const { configured, loading, user } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>('open');
  const [reports, setReports] = useState<ContentReport[]>([]);

  const loadAll = useCallback(async (status: StatusFilter) => {
    setRefreshing(true);
    setError(null);
    try {
      setReports(await listContentReports(status));
    } catch (e) {
      setError(e instanceof Error ? e.message : '신고 목록을 불러오지 못했습니다.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!configured || loading || !user) {
      setCheckingAdmin(false);
      return;
    }
    let alive = true;
    (async () => {
      setCheckingAdmin(true);
      try {
        const ok = await isCurrentUserAdmin();
        if (!alive) return;
        setIsAdmin(ok);
        if (ok) await loadAll(filter);
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : '관리자 확인 실패');
      } finally {
        if (alive) setCheckingAdmin(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [configured, loading, user, loadAll, filter]);

  const openCount = useMemo(
    () => reports.filter((r) => r.status === 'open' || r.status === 'reviewing').length,
    [reports],
  );

  const handleStatus = async (report: ContentReport, status: ReportStatus) => {
    try {
      await updateContentReport(report.id, { status }, user?.id ?? null);
      await loadAll(filter);
    } catch (e) {
      setError(e instanceof Error ? e.message : '상태 변경 실패');
    }
  };

  const handleNote = async (report: ContentReport, adminNote: string) => {
    if ((report.adminNote ?? '') === adminNote.trim()) return;
    try {
      await updateContentReport(report.id, { adminNote });
    } catch (e) {
      setError(e instanceof Error ? e.message : '메모 저장 실패');
    }
  };

  if (!configured) {
    return (
      <main className="admin-page">
        <div className="admin-shell">
          <h1>관리자 페이지</h1>
          <p>Supabase가 설정된 환경에서만 관리자 기능을 사용할 수 있습니다.</p>
          <Link to="/plan" className="admin-link-btn">
            플래너로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  if (!loading && !user) return <Navigate to="/login" replace />;

  if (checkingAdmin) {
    return (
      <main className="admin-page">
        <div className="admin-shell">
          <h1>관리자 페이지</h1>
          <p>권한 확인 중...</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="admin-page">
        <div className="admin-shell">
          <h1>관리자 페이지</h1>
          <p>접근 권한이 없습니다.</p>
          <Link to="/plan" className="admin-link-btn">
            플래너로 돌아가기
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <AdminHeader
          subtitle="이용자 신고 접수 · 검수 큐"
          current="reports"
          refreshing={refreshing}
          onRefresh={() => void loadAll(filter)}
        />

        {error && <div className="admin-error">{error}</div>}

        <section className="admin-section">
          <h2>신고 검수 큐 (미처리 {openCount}건)</h2>

          <div className="admin-filter-row">
            {(['open', 'reviewing', 'resolved', 'rejected', 'all'] as StatusFilter[]).map(
              (s) => (
                <button
                  key={s}
                  type="button"
                  className={`admin-link-btn${filter === s ? ' active' : ''}`}
                  onClick={() => setFilter(s)}
                >
                  {s === 'all' ? '전체' : STATUS_LABEL[s]}
                </button>
              ),
            )}
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>접수 시각</th>
                  <th>대상</th>
                  <th>사유</th>
                  <th>내용</th>
                  <th>신고자</th>
                  <th>상태</th>
                  <th>관리 메모</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDateTime(r.createdAt)}</td>
                    <td>
                      <div>{TARGET_LABEL[r.targetType]}</div>
                      <div className="admin-cell-sub">{r.targetLabel ?? r.targetId}</div>
                      {r.targetUrl && (
                        <a
                          className="admin-cell-sub"
                          href={r.targetUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          열기
                        </a>
                      )}
                    </td>
                    <td>{REASON_LABEL[r.reason]}</td>
                    <td className="admin-cell-detail">{r.detail ?? '-'}</td>
                    <td className="mono">{r.reporterId ?? '익명'}</td>
                    <td>
                      <select
                        value={r.status}
                        onChange={(e) =>
                          void handleStatus(r, e.target.value as ReportStatus)
                        }
                        aria-label="신고 상태"
                      >
                        {REPORT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      {r.reviewedAt && (
                        <div className="admin-cell-sub">{formatDateTime(r.reviewedAt)}</div>
                      )}
                    </td>
                    <td>
                      <textarea
                        className="admin-memo-input"
                        defaultValue={r.adminNote ?? ''}
                        placeholder="처리 메모"
                        onBlur={(e) => void handleNote(r, e.currentTarget.value)}
                      />
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={7}>표시할 신고가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
