import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AdminHeader } from '../components/AdminHeader';
import {
  createAdminNotice,
  deleteAdminNotice,
  fetchAdminShareStats,
  isCurrentUserAdmin,
  listAdminNotices,
  listAdminUserRows,
  updateAdminNotice,
  upsertUserVerification,
  type AdminNotice,
  type AdminShareStats,
  type AdminUserRow,
} from '../lib/admin';
import '../styles/app.css';

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('ko-KR', { hour12: false });
}

export default function AdminPage() {
  const { configured, loading, user } = useAuth();
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [stats, setStats] = useState<AdminShareStats | null>(null);
  const [notices, setNotices] = useState<AdminNotice[]>([]);

  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeBody, setNoticeBody] = useState('');
  const [noticePublished, setNoticePublished] = useState(true);
  const [noticePinned, setNoticePinned] = useState(false);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [userRows, shareStats, noticeRows] = await Promise.all([
        listAdminUserRows(),
        fetchAdminShareStats(),
        listAdminNotices(),
      ]);
      setUsers(userRows);
      setStats(shareStats);
      setNotices(noticeRows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '관리자 데이터를 불러오지 못했습니다.';
      setError(msg);
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
        if (ok) {
          await loadAll();
        }
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
  }, [configured, loading, user, loadAll]);

  const publishedCount = useMemo(
    () => notices.filter((n) => n.isPublished).length,
    [notices]
  );

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

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

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

  const handleToggleVerify = async (row: AdminUserRow) => {
    try {
      await upsertUserVerification({
        userId: row.userId,
        isVerified: !row.isVerified,
        memo: row.memo ?? '',
      });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : '사용자 확인 상태 변경 실패');
    }
  };

  const handleMemoSave = async (row: AdminUserRow, memo: string) => {
    try {
      await upsertUserVerification({
        userId: row.userId,
        isVerified: row.isVerified,
        memo,
      });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : '메모 저장 실패');
    }
  };

  const handleCreateNotice = async () => {
    if (!noticeTitle.trim() || !noticeBody.trim()) {
      setError('공지 제목과 내용을 입력해 주세요.');
      return;
    }
    try {
      await createAdminNotice({
        title: noticeTitle,
        body: noticeBody,
        isPublished: noticePublished,
        pinned: noticePinned,
      });
      setNoticeTitle('');
      setNoticeBody('');
      setNoticePublished(true);
      setNoticePinned(false);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : '공지 생성 실패');
    }
  };

  const handleTogglePublish = async (notice: AdminNotice) => {
    try {
      await updateAdminNotice(notice.id, { isPublished: !notice.isPublished });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : '공개 상태 변경 실패');
    }
  };

  const handleTogglePinned = async (notice: AdminNotice) => {
    try {
      await updateAdminNotice(notice.id, { pinned: !notice.pinned });
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : '상단 고정 변경 실패');
    }
  };

  const handleDeleteNotice = async (notice: AdminNotice) => {
    const ok = window.confirm(`공지 "${notice.title}"를 삭제할까요?`);
    if (!ok) return;
    try {
      await deleteAdminNotice(notice.id);
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : '공지 삭제 실패');
    }
  };

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <AdminHeader
          title="관리자 페이지"
          subtitle="현재 사용자확인 관리 / 공유자료 현황 관리 / 기타 공지사항 관리"
          current="admin"
          refreshing={refreshing}
          onRefresh={() => void loadAll()}
        />

        {error && <div className="admin-error">{error}</div>}

        <section className="admin-section">
          <h2>현재 사용자확인 관리</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>사용자 ID</th>
                  <th>여행수</th>
                  <th>첫 생성</th>
                  <th>마지막 활동</th>
                  <th>확인 상태</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => (
                  <tr key={row.userId}>
                    <td className="mono">{row.userId}</td>
                    <td>{row.tripCount}</td>
                    <td>{formatDateTime(row.firstTripAt)}</td>
                    <td>{formatDateTime(row.lastUpdatedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className={`admin-verify-btn ${row.isVerified ? 'is-verified' : 'is-unverified'}`}
                        onClick={() => void handleToggleVerify(row)}
                      >
                        {row.isVerified ? '확인됨' : '미확인'}
                      </button>
                      {row.verifiedAt && (
                        <div className="admin-cell-sub">{formatDateTime(row.verifiedAt)}</div>
                      )}
                    </td>
                    <td>
                      <textarea
                        className="admin-memo-input"
                        defaultValue={row.memo ?? ''}
                        placeholder="관리 메모"
                        onBlur={(e) => void handleMemoSave(row, e.currentTarget.value)}
                      />
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6}>표시할 사용자가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section">
          <h2>공유자료 현황 관리</h2>
          <div className="admin-stats-grid">
            <article className="admin-stat-card">
              <span>총 여행 수</span>
              <strong>{stats?.totalTrips ?? 0}</strong>
            </article>
            <article className="admin-stat-card">
              <span>공개 여행 수</span>
              <strong>{stats?.publicTrips ?? 0}</strong>
            </article>
            <article className="admin-stat-card">
              <span>공유마당 등록 수</span>
              <strong>{stats?.listedTrips ?? 0}</strong>
            </article>
            <article className="admin-stat-card">
              <span>업로드 자료 수</span>
              <strong>{stats?.totalMaterials ?? 0}</strong>
            </article>
            <article className="admin-stat-card">
              <span>끌어오기 누적 수</span>
              <strong>{stats?.totalImports ?? 0}</strong>
            </article>
            <article className="admin-stat-card">
              <span>게시 중 공지</span>
              <strong>{publishedCount}</strong>
            </article>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>여행 ID</th>
                  <th>제목</th>
                  <th>소유자</th>
                  <th>마당 등록시각</th>
                  <th>자료 수</th>
                </tr>
              </thead>
              <tbody>
                {(stats?.recentListed ?? []).map((row) => (
                  <tr key={row.id}>
                    <td className="mono">{row.id}</td>
                    <td>{row.title}</td>
                    <td className="mono">{row.ownerId ?? '-'}</td>
                    <td>{formatDateTime(row.listedAt)}</td>
                    <td>{row.materialsCount}</td>
                  </tr>
                ))}
                {(stats?.recentListed ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5}>공유마당 등록 데이터가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-section">
          <h2>기타 공지사항 관리</h2>

          <div className="admin-notice-form">
            <input
              className="admin-notice-title"
              value={noticeTitle}
              onChange={(e) => setNoticeTitle(e.currentTarget.value)}
              placeholder="공지 제목"
            />
            <textarea
              className="admin-notice-body"
              value={noticeBody}
              onChange={(e) => setNoticeBody(e.currentTarget.value)}
              placeholder="공지 내용"
            />
            <div className="admin-notice-form-row">
              <label>
                <input
                  type="checkbox"
                  checked={noticePublished}
                  onChange={(e) => setNoticePublished(e.currentTarget.checked)}
                />
                게시
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={noticePinned}
                  onChange={(e) => setNoticePinned(e.currentTarget.checked)}
                />
                상단 고정
              </label>
              <button type="button" className="admin-create-btn" onClick={() => void handleCreateNotice()}>
                공지 추가
              </button>
            </div>
          </div>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>제목</th>
                  <th>내용</th>
                  <th>상태</th>
                  <th>수정시각</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {notices.map((n) => (
                  <tr key={n.id}>
                    <td>{n.title}</td>
                    <td className="admin-notice-body-cell">{n.body}</td>
                    <td>
                      <span className={`admin-pill ${n.isPublished ? 'ok' : ''}`}>
                        {n.isPublished ? '게시중' : '비공개'}
                      </span>
                      {n.pinned && <span className="admin-pill pin">고정</span>}
                    </td>
                    <td>{formatDateTime(n.updatedAt)}</td>
                    <td>
                      <div className="admin-action-row">
                        <button type="button" onClick={() => void handleTogglePublish(n)}>
                          {n.isPublished ? '비공개' : '게시'}
                        </button>
                        <button type="button" onClick={() => void handleTogglePinned(n)}>
                          {n.pinned ? '고정해제' : '고정'}
                        </button>
                        <button type="button" className="danger" onClick={() => void handleDeleteNotice(n)}>
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {notices.length === 0 && (
                  <tr>
                    <td colSpan={5}>등록된 공지가 없습니다.</td>
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
