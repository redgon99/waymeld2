import { Icon } from './Icon';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Place, SortKey, SearchScope, SearchCategoryFilter, SearchRadiusMeters } from '../types';
import type { IconName } from '../icons/tripasist-icons';
import {
  useSearchCategoryFilters,
  useSortLabels,
  SORT_FILTER_KEYS,
  useSearchRadiusOptions,
} from '../lib/i18nCategories';
import { formatNumber } from '../lib/format';
import { normalizeLocale } from '../lib/locale';
import i18n from '../lib/i18n';
import {
  extractPlacesFromLink,
  isLinkPlacesExtractConfigured,
  type LinkPlaceCandidate,
} from '../lib/linkPlaces';
import { detectLinkInput, type DetectedLink } from '../lib/linkPlatform';
import { PlaceThumb } from './PlaceThumb';
import { OpenStatusBadge } from './OpenStatusBadge';
import { MapProviderPicker } from './MapProviderPicker';
import { PasteCollectPanel } from './PasteCollectPanel';
import { LinkExtractResults } from './LinkExtractResults';
import type { MapProvider } from '../lib/mapProvider';

interface Props {
  results: Place[];
  pinnedIds: Set<string>;
  selectedId?: string | null;
  loading?: boolean;
  enrichingStats?: boolean;
  searchEmpty?: boolean;
  searchScope: SearchScope;
  onSearchScopeChange: (scope: SearchScope) => void;
  categoryFilter: SearchCategoryFilter;
  onCategoryFilterChange: (code: SearchCategoryFilter) => void;
  searchRadius: SearchRadiusMeters;
  onSearchRadiusChange: (radius: SearchRadiusMeters) => void;
  onUseMyLocation?: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  onSearch: () => void;
  onClear: () => void;
  onResetResults: () => void;
  onTogglePin: (place: Place) => void;
  onSelectResult?: (place: Place) => void;
  onOpenRoadview?: (place: Place) => void;
  onOpenPlacePhotos?: (place: Place) => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
  searchError?: string | null;
  mapProvider: MapProvider;
  onMapProviderChange: (provider: MapProvider) => void;
  onSearchCandidate?: (query: string) => void;
  variant?: 'default' | 'compact';
}

const SORT_ICONS: Record<SortKey, IconName> = {
  distance: 'mapPin',
  rating: 'star',
  review: 'message',
};

