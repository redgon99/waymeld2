import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

interface Props {
  totalDays: number;
  currentDay: number;
  countsByDay: Record<number, number>;
  onSelectDay: (day: number) => void;
  onAddDay: () => void;
  onRemoveDay: (day: number) => void;
}

const GAP = 5;

/** 공간이 되는 한 1일차부터 순차 표시. 넘치면 … 로 접고, 현재 일자는 항상 보이게 유지 */
function pickVisibleDays(
  totalDays: number,
  currentDay: number,
  dayWidths: number[],
  available: number,
  trailing: number,
  ellipsisWidth: number
): number[] {
  const allWidth = trailing + dayWidths.reduce((sum, w) => sum + w + GAP, 0);
  if (allWidth <= available) {
    return Array.from({ length: totalDays }, (_, i) => i + 1);
  }

  let used = trailing + ellipsisWidth;
  const selected: number[] = [];

  for (let d = 1; d <= totalDays; d++) {
    const w = (dayWidths[d - 1] ?? 0) + GAP;
    if (used + w > available) break;
    used += w;
    selected.push(d);
  }

  if (selected.length === 0) {
    return [currentDay];
  }

  if (!selected.includes(currentDay)) {
    const curW = (dayWidths[currentDay - 1] ?? 0) + GAP;
    while (selected.length > 0 && used + curW > available) {
      const removed = selected.pop()!;
      used -= (dayWidths[removed - 1] ?? 0) + GAP;
    }
    if (used + curW <= available) {
      selected.push(currentDay);
      selected.sort((a, b) => a - b);
    } else {
      return [currentDay];
    }
  }

  return selected;
}

function dayLabel(day: number, count: number): string {
  return count > 0 ? `Day ${day} · ${count}` : `Day ${day}`;
}

export function PlannerDayPills({
  totalDays,
  currentDay,
  countsByDay,
  onSelectDay,
  onAddDay,
  onRemoveDay,
}: Props) {
  const { t } = useTranslation('planner');
  const wrapRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleDays, setVisibleDays] = useState<number[]>(() =>
    Array.from({ length: totalDays }, (_, i) => i + 1)
  );
  const [menuOpen, setMenuOpen] = useState(false);

  const days = useMemo(
    () => Array.from({ length: totalDays }, (_, i) => i + 1),
    [totalDays]
  );

  const hiddenDays = useMemo(
    () => days.filter((d) => !visibleDays.includes(d)),
    [days, visibleDays]
  );

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const measure = measureRef.current;
    if (!wrap || !measure) return;

    const update = () => {
      const available = wrap.clientWidth;
      if (available <= 0) return;

      const dayWidths = days.map((d) => {
        const el = measure.querySelector(
          `[data-measure-day="${d}"]`
        ) as HTMLElement | null;
        return el?.offsetWidth ?? 64;
      });
      const addW =
        (measure.querySelector('[data-measure="add"]') as HTMLElement | null)
          ?.offsetWidth ?? 64;
      const remW =
        totalDays > 1
          ? (measure.querySelector('[data-measure="remove"]') as HTMLElement | null)
              ?.offsetWidth ?? 28
          : 0;
      const ellW =
        (measure.querySelector('[data-measure="ellipsis"]') as HTMLElement | null)
          ?.offsetWidth ?? 40;
      const trailing = addW + remW + GAP * (totalDays > 1 ? 2 : 1);

      const next = pickVisibleDays(
        totalDays,
        currentDay,
        dayWidths,
        available,
        trailing,
        ellW
      );
      setVisibleDays((prev) =>
        prev.length === next.length && prev.every((d, i) => d === next[i])
          ? prev
          : next
      );
    };

    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    update();
    return () => ro.disconnect();
  }, [days, currentDay, countsByDay, totalDays]);

  useLayoutEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const wrap = wrapRef.current;
      if (wrap && !wrap.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  return (
    <div className="planner-day-pills" ref={wrapRef}>
      {/* 폭 측정용 (화면 밖) */}
      <div className="planner-day-pills-measure" ref={measureRef} aria-hidden>
        {days.map((d) => (
          <span key={d} className="planner-day-pill" data-measure-day={d}>
            {dayLabel(d, countsByDay[d] ?? 0)}
          </span>
        ))}
        <span className="planner-day-ellipsis" data-measure="ellipsis">
          …
        </span>
        <span className="planner-day-add" data-measure="add">
          + Day
        </span>
        {totalDays > 1 && (
          <span className="planner-day-remove" data-measure="remove">
            <Icon name="trash" size={14} />
          </span>
        )}
      </div>

      <div className="planner-day-pills-track" role="tablist" aria-label={t('day.tabsAria', { defaultValue: '일차' })}>
        {visibleDays.map((d) => {
          const count = countsByDay[d] ?? 0;
          const active = d === currentDay;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              className={`planner-day-pill ${active ? 'active' : ''}`}
              onClick={() => onSelectDay(d)}
            >
              {dayLabel(d, count)}
            </button>
          );
        })}

        {hiddenDays.length > 0 && (
          <div className="planner-day-ellipsis-wrap">
            <button
              type="button"
              className={`planner-day-ellipsis ${menuOpen ? 'open' : ''}`}
              aria-expanded={menuOpen}
              aria-haspopup="listbox"
              aria-label={t('day.moreDays', {
                count: hiddenDays.length,
                defaultValue: `다른 일차 ${hiddenDays.length}개`,
              })}
              onClick={() => setMenuOpen((v) => !v)}
            >
              …
            </button>
            {menuOpen && (
              <div className="planner-day-overflow-menu" role="listbox">
                {days.map((d) => {
                  const count = countsByDay[d] ?? 0;
                  const active = d === currentDay;
                  const hidden = hiddenDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={`planner-day-overflow-item ${active ? 'active' : ''} ${
                        hidden ? 'is-hidden-slot' : ''
                      }`}
                      onClick={() => {
                        onSelectDay(d);
                        setMenuOpen(false);
                      }}
                    >
                      {dayLabel(d, count)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          className="planner-day-add"
          onClick={onAddDay}
          aria-label={t('trip.addDay')}
        >
          + Day
        </button>
        {totalDays > 1 && (
          <button
            type="button"
            className="planner-day-remove"
            onClick={() => onRemoveDay(currentDay)}
            aria-label={t('day.remove', { n: currentDay })}
            title={t('day.removeTitle')}
          >
            <Icon name="trash" size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
