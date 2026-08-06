import { Icon } from './Icon';
import { useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  Place,
  SortKey,
  SearchScope,
  SearchCategoryFilter,
  SearchRadiusMeters,
  FoodRestriction,
} from '../types';
import { useSearchCategoryFilters } from '../lib/i18nCategories';
import { getSearchCategoryAccent } from '../lib/categories';
import { formatNumber } from '../lib/format';
import { normalizeLocale } from '../lib/locale';
import i18n from '../lib/i18n';
import {
  extractPlacesFromLink,
  isLinkPlacesExtractConfigured,
  type LinkPlaceCandidate,
} from '../lib/linkPlaces';
import { detectLinkInput, type DetectedLink } from '../lib/linkPlatform';
import { looksLikePastedPlaceList, splitSearchQueries } from '../lib/searchQueries';
import {
  getSearchSubFilterGroup,
  type SearchSubFilterId,
} from '../lib/searchSubFilters';
import { PlaceThumb } from './PlaceThumb';
import { OpenStatusBadge } from './OpenStatusBadge';
import { MapProviderPicker } from './MapProviderPicker';
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
  /** 맛집(FD6) 음식 제약 — trip에 저장 */
  foodRestrictions?: FoodRestriction[];
  onFoodRestrictionsChange?: (next: FoodRestriction[]) => void;
  /** 숙소·관광·마트 등 카테고리 하부 필터 */
  categorySubFilters?: SearchSubFilterId[];
  onCategorySubFiltersChange?: (next: SearchSubFilterId[]) => void;
  variant?: 'default' | 'compact';
}

