import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { AuthBar } from '../components/AuthBar';
import { LocaleSwitcher } from '../components/LocaleSwitcher';
import { SharePlazaPanel } from '../components/SharePlazaPanel';
import { useSeoMeta } from '../hooks/useSeoMeta';
import { pathWithLocale, normalizeLocale } from '../lib/locale';
import i18n from '../lib/i18n';
import '../styles/app.css';

export default function SharePlazaPage() {
  const { t } = useTranslation('share');
  const locale = normalizeLocale(i18n.language);
  const homePath = pathWithLocale('/plan', locale);

  useSeoMeta({
    title: t('meta.plazaTitle'),
    description: t('meta.plazaDescription'),
    path: '/plaza',
  });

  return (
    <div className="plaza-page">
      <header className="plaza-header">
        <div className="plaza-header-top">
          <Link to={homePath} className="plaza-home-link">
            <Icon name="chevronLeft" /> {t('appName', { ns: 'common' })}
          </Link>
          <h1 className="plaza-title">{t('plaza.title')}</h1>
          <LocaleSwitcher compact />
        </div>
        <p className="plaza-subtitle">{t('meta.plazaDescription')}</p>
      </header>
      <main className="plaza-main">
        <SharePlazaPanel />
      </main>
      <footer className="plaza-footer">
        <AuthBar />
      </footer>
    </div>
  );
}
