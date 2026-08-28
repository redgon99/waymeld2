export interface SegmentedTabItem {
  id: string;
  label: string;
}

interface SegmentedTabsProps {
  items: SegmentedTabItem[];
  value: string;
  onChange: (id: string) => void;
  ariaLabel: string;
  /** md: 대분류(진한 필 세그먼트) · sm: 소분류(테두리만 있는 하위 필터, 상위 탭 아래 중첩 표시) */
  size?: 'md' | 'sm';
  /** sm 전용 — 상위 탭에 속한 하위 필터임을 선으로 잇는 연결선을 그린다 */
  nested?: boolean;
  className?: string;
}

/**
 * 플래너(RouteOptionsPanel)의 뷰 전환 세그먼트(.planner-view-segment)와 같은 시각 언어를
 * 한국여행정보·가이드 페이지의 대분류/소분류 탭에도 그대로 재사용하기 위한 공통 컴포넌트.
 * 대분류(md)와 소분류(sm)를 서로 다른 굵기·중첩으로 그려 위계를 분명히 한다.
 */
export function SegmentedTabs({
  items,
  value,
  onChange,
  ariaLabel,
  size = 'md',
  nested = false,
  className = '',
}: SegmentedTabsProps) {
  const list = (
    <div
      className={`segmented-tabs segmented-tabs-${size} ${className}`.trim()}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          className={`segmented-tabs-btn ${value === item.id ? 'active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );

  if (!nested) return list;

  return (
    <div className="segmented-tabs-nested">
      <span className="segmented-tabs-nested-connector" aria-hidden />
      {list}
    </div>
  );
}
