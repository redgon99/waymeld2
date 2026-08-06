import { useTranslation } from 'react-i18next';
import type { FoodRestriction } from '../types';

const RESTRICTIONS: FoodRestriction[] = [
  'halal',
  'vegetarian',
  'no_spicy',
  'no_pork',
  'gluten_free',
];

interface Props {
  selected: FoodRestriction[];
  onChange: (next: FoodRestriction[]) => void;
}

export function FoodRestrictionChips({ selected, onChange }: Props) {
  const { t } = useTranslation('planner');

  const toggle = (id: FoodRestriction) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="food-restriction-chips">
      <span className="theme-chips-label">{t('foodRestrictions.label')}</span>
      <div className="theme-chips-row" role="group" aria-label={t('foodRestrictions.label')}>
        {RESTRICTIONS.map((id) => {
          const active = selected.includes(id);
          return (
            <button
              key={id}
              type="button"
              className={`theme-chip ${active ? 'active' : ''}`}
              aria-pressed={active}
              onClick={() => toggle(id)}
            >
              {t(`foodRestrictions.${id}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
