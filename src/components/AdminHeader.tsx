import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthBar } from './AuthBar';

export type AdminPageKey =
  | 'dashboard'
  | 'admin'
  | 'insights'
  | 'guides'
  | 'distribution'
  | 'scenarios'
  | 'landing'
  | 'reports'
  | 'audit'
  | 'search';

interface Props {
  /** 페이지별 설명. 화면 제목은 항상 「관리자 페이지」로 고정. */
  title?: string;
  subtitle: string;
  current: AdminPageKey;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** 해당 페이지에만 있는 추가 액션(예: 가이드 카드의 "공개 가이드 보기") */
  extraActions?: ReactNode;
}

const NAV_ITEMS: Array<{ key: AdminPageKey; label: string; to: string }> = [
  { key: 'dashboard', label: '대시보드', to: '/admin/dashboard' },
  { key: 'admin', label: '현황 관리', to: '/admin' },
  { key: 'insights', label: '시장 인사이트', to: '/admin/insights' },
  { key: 'guides', label: '가이드 카드', to: '/admin/guides' },
  { key: 'distribution', label: '배포관리', to: '/admin/distribution' },
  { key: 'scenarios', label: '시나리오 카탈로그', to: '/admin/scenarios' },
  { key: 'landing', label: '랜딩페이지 관리', to: '/admin/landing' },
  { key: 'reports', label: '신고 검수', to: '/admin/reports' },
  { key: 'audit', label: '감사 로그', to: '/admin/audit' },
];

export function AdminHeader({
  subtitle,
  current,
  refreshing = false,
  onRefresh,
  extraActions,
}: Props) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // 검색 결과 화면에서는 현재 검색어가 입력창에 남아 있어야 이어서 고칠 수 있다
  const [term, setTerm] = useState(current === 'search' ? (params.get('q') ?? '') : '');

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = term.trim();
    if (!q) return;
    navigate(`/admin/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header className="admin-header">
      <div className="admin-header-top">
        <div className="admin-header-brand">
          <h1>관리자 페이지</h1>
          <p>{subtitle}</p>
        </div>
        <form className="admin-global-search" onSubmit={submitSearch} role="search">
          <input
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="전체 검색 (이메일 · 여행 · 시나리오 · 가이드)"
            aria-label="관리자 전역 검색"
          />
          <button type="submit" className="admin-link-btn">
            검색
          </button>
        </form>
        <AuthBar />
      </div>
      <nav className="admin-header-nav" aria-label="관리자 메뉴">
        {onRefresh && (
          <button type="button" className="admin-refresh-btn" onClick={onRefresh}>
            {refreshing ? '새로고침 중...' : '새로고침'}
          </button>
        )}
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.key}
            to={item.to}
            className={`admin-link-btn${item.key === current ? ' active' : ''}`}
            aria-current={item.key === current ? 'page' : undefined}
          >
            {item.label}
          </Link>
        ))}
        {extraActions}
        <Link to="/plan" className="admin-link-btn">
          플래너로 이동
        </Link>
      </nav>
    </header>
  );
}
