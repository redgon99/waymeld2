import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthBar } from '../components/AuthBar';
import { LocaleSwitcher } from '../components/LocaleSwitcher';
import { TrailRouteModal } from '../components/TrailRouteModal';
import { normalizeLocale, pathWithLocale } from '../lib/locale';
import { plannerPath } from '../lib/routes';
import i18n from '../lib/i18n';
import {
  fetchTourPhotos,
  fetchTourTrails,
  isTourInfoConfigured,
  type TourPhoto,
  type TourTrailCourse,
  type TrailKind,
} from '../lib/tourInfo';
import '../styles/app.css';

type InfoTab = 'photos' | 'trails';

const LEVEL_LABEL_KEY: Record<'1' | '2' | '3', string> = {
  '1': 'trails.levelLow',
  '2': 'trails.levelMid',
  '3': 'trails.levelHigh',
};

function formatMonth(month: string | undefined): string | null {
  if (!month || month.length !== 6) return null;
  return `${month.slice(0, 4)}.${month.slice(4, 6)}`;
}

function formatHours(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}${m ? 'm' : ''}`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function KoreaInfoPage() {
  const { t } = useTranslation('korInfo');
  const locale = normalizeLocale(i18n.language);
  const planPath = plannerPath(locale);

  const [tab, setTab] = useState<InfoTab>('photos');

  const [photoKeyword, setPhotoKeyword] = useState('');
  const [photos, setPhotos] = useState<TourPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photosError, setPhotosError] = useState<string | null>(null);

  const [trailKeyword, setTrailKeyword] = useState('');
  const [trailKind, setTrailKind] = useState<TrailKind | ''>('');
  const [trailLevel, setTrailLevel] = useState<'1' | '2' | '3' | ''>('');
  const [trails, setTrails] = useState<TourTrailCourse[]>([]);
  const [trailsLoading, setTrailsLoading] = useState(true);
  const [trailsError, setTrailsError] = useState<string | null>(null);
  const [routeModalCourse, setRouteModalCourse] = useState<TourTrailCourse | null>(null);

  useEffect(() => {
    document.title = t('metaTitle');
  }, [t]);

  useEffect(() => {
    if (!isTourInfoConfigured()) {
      setPhotosLoading(false);
      setPhotosError(t('errors.notConfigured'));
      return;
    }
    let alive = true;
    setPhotosLoading(true);
    setPhotosError(null);
    const timer = setTimeout(() => {
      fetchTourPhotos({ keyword: photoKeyword, numOfRows: 24 })
        .then(({ items }) => {
          if (alive) setPhotos(items);
        })
        .catch((e) => {
          if (alive) setPhotosError(e instanceof Error ? e.message : t('errors.loadFailed'));
        })
        .finally(() => {
          if (alive) setPhotosLoading(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [photoKeyword, t]);

  useEffect(() => {
    if (!isTourInfoConfigured()) {
      setTrailsLoading(false);
      setTrailsError(t('errors.notConfigured'));
      return;
    }
    let alive = true;
    setTrailsLoading(true);
    setTrailsError(null);
    const timer = setTimeout(() => {
      fetchTourTrails({
        keyword: trailKeyword,
        brdDiv: trailKind || undefined,
        level: trailLevel || undefined,
        numOfRows: 30,
      })
        .then(({ items }) => {
          if (alive) setTrails(items);
        })
        .catch((e) => {
          if (alive) setTrailsError(e instanceof Error ? e.message : t('errors.loadFailed'));
        })
        .finally(() => {
          if (alive) setTrailsLoading(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [trailKeyword, trailKind, trailLevel, t]);

  return (
    <main className="guides-page">
      <header className="guides-header">
        <div className="guides-header-inner">
          <div>
            <Link to={pathWithLocale('/', locale)} className="guides-brand">
              {t('brand')}
            </Link>
            <h1>{t('title')}</h1>
            <p className="guides-lead">{t('subtitle')}</p>
          </div>
          <div className="guides-header-actions">
            <LocaleSwitcher />
            <AuthBar />
            <Link to={planPath} className="guides-btn">
              {t('cta.planner')}
            </Link>
          </div>
        </div>
      </header>

      <div className="guides-shell">
        <div className="guides-kind-filters" role="tablist" aria-label={t('tabs.label')}>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'photos'}
            className={`guides-kind-chip${tab === 'photos' ? ' is-active' : ''}`}
            onClick={() => setTab('photos')}
          >
            {t('tabs.photos')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'trails'}
            className={`guides-kind-chip${tab === 'trails' ? ' is-active' : ''}`}
            onClick={() => setTab('trails')}
          >
            {t('tabs.trails')}
          </button>
        </div>

        {tab === 'photos' && (
          <section>
            <input
              type="search"
              className="info-search-input"
              placeholder={t('photos.searchPlaceholder')}
              value={photoKeyword}
              onChange={(e) => setPhotoKeyword(e.currentTarget.value)}
            />
            {photosLoading && <p className="guides-muted">{t('list.loading')}</p>}
            {photosError && <p className="guides-error">{photosError}</p>}
            {!photosLoading && !photosError && photos.length === 0 && (
              <p className="guides-muted">{t('list.empty')}</p>
            )}
            <div className="info-photo-grid">
              {photos.map((p) => (
                <figure key={p.contentId} className="info-photo-card">
                  <img src={p.imageUrl} alt={p.title} loading="lazy" />
                  <figcaption>
                    <strong>{p.title}</strong>
                    <span>
                      {[p.location, formatMonth(p.month)].filter(Boolean).join(' · ')}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {tab === 'trails' && (
          <section>
            <input
              type="search"
              className="info-search-input"
              placeholder={t('trails.searchPlaceholder')}
              value={trailKeyword}
              onChange={(e) => setTrailKeyword(e.currentTarget.value)}
            />
            <div className="guides-kind-filters" role="group" aria-label={t('trails.filterLabel')}>
              {(
                [
                  { id: '', label: t('kinds.all') },
                  { id: 'DNWW', label: t('trails.walking') },
                  { id: 'DNBW', label: t('trails.cycling') },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id || 'all'}
                  type="button"
                  className={`guides-kind-chip${trailKind === chip.id ? ' is-active' : ''}`}
                  onClick={() => setTrailKind(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
              {(
                [
                  { id: '', label: t('kinds.all') },
                  { id: '1', label: t('trails.levelLow') },
                  { id: '2', label: t('trails.levelMid') },
                  { id: '3', label: t('trails.levelHigh') },
                ] as const
              ).map((chip) => (
                <button
                  key={`level-${chip.id || 'all'}`}
                  type="button"
                  className={`guides-kind-chip${trailLevel === chip.id ? ' is-active' : ''}`}
                  onClick={() => setTrailLevel(chip.id)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            {trailsLoading && <p className="guides-muted">{t('list.loading')}</p>}
            {trailsError && <p className="guides-error">{trailsError}</p>}
            {!trailsLoading && !trailsError && trails.length === 0 && (
              <p className="guides-muted">{t('list.empty')}</p>
            )}
            <div className="info-trail-list">
              {trails.map((c) => (
                <article key={c.courseId} className="info-trail-card">
                  <div className="info-trail-card-head">
                    <h2>{c.name}</h2>
                    <span className="guides-tag guides-tag-kind">
                      {c.kind === 'DNWW' ? t('trails.walking') : t('trails.cycling')}
                    </span>
                  </div>
                  <div className="info-trail-meta">
                    {c.region && <span>{c.region}</span>}
                    <span>{c.distanceKm}km</span>
                    <span>{formatHours(c.totalMinutes)}</span>
                    <span>{t(LEVEL_LABEL_KEY[c.level])}</span>
                    {c.cycle && <span>{c.cycle}</span>}
                  </div>
                  {c.summary && <p className="info-trail-summary">{c.summary}</p>}
                  {c.gpxUrl && (
                    <button type="button" className="guides-btn" onClick={() => setRouteModalCourse(c)}>
                      {t('trails.viewRoute')}
                    </button>
                  )}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>

      <TrailRouteModal course={routeModalCourse} onClose={() => setRouteModalCourse(null)} />
    </main>
  );
}
