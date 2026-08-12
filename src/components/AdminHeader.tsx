import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AuthBar } from './AuthBar';

export type AdminPageKey = 'admin' | 'insights' | 'guides' | 'distribution';

interface Props {
  title: string;
  subtitle: string;
  current: AdminPageKey;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** 해당 페이지에만 있는 추가 액션(예: 가이드 카드의 "공개 가이드 보기") */
  extraActions?: ReactNode;
}

const NAV_ITEMS: Array<{ key: AdminPageKey; label: string; to: string }> = [
  { key: 'admin', label: '관리자 페이지', to: '/admin' },
  { key: 'insights', label: '시장 인사이트', to: '/admin/insights' },
  { key: 'guides', label: '가이드 카드', to: '/admin/guides' },
  { key: 'distribution', label: '배포관리', to: '/admin/distribution' },
];

export function AdminHeader({
  title,
  subtitle,
  current,
  refreshing = false,
  onRefresh,
  extraActions,
}: Props) {
  return (
    <header className="admin-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="admin-header-actions">
        <AuthBar />
        {onRefresh && (
          <button type="button" className="admin-refresh-btn" onClick={onRefresh}>
            {refreshing ? '새로고침 중...' : '새로고침'}
          </button>
        )}
        {NAV_ITEMS.filter((item) => item.key !== current).map((item) => (
          <Link key={item.key} to={item.to} className="admin-link-btn">
            {item.label}
          </Link>
        ))}
        {extraActions}
        <Link to="/plan" className="admin-link-btn">
          플래너로 이동
        </Link>
      </div>
    </header>
  );
}
