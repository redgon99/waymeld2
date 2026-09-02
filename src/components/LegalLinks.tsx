import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { normalizeLocale } from '../lib/locale';
import { privacyPath, termsPath } from '../lib/routes';

export function LegalLinks({ className }: { className?: string }) {
  const { t, i18n } = useTranslation('common');
  const locale = normalizeLocale(i18n.language);
  return (
    <nav className={['legal-links', className].filter(Boolean).join(' ')} aria-label={t('legal.navAria')}>
      <Link to={termsPath(locale)}>{t('legal.terms')}</Link>
      <Link to={privacyPath(locale)}>{t('legal.privacy')}</Link>
    </nav>
  );
}
