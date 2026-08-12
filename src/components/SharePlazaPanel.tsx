import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { formatDate } from '../lib/format';
import { normalizeLocale } from '../lib/locale';
import i18n from '../lib/i18n';
import { MapView } from './MapView';
import { useAuth } from '../contexts/AuthContext';
import { loadKakaoSdk } from '../lib/kakao';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  cloneTripFromShare,
  getImportedSourceIds,
  listPlazaEntries,
  plazaListingToTrip,
  recordPlazaImport,
  tripsRepo,
  type PlazaListing,
} from '../lib/trips';

const KOREA_CENTER = { lat: 36.38, lng: 127.51 };
const KOREA_MAP_LEVEL = 13;

type PlazaTab = 'board' | 'map';

export function SharePlazaPanel() {
  const { t } = useTranslation('share');
  const { user } = useAuth();
  const locale = normalizeLocale(i18n.language);
  const [sdkReady, setSdkReady] = useState(false);
  const [tab, setTab] = useState<PlazaTab>('board');
  const [localeFilter, setLocaleFilter] = useState<string>('');
  const [entries, setEntries] = useState<PlazaListing[]>([]);
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [pullingId, setPullingId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const key = import.meta.env.VITE_KAKAO_JS_KEY;
    if (!key) return;
    loadKakaoSdk(key)
      .then(() => setSdkReady(true))
      .catch(console.error);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [list, imported] = await Promise.all([
        listPlazaEntries(localeFilter || null),
        getImportedSourceIds(user?.id),
      ]);
      setEntries(list);
      setImportedIds(imported);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, localeFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const plazaMarkers = useMemo(
    () =>
      entries
        .filter((e) => e.center != null)
        .map((e) => ({
          id: e.id,
          lat: e.center!.lat,
          lng: e.center!.lng,
          title: e.title,
        })),
    [entries]
  );

  const handlePull = useCallback(
    async (listing: PlazaListing) => {
      if (importedIds.has(listing.id) || pullingId) return;
      setPullingId(listing.id);
      try {
        const full =
          (await tripsRepo.loadBySlug(listing.slug)) ?? plazaListingToTrip(listing);
        const cloned = cloneTripFromShare(full, user?.id ?? undefined);
        await tripsRepo.save(cloned);
        await recordPlazaImport(listing.id, cloned.id, user?.id);
        setImportedIds((prev) => new Set([...prev, listing.id]));
        setToast(`「${listing.title}」을(를) 내 여행에 끌어왔습니다`);
        setTimeout(() => setToast(null), 3500);
      } catch (e) {
        console.error(e);
        setToast('끌어오기에 실패했습니다. 다시 시도해 주세요.');
        setTimeout(() => setToast(null), 3500);
      } finally {
        setPullingId(null);
      }
    },
    [importedIds, pullingId, user?.id]
  );

  return (
    <div className="plaza-panel">
      {!isSupabaseConfigured && (
        <p className="plaza-local-notice">
          로컬 저장 모드: 이 브라우저에 등록된 공유마당 항목만 표시됩니다.
        </p>
      )}
      <label className="plaza-locale-filter">
        <span>{t('plaza.filterLocale')}</span>
        <select
          value={localeFilter}
          onChange={(e) => setLocaleFilter(e.target.value)}
          aria-label={t('plaza.filterLocale')}
        >
          <option value="">{t('plaza.localeAll')}</option>
          <option value="ko">{t('plaza.localeKo')}</option>
          <option value="en">{t('plaza.localeEn')}</option>
          <option value="ja">{t('plaza.localeJa')}</option>
          <option value="zh">{t('plaza.localeZh')}</option>
        </select>
      </label>
      <div className="plaza-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'board'}
          className={`plaza-tab${tab === 'board' ? ' active' : ''}`}
          onClick={() => setTab('board')}
        >
          {t('plaza.board')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'map'}
          className={`plaza-tab${tab === 'map' ? ' active' : ''}`}
          onClick={() => setTab('map')}
        >
          {t('plaza.map')}
        </button>
      </div>

      {tab === 'board' && (
        <section className="plaza-board" aria-label="공유 게시판">
          {loading && <p className="plaza-status">불러오는 중…</p>}
          {!loading && entries.length === 0 && (
            <p className="plaza-empty">아직 공유마당에 등록된 여행이 없습니다.</p>
          )}
          {!loading &&
            entries.map((entry) => {
              const pulled = importedIds.has(entry.id);
              const isPulling = pullingId === entry.id;
              return (
                <article key={entry.id} id={`plaza-row-${entry.id}`} className="plaza-board-row">
                  <div className="plaza-board-meta">
                    <span className="plaza-board-author">
                      {entry.displayName?.trim() || '익명'}
                    </span>
                    {entry.contactEmail && (
                      <span className="plaza-board-email">{entry.contactEmail}</span>
                    )}
                    <time
                      className="plaza-board-date"
                      dateTime={new Date(entry.listedAt).toISOString()}
                    >
                      {formatDate(
                        entry.listedAt,
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        },
                        locale
                      )}
                    </time>
                  </div>
                  <h2 className="plaza-board-trip-title">{entry.title}</h2>
                  <p className="plaza-board-summary">{entry.pinSummary}</p>
                  <div className="plaza-board-actions">
                    <Link to={`/trip/${entry.slug}`} className="plaza-board-link">
                      상세 보기
                    </Link>
                    {pulled ? (
                      <span className="plaza-pulled-badge" title="이미 내 여행에 추가함">
                        <Icon name="check" /> 끌어옴
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="plaza-pull-btn"
                        title="내 여행에 끌어오기"
                        disabled={isPulling}
                        onClick={() => void handlePull(entry)}
                      >
                        <Icon name="download" />
                        {isPulling ? '끌어오는 중…' : '끌어오기'}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
        </section>
      )}

      {tab === 'map' && (
        <section className="plaza-map-section" aria-label="전국 지도">
          <div className="plaza-map-wrap">
            {sdkReady ? (
              <MapView
                mapsReady={sdkReady}
                center={KOREA_CENTER}
                level={KOREA_MAP_LEVEL}
                searchResults={[]}
                pinned={[]}
                plazaMarkers={plazaMarkers}
                highlightPlazaId={highlightId}
                onPlazaMarkerClick={(id) => {
                  setHighlightId(id);
                  const entry = entries.find((e) => e.id === id);
                  if (entry) {
                    setTab('board');
                    requestAnimationFrame(() => {
                      document
                        .getElementById(`plaza-row-${id}`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    });
                  }
                }}
              />
            ) : (
              <p className="plaza-status">지도를 불러오는 중…</p>
            )}
          </div>
          {plazaMarkers.length === 0 && !loading && (
            <p className="plaza-map-empty">
              지도에 표시할 위치 정보가 있는 공유 여행이 없습니다.
            </p>
          )}
        </section>
      )}

      {toast && (
        <div className="plaza-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
