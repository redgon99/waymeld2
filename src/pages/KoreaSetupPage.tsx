import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import {
  KOREA_SETUP_ITEMS,
  readSetupProgress,
  toggleSetupItem,
} from '../lib/koreaSetup';
import '../styles/app.css';

export default function KoreaSetupPage() {
  const { t } = useTranslation('planner');
  const [done, setDone] = useState(() => readSetupProgress());
  const completed = KOREA_SETUP_ITEMS.filter((item) => done[item.id]).length;

  return (
    <div className="static-page korea-setup-page">
      <header className="static-page-header">
        <Link to="/plan" className="static-page-back">
          <Icon name="chevronLeft" /> {t('setup.backToPlan')}
        </Link>
        <h1>{t('setup.title')}</h1>
        <p className="static-page-lead">{t('setup.lead')}</p>
        <p className="setup-progress">
          {t('setup.progress', { done: completed, total: KOREA_SETUP_ITEMS.length })}
        </p>
      </header>

      <ul className="setup-checklist">
        {KOREA_SETUP_ITEMS.map((item) => (
          <li key={item.id}>
            <label className="setup-check-item">
              <input
                type="checkbox"
                checked={!!done[item.id]}
                onChange={() => setDone(toggleSetupItem(item.id))}
              />
              <span>{t(item.labelKey)}</span>
            </label>
            {item.id === 'airport' && (
              <p className="setup-item-hint">
                <Link to="/help#airport">{t('setup.airportWizardLink')}</Link>
              </p>
            )}
          </li>
        ))}
      </ul>

      <section className="setup-cards">
        <article className="setup-card">
          <h2>{t('setup.cards.tmoneyTitle')}</h2>
          <p>{t('setup.cards.tmoneyBody')}</p>
        </article>
        <article className="setup-card">
          <h2>{t('setup.cards.esimTitle')}</h2>
          <p>{t('setup.cards.esimBody')}</p>
        </article>
        <article className="setup-card">
          <h2>{t('setup.cards.appsTitle')}</h2>
          <p>{t('setup.cards.appsBody')}</p>
        </article>
      </section>
    </div>
  );
}
