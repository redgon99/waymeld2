import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

interface Props {
  totalDays: number;
  currentDay: number;
  countsByDay: Record<number, number>;
  onSelect: (day: number) => void;
  onAddDay: () => void;
  onRemoveDay: (day: number) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function DayTabs({
  totalDays,
  currentDay,
  countsByDay,
  onSelect,
  onAddDay,
  onRemoveDay,
  readOnly = false,
  compact = false,
}: Props) {
  const { t } = useTranslation('planner');
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div className={`day-tabs ${compact ? 'day-tabs-compact' : ''}`}>
      {days.map((d) => {
        const count = countsByDay[d] ?? 0;
        const active = d === currentDay;
        return (
          <div key={d} className={`day-tab-wrap ${active ? 'active' : ''}`}>
            <button
              className={`day-tab ${active ? 'active' : ''}`}
              onClick={() => onSelect(d)}
            >
              <span className="day-num">
                {compact ? t('day.tabShort', { n: d }) : t('day.tab', { n: d })}
              </span>
              {count > 0 && <span className="day-count">{count}</span>}
            </button>
            {!compact && !readOnly && totalDays > 1 && active && (
              <button
                className="day-remove"
                onClick={() => onRemoveDay(d)}
                aria-label={t('day.remove', { n: d })}
                title={t('day.removeTitle')}
              >
                <Icon name="trash" />
              </button>
            )}
          </div>
        );
      })}
      {!readOnly && (
        <button className="day-add" onClick={onAddDay} aria-label={t('trip.addDay')}>
          <Icon name="plus" />
          {!compact && t('trip.addDay')}
        </button>
      )}
    </div>
  );
}
