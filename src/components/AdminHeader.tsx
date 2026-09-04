import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
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
  | 'audit';

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
  return (
    <header className="admin-header">
      <div className="admin-header-top">
        <div className="admin-header-brand">
          <h1>관리자 페이지</h1>
          <p>{subtitle}</p>
        </div>
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
