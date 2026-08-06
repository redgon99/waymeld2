import { Icon } from './Icon';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LocaleSwitcher } from './LocaleSwitcher';
import { pathWithLocale, normalizeLocale } from '../lib/locale';
import i18n from '../lib/i18n';

export function AuthBar() {
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
        <LocaleSwitcher compact />
      </div>
    );
  }

  if (user) {
    return (
      <div className="auth-bar signed-in">
        <Icon name="cloudOk" />
        <span className="auth-email">{user.email}</span>
        <LocaleSwitcher compact />
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
      <LocaleSwitcher compact />
      <Link to={loginPath} className="auth-link">
        <Icon name="cloud" /> {t('auth.cloudLogin')}
      </Link>
    </div>
  );
}