function insightBadge(place: Place): { kind: 'y' | 'g' | 'n'; label: string } | null {
  const rating = place.rating;
  const reviews = place.reviewCount ?? 0;
  if (rating != null && rating >= 4.5 && reviews >= 500) {
    return { kind: 'y', label: '#1 pick by visitors 방문자 1위' };
  }
  if (rating != null && rating >= 4.0 && reviews >= 50) {
    return { kind: 'g', label: '92% positive reviews' };
  }
  if (rating != null && rating < 3.5 && reviews >= 20) {
    return { kind: 'n', label: 'Long wait 웨이팅 김' };
  }
  return null;
}

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
  foodRestrictions = [],
  onFoodRestrictionsChange,
  categorySubFilters = [],
  onCategorySubFiltersChange,
  variant = 'default',
}: Props) {
  const { t } = useTranslation('planner');
  const { t: tc } = useTranslation('common');
  const categoryFilters = useSearchCategoryFilters();
  const appLocale = normalizeLocale(i18n.language);
  const compact = variant === 'compact';
  const [sortKey] = useState<SortKey>('distance');
  const subFilterGroup = getSearchSubFilterGroup(categoryFilter);
  const activeSubFilters =
    categoryFilter === 'FD6' ? foodRestrictions : categorySubFilters;
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
  const [pasteHint, setPasteHint] = useState<string | null>(null);

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
      setPasteHint(null);
    }
  }, [detectedLink, linkPreviewKey, query, t]);

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
      return (a.distance ?? Infinity) - (b.distance ?? Infinity);
    });
    return list;
  }, [results]);

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

  const normalizePasteIntoQuery = (raw: string) => {
    const parts = splitSearchQueries(raw);
    if (parts.length <= 1) return raw.trim();
    setPasteHint(t('search.pasteExtracted', { count: parts.length }));
    return parts.join(', ');
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text || !looksLikePastedPlaceList(text)) return;
    if (detectLinkInput(text)?.extractable) return;
    e.preventDefault();
    const normalized = normalizePasteIntoQuery(text);
    onQueryChange(normalized);
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
    if (looksLikePastedPlaceList(query)) {
      const normalized = normalizePasteIntoQuery(query);
      if (normalized !== query) onQueryChange(normalized);
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
    setPasteHint(null);
    onClear();
  };

  const handleSearchCandidate = (name: string) => {
    onSearchCandidate?.(name);
  };

  const toggleSubFilter = (id: SearchSubFilterId) => {
    if (categoryFilter === 'FD6') {
      if (!onFoodRestrictionsChange) return;
      const foodId = id as FoodRestriction;
      if (foodRestrictions.includes(foodId)) {
        onFoodRestrictionsChange(foodRestrictions.filter((s) => s !== foodId));
      } else {
        onFoodRestrictionsChange([...foodRestrictions, foodId]);
      }
      return;
    }
    if (!onCategorySubFiltersChange) return;
    if (categorySubFilters.includes(id)) {
      onCategorySubFiltersChange(categorySubFilters.filter((s) => s !== id));
    } else {
      onCategorySubFiltersChange([...categorySubFilters, id]);
    }
  };

  const metaLine =
    searchScope === 'nearby'
      ? t('search.metaNearby', {
          km: searchRadius / 1000,
          count: results.length,
          defaultValue: `Near map center · 지도 주변 ${searchRadius / 1000} km · ${results.length} results`,
        })
      : t('search.metaNationwide', {
          count: results.length,
          defaultValue: `Nationwide · 전국 · ${results.length} results`,
        });

  const categoryChipLabel = (code: SearchCategoryFilter, fallback: string) => {
    if (code === null) return `All ${tc('category.all')}`;
    if (code === 'FD6') return `Food ${tc('category.food')}`;
    if (code === 'AT4') return `Sights ${tc('category.tour')}`;
    if (code === 'AD5') return `Stay ${tc('category.stay')}`;
    if (code === 'MT1') return `Mart ${tc('category.shop')}`;
    return fallback;
  };

  return (
    <div className={`search-panel search-panel-v2 ${compact ? 'search-panel-compact' : ''}`}>
      <div className={`search-pill ${isLinkMode ? 'is-link' : ''}`}>
        <Icon name={isLinkMode ? 'attach' : 'search'} className="search-pill-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setPasteHint(null);
            onQueryChange(e.target.value);
          }}
          onPaste={handlePaste}
          onKeyDown={(e) => e.key === 'Enter' && canSubmit && handleSubmit()}
          placeholder={t('search.placeholderDesign')}
          aria-label={t('search.ariaLabel')}
        />
        {query && (
          <button type="button" className="search-pill-clear" onClick={handleClear} aria-label={t('search.clearAria')}>
            <Icon name="close" size={16} />
          </button>
        )}
        <button
          type="button"
          className="search-pill-go"
          onClick={handleSubmit}
          disabled={!canSubmit || loading || linkExtracting}
          aria-label={tc('search')}
        >
          {linkExtracting ? <Icon name="loader" spin size={16} /> : <Icon name="search" size={16} />}
        </button>
      </div>

      <div className="search-pill-tools">
        <MapProviderPicker value={mapProvider} onChange={onMapProviderChange} />
        {onUseMyLocation && (
          <button type="button" className="search-tool-chip" onClick={onUseMyLocation}>
            <Icon name="location" size={14} /> {t('search.myLocation')}
          </button>
        )}
        <button
          type="button"
          className={`search-tool-chip ${searchScope === 'nearby' ? 'active' : ''}`}
          onClick={() => onSearchScopeChange(searchScope === 'nearby' ? 'nationwide' : 'nearby')}
        >
          {searchScope === 'nearby' ? t('search.scopeNearby') : t('search.scopeNationwide')}
        </button>
        {searchScope === 'nearby' && (
          <select
            className="search-tool-select"
            value={searchRadius}
            onChange={(e) =>
              onSearchRadiusChange(Number(e.target.value) as SearchRadiusMeters)
            }
            aria-label={t('search.radiusAria')}
          >
            {[1000, 3000, 5000, 10000, 20000].map((v) => (
              <option key={v} value={v}>
                {v / 1000} km
              </option>
            ))}
          </select>
        )}
      </div>

      {pasteHint && <p className="search-paste-hint">{pasteHint}</p>}

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

      <div className="search-cat-pills" role="group" aria-label={t('search.ariaLabel')}>
        {categoryFilters.map((item) => {
          const accent = getSearchCategoryAccent(item.code);
          const active = categoryFilter === item.code;
          return (
            <button
              key={item.code ?? 'all'}
              type="button"
              className={`search-cat-pill ${active ? 'active' : ''}`}
              style={{
                borderColor: accent,
                ...(active
                  ? { background: accent, color: '#fff' }
                  : { color: accent }),
              }}
              onClick={() => onCategoryFilterChange(item.code)}
            >
              {categoryChipLabel(item.code, item.label)}
            </button>
          );
        })}
      </div>

      {subFilterGroup && (
        <div className="search-subfilters">
          <span className="search-subfilters-label">{subFilterGroup.label}</span>
          <div className="search-subfilters-row" role="group" aria-label={subFilterGroup.label}>
            {subFilterGroup.options.map((opt) => {
              const active = activeSubFilters.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`search-subfilters-chip ${active ? 'active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleSubFilter(opt.id)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {(results.length > 0 || loading || enrichingStats) && (
        <p className="search-meta-line">
          {loading || enrichingStats
            ? loading
              ? t('search.loading')
              : t('search.enriching')
            : metaLine}
        </p>
      )}

      {searchError && (
        <div className="search-error" role="alert">
          {searchError}
        </div>
      )}

      {searchEmpty && !loading && query.trim() && (
        <div className="search-empty-msg">
          {t('search.noResults')}
        </div>
      )}

      {!loading && results.length === 0 && !searchEmpty && !query.trim() && categoryFilter === null && (
        <div className="search-empty-msg muted">{t('search.emptyHint')}</div>
      )}

      {results.length > 0 && (
        <ul className="search-result-list">
          {sorted.map((place) => {
            const isPinned = pinnedIds.has(place.id);
            const badge = insightBadge(place);
            const enHint = place.categoryDetail || place.categoryLabel || '';
            return (
              <li
                key={place.id}
                className={`search-result-card ${isPinned ? 'pinned' : ''} ${
                  selectedId === place.id ? 'selected' : ''
                }`}
                onClick={() => onSelectResult?.(place)}
              >
                  <PlaceThumb
                    place={place}
                    variant="emoji"
                    onOpenPhotos={onOpenPlacePhotos ?? (() => {})}
                  />
                <div className="search-result-body">
                  <div className="search-result-title">
                    <span className="search-result-name">{place.name}</span>
                    {enHint && <span className="search-result-en">{enHint}</span>}
                    {(place.openingStatus === 'closed' || place.openingStatus === 'offday') && (
                      <OpenStatusBadge
                        status={place.openingStatus === 'offday' ? 'offday' : 'closed'}
                      />
                    )}
                  </div>
                  <div className="search-result-stats">
                    {place.rating !== undefined && (
                      <span>
                        ★ {place.rating.toFixed(1)}
                        {place.reviewCount !== undefined
                          ? ` · ${formatNumber(place.reviewCount, appLocale)} reviews`
                          : ''}
                      </span>
                    )}
                    {place.distance !== undefined && (
                      <span> · {formatDistance(place.distance)}</span>
                    )}
                  </div>
                  {badge && (
                    <span className={`insight-badge ${badge.kind}`}>{badge.label}</span>
                  )}
                </div>
                <button
                  type="button"
                  className={`search-pin-btn ${isPinned ? 'pinned' : ''}`}
                  aria-label={isPinned ? t('search.unpin') : t('search.pin')}
                  title={isPinned ? t('search.unpin') : t('search.pin')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePin(place);
                  }}
                >
                  <Icon name={isPinned ? 'pin' : 'pinPlus'} size={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && onLoadMore && results.length > 0 && (
        <button
          type="button"
          className="load-more-btn"
          disabled={loadingMore}
          onClick={onLoadMore}
        >
          {loadingMore ? '불러오는 중…' : '더보기'}
        </button>
      )}

      {results.length > 0 && (
        <button
          type="button"
          className="search-reset-link"
          onClick={onResetResults}
          disabled={loading}
        >
          <Icon name="refresh" size={14} /> 결과 초기화
        </button>
      )}
    </div>
  );
}

function formatDistance(m: number): string {
  if (m < 1000) return `${m}m`;
  return `${(m / 1000).toFixed(1)}km`;
}
