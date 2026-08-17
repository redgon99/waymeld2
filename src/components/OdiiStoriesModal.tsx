import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { fetchOdiiStories, type OdiiSite, type OdiiStory } from '../lib/tourInfo';

interface Props {
  site: OdiiSite | null;
  onClose: () => void;
}

function formatPlayTime(sec: number | undefined): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function OdiiStoriesModal({ site, onClose }: Props) {
  const { t } = useTranslation('korInfo');
  const [stories, setStories] = useState<OdiiStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!site) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [site, onClose]);

  useEffect(() => {
    if (!site) return;
    let alive = true;
    setLoading(true);
    setError(null);
    fetchOdiiStories(site.tid, site.tlid)
      .then(({ items }) => {
        if (alive) setStories(items);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : t('errors.loadFailed'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [site, t]);

  if (!site) return null;

  return (
    <div className="trail-route-overlay" role="dialog" aria-modal="true" aria-label={site.title} onClick={onClose}>
      <div className="trail-route-panel" onClick={(e) => e.stopPropagation()}>
        <header className="trail-route-header">
          <span>{site.title}</span>
          <button type="button" className="trail-route-close" onClick={onClose} aria-label={t('trails.close')}>
            <Icon name="close" size={18} />
          </button>
        </header>
        {loading && <p className="guides-muted">{t('list.loading')}</p>}
        {error && <p className="guides-error">{error}</p>}
        {!loading && !error && stories.length === 0 && (
          <p className="guides-muted">{t('audio.noStories')}</p>
        )}
        <div className="odii-story-list">
          {stories.map((s) => (
            <article key={s.stid} className="odii-story-card">
              <div className="odii-story-head">
                <strong>{s.audioTitle || s.title}</strong>
                {formatPlayTime(s.playTimeSec) && (
                  <span className="odii-story-time">{formatPlayTime(s.playTimeSec)}</span>
                )}
              </div>
              {s.audioUrl && (
                <audio controls preload="none" src={s.audioUrl} className="odii-story-audio" />
              )}
              {s.script && <p className="odii-story-script">{s.script}</p>}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
