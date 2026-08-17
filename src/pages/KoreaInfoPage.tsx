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
  fetchFilteredPlaces,
  fetchTourPhotos,
  fetchTourTrails,
  isTourInfoConfigured,
  type PlaceListKind,
  type TourFilteredPlace,
  type TourPhoto,
  type TourTrailCourse,
} from '../lib/tourInfo';
import '../styles/app.css';

type InfoTab = 'photos' | 'trails' | 'pet' | 'with';

const LEVEL_LABEL_KEY: Record<'1' | '2' | '3', string> = {
  '1': 'trails.levelLow',
  '2': 'trails.levelMid',
  '3': 'trails.levelHigh',
};

/**
 * 두루누비 courseList는 brdDiv(걷기/자전거) 필터가 실효가 없고, 자체는 100% 걷기길인
 * 코리아둘레길 4개 브랜드로만 구성되어 있다(서해랑길/해파랑길/남파랑길/DMZ 평화의 길).
 * 이 4개는 서버 필터가 아니라 코스명 접두어로 클라이언트에서 구분한다.
 */
const TRAIL_BRANDS = ['해파랑길', '남파랑길', '서해랑길', 'DMZ 평화의 길'] as const;

function trailBrandOf(name: string): string | null {
  return TRAIL_BRANDS.find((b) => name.startsWith(b)) ?? null;
}

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

/** 반려동물 동반여행(KorPetTourService2)/무장애여행(KorWithService2) — 검색 가능한 목록 브라우징 */
function FilteredPlaceSection({ kind }: { kind: PlaceListKind }) {
  const { t } = useTranslation('korInfo');
  const [keyword, setKeyword] = useState('');
  const [places, setPlaces] = useState<TourFilteredPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isTourInfoConfigured()) {
      setLoading(false);
      setError(t('errors.notConfigured'));
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      fetchFilteredPlaces(kind, { keyword, numOfRows: 24 })
        .then(({ items }) => {
          if (alive) setPlaces(items);
        })
        .catch((e) => {
          if (alive) setError(e instanceof Error ? e.message : t('errors.loadFailed'));
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [kind, keyword, t]);

  return (
    <section>
      <input
        type="search"
        className="info-search-input"
        placeholder={t(`${kind}.searchPlaceholder`)}
        value={keyword}
        onChange={(e) => setKeyword(e.currentTarget.value)}
      />
      {loading && <p className="guides-muted">{t('list.loading')}</p>}
      {error && <p className="guides-error">{error}</p>}
      {!loading && !error && places.length === 0 && <p className="guides-muted">{t('list.empty')}</p>}
      <div className="info-photo-grid">
        {places.map((p) => (
          <figure key={p.contentId} className="info-photo-card">
            {p.thumbnailUrl ? (
              <img src={p.thumbnailUrl} alt={p.title} loading="lazy" />
            ) : (
              <div className="info-photo-card-noimg" aria-hidden />
            )}
            <figcaption>
              <strong>{p.title}</strong>
              <span>{p.address}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
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
  const [trailBrand, setTrailBrand] = useState<string>('');
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
      // 필터 없는 전체 코스 수 자체가 144건뿐이라 페이지네이션 없이 한 번에 받아온다.
      fetchTourTrails({
        keyword: trailKeyword,
        level: trailLevel || undefined,
        numOfRows: 150,
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
  }, [trailKeyword, trailLevel, t]);

  const visibleTrails = trailBrand ? trails.filter((c) => c.name.startsWith(trailBrand)) : trails;

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
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'pet'}
            className={`guides-kind-chip${tab === 'pet' ? ' is-active' : ''}`}
            onClick={() => setTab('pet')}
          >
            {t('tabs.pet')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'with'}
            className={`guides-kind-chip${tab === 'with' ? ' is-active' : ''}`}
            onClick={() => setTab('with')}
          >
            {t('tabs.with')}
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
              {[{ id: '', label: t('kinds.all') }, ...TRAIL_BRANDS.map((b) => ({ id: b, label: t(`trails.brand.${b}`) }))].map(
                (chip) => (
                  <button
                    key={chip.id || 'all'}
                    type="button"
                    className={`guides-kind-chip${trailBrand === chip.id ? ' is-active' : ''}`}
                    onClick={() => setTrailBrand(chip.id)}
                  >
                    {chip.label}
                  </button>
                )
              )}
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
            {!trailsLoading && !trailsError && visibleTrails.length === 0 && (
              <p className="guides-muted">{t('list.empty')}</p>
            )}
            <div className="info-trail-list">
              {visibleTrails.map((c) => (
                <article key={c.courseId} className="info-trail-card">
                  <div className="info-trail-card-head">
                    <h2>{c.name}</h2>
                    {trailBrandOf(c.name) && (
                      <span className="guides-tag guides-tag-kind">{t(`trails.brand.${trailBrandOf(c.name)}`)}</span>
                    )}
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
        {tab === 'pet' && <FilteredPlaceSection kind="pet" />}
        {tab === 'with' && <FilteredPlaceSection kind="with" />}
      </div>

      <TrailRouteModal course={routeModalCourse} onClose={() => setRouteModalCourse(null)} />
    </main>
  );
}
