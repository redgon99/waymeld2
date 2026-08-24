import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

export interface ShareTripModalSubmit {
  listInPlaza: boolean;
  displayName: string;
  email: string;
}

interface Props {
  open: boolean;
  tripTitle: string;
  userEmail: string | null;
  authConfigured: boolean;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (opts: ShareTripModalSubmit) => void | Promise<void>;
}

export function ShareTripModal({
  open,
  tripTitle,
  userEmail,
  authConfigured,
  saving = false,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslation('share');
  const { t: tc } = useTranslation('common');
  const [listInPlaza, setListInPlaza] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [plazaHelpOpen, setPlazaHelpOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setListInPlaza(false);
    setDisplayName('');
    setEmail(userEmail ?? '');
    setPlazaHelpOpen(false);
  }, [open, userEmail]);

  if (!open) return null;

  const plazaDisabled = authConfigured && !userEmail;
  const emailReadOnly = !!userEmail;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listInPlaza && !email.trim()) return;
    void onConfirm({
      listInPlaza: listInPlaza && !!email.trim(),
      displayName: displayName.trim(),
      email: email.trim(),
    });
  };

  return (
    <div className="share-trip-modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className="share-trip-modal"
        role="dialog"
        aria-labelledby="share-trip-modal-title"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <header className="share-trip-modal-header">
          <h2 id="share-trip-modal-title">{t('modal.shareTitle')}</h2>
          <button type="button" className="share-trip-modal-close" onClick={onClose} aria-label={tc('close')}>
            <Icon name="close" />
          </button>
        </header>

        <div className="share-trip-modal-body">
          <label className="share-trip-modal-field">
            <span>{t('modal.tripName')}</span>
            <input type="text" value={tripTitle} readOnly className="share-trip-modal-readonly" />
          </label>

          <p className="share-trip-modal-hint">
            {t('modal.hint')}
          </p>

          <div className="share-trip-modal-check-row">
            <label className="share-trip-modal-check">
              <input
                type="checkbox"
                checked={listInPlaza}
                disabled={plazaDisabled || saving}
                onChange={(e) => setListInPlaza(e.target.checked)}
              />
              <span>{t('modal.listInPlaza')}</span>
            </label>
            <button
              type="button"
              className="share-trip-modal-help-btn"
              aria-label={t('modal.plazaHelpAria')}
              onClick={() => setPlazaHelpOpen(true)}
            >
              <Icon name="help" />
            </button>
          </div>
          {plazaDisabled && (
            <p className="share-trip-modal-warn">
              {t('modal.plazaLogin')}
            </p>
          )}

          {listInPlaza && (
            <>
              <label className="share-trip-modal-field">
                <span>{t('modal.displayName')}</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t('modal.displayPlaceholder')}
                  maxLength={40}
                  disabled={saving}
                />
              </label>
              <label className="share-trip-modal-field">
                <span>{t('modal.email')}</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={emailReadOnly}
                  required
                  disabled={saving || emailReadOnly}
                  className={emailReadOnly ? 'share-trip-modal-readonly' : undefined}
                />
              </label>
              <p className="share-trip-modal-warn share-trip-modal-warn--muted">
                {t('modal.emailWarn')}
              </p>
            </>
          )}
        </div>

        {plazaHelpOpen && (
          <div
            className="plaza-help-modal-backdrop"
            role="presentation"
            onClick={() => setPlazaHelpOpen(false)}
          >
            <div
              className="plaza-help-modal"
              role="dialog"
              aria-labelledby="plaza-help-title"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id="plaza-help-title">{t('modal.helpTitle')}</h3>
              <p>{t('modal.helpBody')}</p>
              <ul className="plaza-help-list">
                <li>{t('modal.help1')}</li>
                <li>{t('modal.help2')}</li>
                <li>{t('modal.help3')}</li>
              </ul>
              <p className="plaza-help-note">{t('modal.helpNote')}</p>
              <button
                type="button"
                className="share-trip-modal-btn primary plaza-help-ok"
                onClick={() => setPlazaHelpOpen(false)}
              >
                {t('modal.ok')}
              </button>
            </div>
          </div>
        )}

        <footer className="share-trip-modal-footer">
          <button type="button" className="share-trip-modal-btn secondary" onClick={onClose} disabled={saving}>
            {t('modal.cancel')}
          </button>
          <button type="submit" className="share-trip-modal-btn primary" disabled={saving}>
            {saving ? t('modal.saving') : t('modal.share')}
          </button>
        </footer>
      </form>
    </div>
  );
}
