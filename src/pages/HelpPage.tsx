import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { HelpContent } from '../components/HelpContent';
import '../styles/app.css';

export default function HelpPage() {
  const { t } = useTranslation('planner');

  return (
    <div className="static-page help-page">
      <header className="static-page-header">
        <Link to="/plan" className="static-page-back">
          <Icon name="chevronLeft" /> {t('help.backToPlan')}
        </Link>
        <h1>{t('help.title')}</h1>
        <p className="static-page-lead">{t('help.lead')}</p>
      </header>
      <HelpContent />
    </div>
  );
}
