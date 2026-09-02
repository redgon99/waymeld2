import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import {
  listCollaborators,
  listPendingInvites,
  inviteCollaboratorByEmail,
  updateCollaboratorRole,
  removeCollaborator,
  cancelInvite,
  type TripCollaborator,
  type TripInvite,
  type CollaboratorRole,
} from '../lib/trips';

interface Props {
  open: boolean;
  tripId: string;
  tripTitle: string;
  currentUserId: string;
  onClose: () => void;
}

export function CollaboratorsModal({ open, tripId, tripTitle, currentUserId, onClose }: Props) {
  const { t } = useTranslation('share');
  const { t: tc } = useTranslation('common');
  const [collaborators, setCollaborators] = useState<TripCollaborator[]>([]);
  const [invites, setInvites] = useState<TripInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<CollaboratorRole>('editor');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [c, i] = await Promise.all([listCollaborators(tripId), listPendingInvites(tripId)]);
    setCollaborators(c);
    setInvites(i);
    setLoading(false);
  };

  useEffect(() => {
    if (!open) return;
    setEmail('');
    setRole('editor');
    setError(null);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tripId]);

  if (!open) return null;

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setInviting(true);
    setError(null);
    try {
      await inviteCollaboratorByEmail(tripId, trimmed, role, currentUserId);
      setEmail('');
      await refresh();
    } catch {
      setError(t('collab.inviteFailed'));
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, nextRole: CollaboratorRole) => {
    await updateCollaboratorRole(tripId, userId, nextRole);
    await refresh();
  };

  const handleRemove = async (userId: string) => {
    await removeCollaborator(tripId, userId);
    await refresh();
  };

  const handleCancelInvite = async (inviteId: string) => {
    await cancelInvite(inviteId);
    await refresh();
  };

  return (
    <div className="share-trip-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="share-trip-modal collab-modal"
        role="dialog"
        aria-labelledby="collab-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="share-trip-modal-header">
          <h2 id="collab-modal-title">{t('collab.title')}</h2>
          <button type="button" className="share-trip-modal-close" onClick={onClose} aria-label={tc('close')}>
            <Icon name="close" />
          </button>
        </header>

        <div className="share-trip-modal-body">
          <label className="share-trip-modal-field">
            <span>{t('modal.tripName')}</span>
            <input type="text" value={tripTitle} readOnly className="share-trip-modal-readonly" />
          </label>

          <p className="share-trip-modal-hint">{t('collab.hint')}</p>

          <form className="collab-invite-row" onSubmit={handleInvite}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('collab.emailPlaceholder')}
              required
              disabled={inviting}
              className="collab-invite-email"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as CollaboratorRole)}
              disabled={inviting}
              className="collab-invite-role"
            >
              <option value="editor">{t('collab.roleEditor')}</option>
              <option value="viewer">{t('collab.roleViewer')}</option>
            </select>
            <button type="submit" className="share-trip-modal-btn primary" disabled={inviting}>
              {inviting ? t('collab.inviting') : t('collab.invite')}
            </button>
          </form>
          {error && <p className="share-trip-modal-warn">{error}</p>}

          {loading ? (
            <p className="share-trip-modal-hint">{tc('loading')}</p>
          ) : (
            <>
              {collaborators.length > 0 && (
                <ul className="collab-list">
                  {collaborators.map((c) => (
                    <li key={c.userId} className="collab-list-item">
                      <span className="collab-list-email">{c.email ?? c.userId}</span>
                      <select
                        value={c.role}
                        onChange={(e) => handleRoleChange(c.userId, e.target.value as CollaboratorRole)}
                        className="collab-invite-role"
                      >
                        <option value="editor">{t('collab.roleEditor')}</option>
                        <option value="viewer">{t('collab.roleViewer')}</option>
                      </select>
                      <button
                        type="button"
                        className="collab-remove-btn"
                        onClick={() => handleRemove(c.userId)}
                        aria-label={t('collab.remove')}
                      >
                        <Icon name="trash" size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {invites.length > 0 && (
                <>
                  <p className="share-trip-modal-hint collab-pending-label">{t('collab.pendingLabel')}</p>
                  <ul className="collab-list">
                    {invites.map((i) => (
                      <li key={i.id} className="collab-list-item collab-list-item--pending">
                        <span className="collab-list-email">{i.email}</span>
                        <span className="collab-role-badge">
                          {i.role === 'editor' ? t('collab.roleEditor') : t('collab.roleViewer')}
                        </span>
                        <button
                          type="button"
                          className="collab-remove-btn"
                          onClick={() => handleCancelInvite(i.id)}
                          aria-label={t('collab.cancelInvite')}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {collaborators.length === 0 && invites.length === 0 && (
                <p className="share-trip-modal-hint">{t('collab.empty')}</p>
              )}
            </>
          )}
        </div>

        <footer className="share-trip-modal-footer">
          <button type="button" className="share-trip-modal-btn secondary" onClick={onClose}>
            {t('modal.ok')}
          </button>
        </footer>
      </div>
    </div>
  );
}
