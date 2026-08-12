import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { KoreaSetupContent } from '../components/KoreaSetupContent';
import '../styles/app.css';

export default function KoreaSetupPage() {
  const { t } = useTranslation('planner');

  return (
    <div className="static-page korea-setup-page">
      <header className="static-page-header">
        <Link to="/plan" className="static-page-back">
          <Icon name="chevronLeft" /> {t('setup.backToPlan')}
        </Link>
        <h1>{t('setup.title')}</h1>
        <p className="static-page-lead">{t('setup.lead')}</p>
      </header>
      <KoreaSetupContent />
    </div>
  );
}