export function SearchPanel({
  results,
  pinnedIds,
  selectedId = null,
  loading = false,
  enrichingStats = false,
  searchEmpty = false,
  searchScope,
  onSearchScopeChange,
  categoryFilter,
  onCategoryFilterChange,
  searchRadius,
  onSearchRadiusChange,
  onUseMyLocation,
  query,
  onQueryChange,
  onSearch,
  onClear,
  onResetResults,
  onTogglePin,
  onSelectResult,
  onOpenRoadview,
  onOpenPlacePhotos,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  searchError = null,
  mapProvider,
  onMapProviderChange,
  onSearchCandidate,
  variant = 'default',
}: Props) {
  const { t } = useTranslation('planner');
  const { t: tc } = useTranslation('common');
  const categoryFilters = useSearchCategoryFilters();
  const sortLabels = useSortLabels();
  const radiusOptions = useSearchRadiusOptions();
  const appLocale = normalizeLocale(i18n.language);
  const compact = variant === 'compact';
  const [sortKey, setSortKey] = useState<SortKey>('distance');
  const [linkExtracting, setLinkExtracting] = useState(false);
  const [linkPlaces, setLinkPlaces] = useState<LinkPlaceCandidate[]>([]);
  const [linkTitle, setLinkTitle] = useState<string | null>(null);
  const [linkDescription, setLinkDescription] = useState<string | null>(null);
  const [linkImageUrl, setLinkImageUrl] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSnsMessage, setLinkSnsMessage] = useState<string | null>(null);
  const [linkPreviewKey, setLinkPreviewKey] = useState<string | null>(null);
  const [linkPreviewPlatform, setLinkPreviewPlatform] = useState<
    DetectedLink['platform'] | null
  >(null);
  const [linkPreviewHref, setLinkPreviewHref] = useState<string | null>(null);

  const linkEnabled = isLinkPlacesExtractConfigured() && Boolean(onSearchCandidate);
  const detectedLink = useMemo(
    () => (linkEnabled ? detectLinkInput(query) : null),
    [query, linkEnabled]
  );
  const isExtractMode = Boolean(detectedLink?.extractable);
  const isSnsMode = Boolean(
    detectedLink &&
      !detectedLink.extractable &&
      (detectedLink.platform === 'instagram' ||
        detectedLink.platform === 'tiktok' ||
        detectedLink.platform === 'unsupported')
  );
  const isLinkMode = Boolean(detectedLink);

  useEffect(() => {
    if (detectedLink?.extractable) {
      if (linkPreviewKey && linkPreviewKey !== detectedLink.sourceKey) {
        setLinkPlaces([]);
        setLinkTitle(null);
        setLinkDescription(null);
        setLinkImageUrl(null);
        setLinkError(null);
        setLinkSnsMessage(null);
        setLinkPreviewKey(null);
        setLinkPreviewPlatform(null);
        setLinkPreviewHref(null);
      }
      setLinkSnsMessage(null);
      return;
    }
    if (detectedLink && !detectedLink.extractable) {
      setLinkPlaces([]);
      setLinkTitle(null);
      setLinkDescription(null);
      setLinkImageUrl(null);
      setLinkError(null);
      setLinkPreviewKey(detectedLink.sourceKey);
      setLinkPreviewPlatform(detectedLink.platform);
      setLinkPreviewHref(detectedLink.href);
      setLinkSnsMessage(
        detectedLink.platform === 'instagram'
          ? t('collect.linkSnsInstagram')
          : detectedLink.platform === 'tiktok'
            ? t('collect.linkSnsTiktok')
            : t('collect.linkSnsUnsupported')
      );
      return;
    }
    if (!query.trim()) {
      setLinkPlaces([]);
      setLinkTitle(null);
      setLinkDescription(null);
      setLinkImageUrl(null);
      setLinkError(null);
      setLinkSnsMessage(null);
      setLinkPreviewKey(null);
      setLinkPreviewPlatform(null);
      setLinkPreviewHref(null);
    }
  }, [detectedLink, linkPreviewKey, query, t]);

  const hasRatings = useMemo(
    () => results.some((p) => p.rating !== undefined),
    [results]
  );
  const hasReviews = useMemo(
    () => results.some((p) => p.reviewCount !== undefined),
    [results]
  );

  const sorted = useMemo(() => {
    const list = [...results];
    list.sort((a, b) => {
      const openRank = (p: Place) =>
        p.openingStatus === 'open' || p.isOpenNow
          ? 0
          : p.openingStatus === 'scheduled'
            ? 1
            : 2;
      const aOpen = openRank(a);
      const bOpen = openRank(b);
      if (aOpen !== bOpen) return aOpen - bOpen;
      switch (sortKey) {
        case 'rating':
          return (b.rating ?? -1) - (a.rating ?? -1);
        case 'review':
          return (b.reviewCount ?? -1) - (a.reviewCount ?? -1);
        case 'distance':
        default:
          return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      }
    });
    return list;
  }, [results, sortKey]);

  const showDistanceHint =
    sortKey === 'distance' && results.length > 0 && !loading;
  const showRatingHint =
    sortKey === 'rating' && results.length > 0 && !hasRatings && !enrichingStats;
  const showReviewHint =
    sortKey === 'review' && results.length > 0 && !hasReviews && !enrichingStats;

  const canSubmitSearch =
    Boolean(query.trim()) || (searchScope === 'nearby' && categoryFilter !== null);
  const canSubmit = isExtractMode
    ? !linkExtracting
    : isSnsMode
      ? true
      : canSubmitSearch;

  const handleLinkExtract = async () => {
    if (!detectedLink?.extractable || !onSearchCandidate || linkExtracting) return;
    setLinkExtracting(true);
    setLinkError(null);
    setLinkPlaces([]);
    setLinkTitle(null);
    setLinkDescription(null);
    setLinkImageUrl(null);
    setLinkSnsMessage(null);
    try {
      const result = await extractPlacesFromLink(detectedLink.href);
      if (!result.extractable) {
        setLinkSnsMessage(result.message ?? t('collect.linkSnsUnsupported'));
        setLinkPreviewKey(result.sourceKey);
        setLinkPreviewPlatform(result.platform);
        setLinkPreviewHref(result.sourceUrl);
        return;
      }
      setLinkPlaces(result.places);
      setLinkTitle(result.title);
      setLinkDescription(result.description);
      setLinkImageUrl(result.imageUrl);
      setLinkPreviewKey(result.sourceKey);
      setLinkPreviewPlatform(result.platform);
      setLinkPreviewHref(result.sourceUrl);
      if (result.places.length === 0) {
        setLinkError(t('collect.youtubeEmpty'));
      }
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : t('collect.youtubeError'));
    } finally {
      setLinkExtracting(false);
    }
  };

  const handleSubmit = () => {
    if (isExtractMode) {
      void handleLinkExtract();
      return;
    }
    if (isSnsMode && detectedLink) {
      window.open(detectedLink.href, '_blank', 'noopener,noreferrer');
      return;
    }
    if (canSubmitSearch) onSearch();
  };

  const handleClear = () => {
    setLinkPlaces([]);
    setLinkTitle(null);
    setLinkDescription(null);
    setLinkImageUrl(null);
    setLinkError(null);
    setLinkSnsMessage(null);
    setLinkPreviewKey(null);
    setLinkPreviewPlatform(null);
    setLinkPreviewHref(null);
    onClear();
  };

  const handleSearchCandidate = (name: string) => {
    onSearchCandidate?.(name);
  };

  const submitLabel = isExtractMode
    ? linkExtracting
      ? t('collect.youtubeLoading')
      : t('collect.youtubeExtract')
    : isSnsMode
      ? t('collect.linkOpenSource')
      : tc('search');

  return (
    <div className={`search-panel ${compact ? 'search-panel-compact' : ''}`}>
      {onSearchCandidate && (
        <PasteCollectPanel
          onSearchCandidate={onSearchCandidate}
          disabled={loading || linkExtracting}
        />
      )}
      <div
        className={`search-box ${isLinkMode ? 'search-box-youtube search-box-link' : ''}`}
      >
        <div className="search-box-field">
          <Icon name={isLinkMode ? 'attach' : 'search'} className="search-icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
            placeholder={
              linkEnabled ? t('search.placeholderWithLink') : t('search.placeholder')
            }
            aria-label={t('search.ariaLabel')}
          />
          {query && (
            <button className="clear-btn" onClick={handleClear} aria-label={t('search.clearAria')}>
              <Icon name="close" />
            </button>
          )}
        </div>
        <div className="search-box-actions">
          <button
            type="button"
            className={`search-submit-btn ${isExtractMode ? 'search-submit-btn-youtube' : ''} ${isSnsMode ? 'search-submit-btn-sns' : ''}`}
            onClick={handleSubmit}
            disabled={!canSubmit || loading || linkExtracting}
            aria-label={submitLabel}
          >
            {submitLabel}
          </button>
          <MapProviderPicker value={mapProvider} onChange={onMapProviderChange} />
        </div>
      </div>

      {linkEnabled && (
        <LinkExtractResults
          detected={detectedLink}
          previewKey={linkPreviewKey}
          previewPlatform={linkPreviewPlatform}
          previewHref={linkPreviewHref}
          title={linkTitle}
          description={linkDescription}
          imageUrl={linkImageUrl}
          places={linkPlaces}
          error={linkError}
          extracting={linkExtracting}
          snsMessage={linkSnsMessage}
          onSearchCandidate={handleSearchCandidate}
          disabled={loading}
        />
      )}

      <p className="search-batch-hint">
        {isExtractMode
          ? t('search.linkExtractHint')
          : isSnsMode
            ? t('search.linkSnsHint')
            : t('search.batchHint')}
      </p>

      <div className="search-category-row" role="group" aria-label={t('search.ariaLabel')}>
        {categoryFilters.map((item) => (
          <button
            key={item.code ?? 'all'}
            type="button"
            className={`cat-filter-chip ${categoryFilter === item.code ? 'active' : ''}`}
            data-cat={item.code ?? 'all'}
            onClick={() => onCategoryFilterChange(item.code)}
            title={item.label}
          >
            <Icon name={item.icon} />
            {item.label}
          </button>
        ))}
      </div>

      <div className="search-scope-row">
        <button
          type="button"
          className={`scope-chip ${searchScope === 'nationwide' ? 'active' : ''}`}
          onClick={() => onSearchScopeChange('nationwide')}
        >
          {t('search.scopeNationwide')}
        </button>
        <button
          type="button"
          className={`scope-chip ${searchScope === 'nearby' ? 'active' : ''}`}
          onClick={() => onSearchScopeChange('nearby')}
        >
          {compact ? t('search.scopeNearbyShort') : t('search.scopeNearby')}
        </button>
        {searchScope === 'nearby' && onUseMyLocation && (
          <button type="button" className="scope-locate" onClick={onUseMyLocation}>
            <Icon name="location" /> {t('search.myLocation')}
          </button>
        )}
        {searchScope === 'nearby' && (
          <label className="radius-select-wrap">
            <span className="radius-label">{t('search.radius')}</span>
            <select
              className="radius-select"
              value={searchRadius}
              onChange={(e) =>
                onSearchRadiusChange(Number(e.target.value) as SearchRadiusMeters)
              }
              aria-label={t('search.radiusAria')}
            >
              {radiusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {!compact && searchScope === 'nationwide' && (
        <p className="search-scope-hint">
          {mapProvider === 'google'
            ? t('search.hintNationwideGoogle')
            : t('search.hintNationwideKakao')}
        </p>
      )}

      {searchError && (
        <div className="search-error" role="alert">
          {searchError}
        </div>
      )}

      {searchEmpty && !loading && query.trim() && (
        <div className="result-card result-empty">
          <p>
            {t('search.noResults')}
            {searchScope === 'nearby'
              ? ' 「전국」으로 바꾸거나 지도를 이동한 뒤 다시 검색해 보세요.'
              : ' 다른 키워드로 시도해 보세요.'}
          </p>
        </div>
      )}

      {(results.length > 0 || loading) && (
        <div className="result-card">
          <div className="result-card-header">
          <div className="sort-row sort-filter-row">
            {compact ? (
              <label className="sort-compact-select-wrap">
                <span className="sr-only">정렬</span>
                <select
                  className="sort-compact-select"
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  aria-label="검색 결과 정렬"
                >
                  {SORT_FILTER_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {sortLabels[key]}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="sort-chips" role="group" aria-label={t('search.ariaLabel')}>
                {SORT_FILTER_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`sort-chip ${sortKey === key ? 'active' : ''}`}
                    onClick={() => setSortKey(key)}
                    aria-pressed={sortKey === key}
                  >
                    <Icon name={SORT_ICONS[key]} />
                    {sortLabels[key]}
                  </button>
                ))}
              </div>
            )}
            <span className="result-count">
              {loading
                ? t('search.loading')
                : enrichingStats
                  ? t('search.enriching')
                  : formatNumber(results.length, appLocale)}
            </span>
            <button
              type="button"
              className="result-reset-btn"
              onClick={() => {
                setSortKey('distance');
                onResetResults();
              }}
              disabled={loading}
              aria-label="검색 결과 초기화"
            >
              <Icon name="refresh" />
            </button>
          </div>
          {!compact && showDistanceHint && (
            <p className="scope-hint">
              거리순 · 지도 중심 기준
              {searchScope === 'nearby' ? ` · 반경 ${searchRadius / 1000}km 이내` : ' 직선 거리'}
            </p>
          )}
          {!compact && enrichingStats && (
            <p className="scope-hint">카카오맵에서 사진·평점 정보를 불러오는 중…</p>
          )}
          {!compact && showRatingHint && (
            <p className="scope-hint scope-hint-warn">평점 정보가 없어 기본 순서와 같을 수 있습니다</p>
          )}
          {!compact && showReviewHint && (
            <p className="scope-hint scope-hint-warn">리뷰 수 정보가 없어 기본 순서와 같을 수 있습니다</p>
          )}
          </div>

          <div className="result-card-body">
          <ul className="result-list">
            {sorted.map((place) => {
              const isPinned = pinnedIds.has(place.id);
              return (
                <li
                  key={place.id}
                  className={`result-item ${isPinned ? 'pinned' : ''} ${selectedId === place.id ? 'selected' : ''}`}
                  onClick={() => onSelectResult?.(place)}
                >
                  <PlaceThumb
                    place={place}
                    onOpenPhotos={onOpenPlacePhotos ?? (() => {})}
                  />
                  <div className="result-body">
                    <div className="result-name-row">
                      <span className="result-name">{place.name}</span>
                      {(place.openingStatus === 'closed' || place.openingStatus === 'offday') && (
                        <OpenStatusBadge
                          status={place.openingStatus === 'offday' ? 'offday' : 'closed'}
                        />
                      )}
                      {place.openingStatus === 'scheduled' && (
                        <OpenStatusBadge status="scheduled" opensAt={place.opensAt} />
                      )}
                      {place.openingStatus === 'open' && (
                        <OpenStatusBadge status="open" closesAt={place.closesAt} />
                      )}
                    </div>
                    <div className="result-meta">
                      {place.categoryLabel && (
                        <span className="result-cat-badge">{place.categoryLabel}</span>
                      )}
                      {place.categoryDetail && (
                        <span className="result-cat-detail">{place.categoryDetail}</span>
                      )}
                      {(place.roadAddress || place.address) && (
                        <span className="result-addr">
                          {place.roadAddress || place.address}
                        </span>
                      )}
                      <div className="result-meta-row">
                        {place.rating !== undefined && (
                          <span className="result-rating">
                            <Icon name="star" className="star" />
                            {place.rating.toFixed(1)}
                          </span>
                        )}
                        {place.reviewCount !== undefined && (
                          <span>리뷰 {place.reviewCount.toLocaleString()}</span>
                        )}
                        {sortKey === 'distance' && place.distance !== undefined && (
                          <span className="result-distance">
                            {formatDistance(place.distance)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="result-actions">
                    {onOpenRoadview && (
                      <button
                        type="button"
                        className="result-aux-btn result-roadview-btn"
                        title="로드뷰"
                        aria-label={`${place.name} 로드뷰`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenRoadview(place);
                        }}
                      >
                        <Icon name="roadview" />
                      </button>
                    )}
                    <button
                      className={`pin-btn ${isPinned ? 'pinned' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePin(place);
                      }}
                    >
                      {isPinned ? (
                        <>
                          <Icon name="check" /> 핀업됨
                        </>
                      ) : (
                        <>
                          <Icon name="pin" /> 핀업
                        </>
                      )}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {hasMore && onLoadMore && (
            <button
              type="button"
              className="load-more-btn"
              disabled={loadingMore}
              onClick={onLoadMore}
            >
              {loadingMore ? '불러오는 중…' : '더보기'}
            </button>
          )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDistance(m: number): string {
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}
