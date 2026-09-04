import { Icon } from '../Icon';
import { SearchPanel } from '../SearchPanel';
import type { ComponentProps } from 'react';

type SearchPanelProps = ComponentProps<typeof SearchPanel>;

export type MobileSearchLevel = 'half' | 'full';

interface Props extends SearchPanelProps {
  open: boolean;
  onClose: () => void;
  /** 시트 높이: half = 지도 절반 노출, full = 거의 전체 */
  level?: MobileSearchLevel;
  onToggleLevel?: () => void;
}

/** 모바일 검색 시트 (지도 위 하단 절반, 핸들로 확대/축소) */
export function MobileSearchSheet({
  open,
  onClose,
  level = 'half',
  onToggleLevel,
  ...searchProps
}: Props) {
  if (!open) return null;

  return (
    <div className="mobile-search-sheet-inner" role="dialog" aria-label="검색">
      <button
        type="button"
        className="mobile-search-handle-btn"
        onClick={onToggleLevel}
        aria-label={level === 'full' ? '검색 창 줄이기' : '검색 창 넓히기'}
      >
        <span className="mobile-search-handle-bar" />
      </button>
      <header className="mobile-search-sheet-head">
        <button type="button" className="mobile-search-back" onClick={onClose} aria-label="닫기">
          <Icon name="chevronLeft" size={20} />
        </button>
        <span className="mobile-search-sheet-title">Search · 검색</span>
        {onToggleLevel && (
          <button
            type="button"
            className={`mobile-search-size-btn ${level === 'full' ? 'is-full' : ''}`}
            onClick={onToggleLevel}
            aria-label={level === 'full' ? '지도 더 보기' : '검색 결과 더 보기'}
          >
            <Icon name="chevronDown" size={18} />
          </button>
        )}
      </header>
      <div className="mobile-search-sheet-body">
        <SearchPanel {...searchProps} variant="compact" />
      </div>
    </div>
  );
}
