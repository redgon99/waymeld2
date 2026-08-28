import { Icon } from './Icon';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LocaleSwitcher } from './LocaleSwitcher';
import { pathWithLocale, normalizeLocale } from '../lib/locale';
import i18n from '../lib/i18n';

export function AuthBar({ hideLocale = false }: { hideLocale?: boolean }) {
  const { t } = useTranslation('common');
  const { user, configured, signOut, isAdmin } = useAuth();
  const locale = normalizeLocale(i18n.language);
  const loginPath = pathWithLocale('/login', locale);
  const adminPath = pathWithLocale('/admin', locale);

  if (!configured) {
    return (
      <div className="auth-bar local-mode">
        <Icon name="save" />
        <span>{t('auth.localMode')}</span>
        {!hideLocale && <LocaleSwitcher compact />}
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-bar signed-in" title={user.email ?? undefined}>
        <Icon name="cloudOk" />
        {!hideLocale && <LocaleSwitcher compact />}
        {isAdmin && (
          <Link to={adminPath} className="auth-link">
            {t('auth.admin')}
          </Link>
        )}
        <button type="button" className="auth-link" onClick={() => void signOut()}>
          {t('auth.logout')}
        </button>
      </div>
    );
  }

  return (
    <div className="auth-bar">
      {!hideLocale && <LocaleSwitcher compact />}
      <Link to={loginPath} className="auth-link" title={t('auth.cloudLogin')}>
        <Icon name="cloud" /> <span className="auth-link-label">{t('auth.cloudLogin')}</span>
      </Link>
    </div>
  );
}
