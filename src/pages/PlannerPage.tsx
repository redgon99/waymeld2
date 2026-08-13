import { Icon } from '../components/Icon';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type {
  Place,
  PinnedPlace,
  RouteOptions,
  GeneratedRoute,
  Origin,
  SearchScope,
  SearchCategoryFilter,
  SearchRadiusMeters,
  SimpleCategory,
  TripMaterial,
  TripTheme,
  FoodRestriction,
} from '../types';
import { coordsToAddress, loadKakaoSdk, searchPlacesUnified } from '../lib/kakao';
import { loadGoogleMapsSdk, searchPlacesUnifiedWithGoogle } from '../lib/googleMaps';
import {
  inferMapProviderFromLocation,
  resolveMapProvider,
  type MapProvider,
} from '../lib/mapProvider';
import {
  hasSavedMapProviderChoice,
  readMapProviderChoice,
  writeMapProviderChoice,
} from '../lib/mapProviderPreference';
import { getApproximateLocation } from '../lib/geolocation';
import { KAKAO_LEVEL_DEFAULT } from '../lib/mapZoom';
import {
  DEFAULT_MAP_CENTER,
  readMapViewport,
  writeMapViewport,
} from '../lib/mapViewport';
import { computeTripCenter } from '../lib/tripGeo';
import { googleMapsLanguage, normalizeLocale } from '../lib/locale';
import i18n from '../lib/i18n';
import {
  canCreateTrip,
  canRunGoogleSearch,
  recordGoogleSearch,
  FREE_MAX_TRIPS,
} from '../lib/subscription';
import { UpgradeModal } from '../components/UpgradeModal';
import { enrichPlacesWithStats } from '../lib/placeStats';
import { generateRoute, refineRouteWithRealLegs, haversineMeters } from '../lib/planner';
import { fetchLegs } from '../lib/mobility';
import { resolveOriginForRoute } from '../lib/resolveOrigin';
import { suggestStayMinutes } from '../lib/categories';
import {
  normalizeTrip,
  DEFAULT_ROUTE_OPTIONS,
  getRouteOptionsForDay,
  patchRouteOptionsForDay,
  copyRouteOptionsFromDay,
} from '../lib/tripRouteOptions';
import {
  tripsRepo,
  createSlug,
  createTripId,
  applyPlazaPublish,
  type Trip,
  type TripSummary,
} from '../lib/trips';
import type { ShareTripModalSubmit } from '../components/ShareTripModal';
import { ShareTripModal } from '../components/ShareTripModal';
import { PlannerAppBar } from '../components/PlannerAppBar';
import { ItineraryTableView } from '../components/ItineraryTableView';
import { PlannerSidePanel, type PlannerPanelTab } from '../components/PlannerSidePanel';
import { PanelIconRail } from '../components/PanelIconRail';
import { RouteTimelineDock } from '../components/RouteTimelineDock';
import { useAuth } from '../hooks/useAuth';
import { SearchPanel } from '../components/SearchPanel';
import { PinupBar } from '../components/PinupBar';
import { RouteOptionsPanel } from '../components/RouteOptionsPanel';
import { MapView } from '../components/MapView';
import { Toast } from '../components/Toast';
import { RoadviewModal } from '../components/RoadviewModal';
import { PlacePhotosModal } from '../components/PlacePhotosModal';
import { MapContextMenu } from '../components/MapContextMenu';
import { ManualPinModal } from '../components/ManualPinModal';
import { TripMaterialsPanel } from '../components/TripMaterialsPanel';
import { MobileSearchSheet } from '../components/mobile/MobileSearchSheet';
import { MobileMoreMenu } from '../components/mobile/MobileMoreMenu';
import { useIsMobile } from '../hooks/useIsMobile';
import { createManualPlace } from '../lib/manualPlace';
import type { PinImportResult } from '../lib/importPins';
import type { SaveStatus } from '../components/SaveStatusBadge';
import { OnboardingCoach } from '../components/OnboardingCoach';
import { ThemePreferenceChips } from '../components/ThemePreferenceChips';
import { TaxiDriverCardModal } from '../components/TaxiDriverCardModal';
import { ThemeScenarioPanel } from '../components/ThemeScenarioPanel';
import { AppSheetModal } from '../components/AppSheetModal';
import { isTourScenarioConfigured } from '../lib/tourScenario';
import { shouldShowOnboarding, isPlazaNavUnlocked, unlockPlazaNav } from '../lib/onboarding';
import { TRIP_THEMES } from '../lib/themes';
import { splitSearchQueries } from '../lib/searchQueries';
import { filterPlacesBySubFilters, type SearchSubFilterId } from '../lib/searchSubFilters';
import { isTourApiConfigured, searchTourPlaces, searchTourPlacesNearby } from '../lib/tourApi';
import { isTourFestivalConfigured, searchTourFestivals } from '../lib/tourFestival';
import { regionPrefixOf } from '../lib/koreaAreaCodes';
import '../styles/app.css';

type MobileSheetKind = 'search' | 'pins' | null;
type MobileSheetLevel = 'peek' | 'half' | 'full';
type MobileSheetTab = 'pins' | 'route';

interface PendingManualPin {
  lat: number;
  lng: number;
  address: string;
}

const DEFAULT_CENTER = DEFAULT_MAP_CENTER;

function centerFromTrip(trip: Pick<Trip, 'pinnedByDay' | 'currentDay' | 'plazaCenterLat' | 'plazaCenterLng'>): {
  lat: number;
  lng: number;
} | null {
  const dayPins = trip.pinnedByDay?.[trip.currentDay] ?? [];
  if (dayPins.length > 0) {
    let sumLat = 0;
    let sumLng = 0;
    let n = 0;
    for (const p of dayPins) {
      if (typeof p.lat === 'number' && typeof p.lng === 'number') {
        sumLat += p.lat;
        sumLng += p.lng;
        n++;
      }
    }
    if (n > 0) return { lat: sumLat / n, lng: sumLng / n };
  }
  const all = computeTripCenter(trip);
  if (all) return all;
  if (
    typeof trip.plazaCenterLat === 'number' &&
    typeof trip.plazaCenterLng === 'number'
  ) {
    return { lat: trip.plazaCenterLat, lng: trip.plazaCenterLng };
  }
  return null;
}

function makeEmptyTrip(): Trip {
  return normalizeTrip({
    id: createTripId(),
    slug: createSlug(),
    title: '새 여행',
    totalDays: 1,
    currentDay: 1,
    pinnedByDay: { 1: [] },
    routeOptionsByDay: { 1: { ...DEFAULT_ROUTE_OPTIONS } },
    generatedRouteByDay: {},
    materials: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export default function PlannerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, configured: authConfigured, plan, isAdmin } = useAuth();
  const { t: tc } = useTranslation('common');
  const { t: tp } = useTranslation('planner');
  const { t: tb } = useTranslation('billing');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [scenarioOpen, setScenarioOpen] = useState(false);
  const [kakaoReady, setKakaoReady] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [trip, setTrip] = useState<Trip>(() => makeEmptyTrip());
  const [tripSummaries, setTripSummaries] = useState<TripSummary[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSaving, setShareSaving] = useState(false);
  const [plazaNavVisible, setPlazaNavVisible] = useState(() => isPlazaNavUnlocked());

  // 검색 상태
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchingFestivals, setSearchingFestivals] = useState(false);
  const [searchEmpty, setSearchEmpty] = useState(false);
  const [searchScope, setSearchScope] = useState<SearchScope>('nationwide');
  const [categoryFilter, setCategoryFilter] = useState<SearchCategoryFilter>(null);
  const [categorySubFilters, setCategorySubFilters] = useState<SearchSubFilterId[]>([]);
  const [searchRadius, setSearchRadius] = useState<SearchRadiusMeters>(5000);
  const [fitSearchBounds, setFitSearchBounds] = useState(false);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [enrichingStats, setEnrichingStats] = useState(false);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [roadviewTarget, setRoadviewTarget] = useState<Place | null>(null);
  const [photosTarget, setPhotosTarget] = useState<Place | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2800);
  }

  // 경로 옵션 패널
  const [routeOptionsOpen, setRouteOptionsOpen] = useState(false);
  const [materialsPanelOpen, setMaterialsPanelOpen] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [tableViewMode, setTableViewMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState<PlannerPanelTab>('search');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [pickingOriginFromMap, setPickingOriginFromMap] = useState(false);
  const [pickingPinFromMap, setPickingPinFromMap] = useState(false);
  const [pendingManualPin, setPendingManualPin] = useState<PendingManualPin | null>(null);
  const [refining, setRefining] = useState(false);
  const isMobile = useIsMobile();
  const [mobileSheet, setMobileSheet] = useState<MobileSheetKind>(null);
  const [mobileSheetLevel, setMobileSheetLevel] = useState<MobileSheetLevel>('half');
  const [mobileSheetTab, setMobileSheetTab] = useState<MobileSheetTab>('pins');
  const [selectedPinIds, setSelectedPinIds] = useState<Set<string>>(() => new Set());
  const [mustVisitOnly, setMustVisitOnly] = useState(false);
  const [taxiCardPlace, setTaxiCardPlace] = useState<Place | null>(null);

  // 지도 중심 · 지도/검색 앱
  const [mapCenter, setMapCenter] = useState(
    () => readMapViewport()?.center ?? DEFAULT_CENTER
  );
  const [mapLevel, setMapLevel] = useState(
    () => readMapViewport()?.level ?? KAKAO_LEVEL_DEFAULT
  );
  const [mapProviderBooting, setMapProviderBooting] = useState(
    () => !hasSavedMapProviderChoice()
  );
  const [mapProviderChoice, setMapProviderChoice] = useState<MapProvider>(() =>
    readMapProviderChoice()
  );
  const mapProvider = useMemo(
    () => resolveMapProvider(mapCenter, mapProviderChoice),
    [mapCenter, mapProviderChoice]
  );
  const searchReady = mapProvider === 'google' ? googleReady : kakaoReady;
  const mapCenterRef = useRef(mapCenter);
  mapCenterRef.current = mapCenter;
  const mapLevelRef = useRef(mapLevel);
  mapLevelRef.current = mapLevel;

  const focusMapOnTrip = useCallback(
    (nextTrip: Trip, persist = true) => {
      const center = centerFromTrip(nextTrip);
      if (!center) return;
      mapCenterRef.current = center;
      setMapCenter(center);
      if (persist) writeMapViewport(center, mapLevelRef.current);
    },
    []
  );
  const [nearbySearchCenter, setNearbySearchCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const nearbySearchCenterRef = useRef(nearbySearchCenter);
  nearbySearchCenterRef.current = nearbySearchCenter;
  const [mapPinCategoryFilter, setMapPinCategoryFilter] = useState<SimpleCategory | null>(
    null
  );
  const [infoWindowPlace, setInfoWindowPlace] = useState<Place | null>(null);
  const [mapContextMenu, setMapContextMenu] = useState<{
    x: number;
    y: number;
    lat: number;
    lng: number;
  } | null>(null);

  // 현재 일차의 핀업/경로
  const currentDay = trip.currentDay;
  const pinned = useMemo(
    () => trip.pinnedByDay[currentDay] ?? [],
    [trip.pinnedByDay, currentDay]
  );

  const mapPins = useMemo(
    () => (mustVisitOnly ? pinned.filter((p) => p.required) : pinned),
    [pinned, mustVisitOnly]
  );

  const routePins = useMemo(() => {
    if (selectedPinIds.size === 0) return pinned;
    return pinned.filter((p) => selectedPinIds.has(p.id));
  }, [pinned, selectedPinIds]);

  useEffect(() => {
    setSelectedPinIds((prev) => {
      const valid = new Set(pinned.map((p) => p.id));
      const next = new Set([...prev].filter((id) => valid.has(id)));
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [pinned]);

  const pinSelectionActive = selectedPinIds.size > 0;

  useEffect(() => {
    if (!pinSelectionActive) return;
    setInfoWindowPlace((prev) => {
      if (!prev || selectedPinIds.has(prev.id)) return prev;
      return null;
    });
  }, [pinSelectionActive, selectedPinIds]);
  const generatedRoute = trip.generatedRouteByDay[currentDay] ?? null;
  const routeOptions = useMemo(
    () => getRouteOptionsForDay(trip, currentDay),
    [trip, currentDay]
  );

  // ============== SDK 로드 ==============
  useEffect(() => {
    const key = import.meta.env.VITE_KAKAO_JS_KEY;
    if (!key) {
      console.error('VITE_KAKAO_JS_KEY 환경 변수가 필요합니다');
      return;
    }
    loadKakaoSdk(key)
      .then(() => setKakaoReady(true))
      .catch((e) => console.error('Kakao SDK load failed', e));
  }, []);

  useEffect(() => {
    if (mapProvider !== 'google') return;
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;
    const lang = googleMapsLanguage(normalizeLocale(i18n.language));
    setGoogleReady(false);
    loadGoogleMapsSdk(key, lang)
      .then(() => setGoogleReady(true))
      .catch((e) => console.error('Google Maps SDK load failed', e));
  }, [mapProvider, i18n.language]);

  // 저장된 지도 선택이 없으면 시작 시 위치로 카카오/구글 자동 선택
  // 이미 저장된 뷰포트가 있으면 지도 중심은 덮어쓰지 않음
  useEffect(() => {
    if (!mapProviderBooting) return;
    let cancelled = false;
    void (async () => {
      const pos = await getApproximateLocation();
      if (cancelled) return;
      if (pos) {
        if (!readMapViewport()) {
          setMapCenter(pos);
          writeMapViewport(pos, mapLevelRef.current);
        }
        setMapProviderChoice(inferMapProviderFromLocation(pos));
      }
      setMapProviderBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [mapProviderBooting]);

  useEffect(() => {
    const theme = new URLSearchParams(location.search).get('theme');
    if (!theme) return;
    if (!TRIP_THEMES.some((t) => t.id === theme)) return;
    setTrip((prev) => ({
      ...prev,
      preferences: [theme as TripTheme],
      updatedAt: Date.now(),
    }));
  }, [location.search]);

  // 가이드「추천 여행코스」→ 자동 동선 옵션 패널 연동
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('autoRoute') !== '1') return;
    const guideTitle = params.get('guideTitle')?.trim();
    setMaterialsPanelOpen(false);
    setMobileSheet(null);
    setTrip((prev) => {
      const opts = {
        ...getRouteOptionsForDay(prev, prev.currentDay ?? 1),
        autoOrder: true,
      };
      const withOpts = patchRouteOptionsForDay(prev, prev.currentDay ?? 1, opts);
      if (!guideTitle) return withOpts;
      return {
        ...withOpts,
        title: guideTitle.slice(0, 80),
        updatedAt: Date.now(),
      };
    });
    setRouteOptionsOpen(true);
    setPanelTab('route');
    setPanelOpen(true);
    showToast(
      guideTitle
        ? `「${guideTitle}」코스 — 장소를 2곳 이상 핀업한 뒤 자동 동선을 만드세요`
        : '자동 동선 모드 — 장소를 2곳 이상 핀업한 뒤 일정을 만드세요'
    );
  }, [location.search]);

  const refreshTripList = useCallback(async (userId: string | null) => {
    const list = await tripsRepo.list(userId);
    setTripSummaries(list);
  }, []);

  // ============== 저장된 Trip 로드 ==============
  useEffect(() => {
    if (hydrated) return;
    (async () => {
      const userId = user?.id ?? null;
      await refreshTripList(userId);
      const loaded = await tripsRepo.load(userId);
      if (loaded) {
        const next = normalizeTrip({
          ...makeEmptyTrip(),
          ...loaded,
          pinnedByDay: loaded.pinnedByDay ?? { 1: [] },
          generatedRouteByDay: loaded.generatedRouteByDay ?? {},
        });
        setTrip(next);
        focusMapOnTrip(next);
      } else {
        const fresh = makeEmptyTrip();
        setTrip(fresh);
        await tripsRepo.save({ ...fresh, ownerId: userId ?? undefined });
        await refreshTripList(userId);
      }
      setLastSavedAt(loaded?.updatedAt ?? Date.now());
      setHydrated(true);
    })();
  }, [user?.id, hydrated, refreshTripList, focusMapOnTrip]);

  const pendingOpenTripId = (location.state as { openTripId?: string } | null)?.openTripId;

  useEffect(() => {
    if (!hydrated || !pendingOpenTripId) return;
    const tripId = pendingOpenTripId;
    navigate(location.pathname, { replace: true, state: {} });

    (async () => {
      const userId = user?.id ?? null;
      const loaded = await tripsRepo.load(userId, tripId);
      if (loaded) {
        const next = normalizeTrip({
          ...makeEmptyTrip(),
          ...loaded,
          pinnedByDay: loaded.pinnedByDay ?? { 1: [] },
          generatedRouteByDay: loaded.generatedRouteByDay ?? {},
        });
        setTrip(next);
        focusMapOnTrip(next);
        setLastSavedAt(loaded.updatedAt);
        await refreshTripList(userId);
        showToast(`「${loaded.title}」을 내 여행에 추가했습니다`);
      }
    })();
  }, [hydrated, pendingOpenTripId, user?.id, navigate, location.pathname, refreshTripList, focusMapOnTrip]);

  const prevUserIdRef = useRef<string | null>(null);
  const authInitializedRef = useRef(false);
  useEffect(() => {
    if (!hydrated) return;
    const userId = user?.id ?? null;

    if (!authInitializedRef.current) {
      authInitializedRef.current = true;
      prevUserIdRef.current = userId;
      return;
    }
    if (prevUserIdRef.current === userId) return;
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    (async () => {
      await refreshTripList(userId);
      const loaded = await tripsRepo.load(userId);
      if (loaded) {
        const next = normalizeTrip({
          ...makeEmptyTrip(),
          ...loaded,
          pinnedByDay: loaded.pinnedByDay ?? { 1: [] },
          generatedRouteByDay: loaded.generatedRouteByDay ?? {},
        });
        setTrip(next);
        focusMapOnTrip(next);
        setLastSavedAt(loaded.updatedAt);
      } else if (userId && !prev) {
        setTrip((prevTrip) => ({ ...prevTrip, ownerId: userId, updatedAt: Date.now() }));
      }
      if (userId && !prev) {
        showToast('클라우드 계정과 동기화했습니다');
      }
    })();
  }, [user?.id, hydrated, refreshTripList, focusMapOnTrip]);

  // ============== Trip 변경 자동 저장 (디바운스) ==============
  const saveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    setSavePending(true);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      const userId = user?.id ?? null;
      await tripsRepo.save({
        ...trip,
        ownerId: userId ?? undefined,
        updatedAt: Date.now(),
      });
      await refreshTripList(userId);
      setLastSavedAt(Date.now());
      setSavePending(false);
    }, 700);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [trip, user?.id, hydrated, refreshTripList]);

  // ============== Trip 업데이트 헬퍼 ==============
  function patchTrip(next: Partial<Trip>) {
    setTrip((prev) => ({ ...prev, ...next, updatedAt: Date.now() }));
  }
  function setPinnedForDay(day: number, list: PinnedPlace[]) {
    setTrip((prev) => ({
      ...prev,
      pinnedByDay: { ...prev.pinnedByDay, [day]: list },
      updatedAt: Date.now(),
    }));
  }
  function setRouteForDay(day: number, route: GeneratedRoute | null) {
    setTrip((prev) => ({
      ...prev,
      generatedRouteByDay: { ...prev.generatedRouteByDay, [day]: route },
      updatedAt: Date.now(),
    }));
  }

  type SearchRunOverrides = {
    scope?: SearchScope;
    category?: SearchCategoryFilter;
    radius?: SearchRadiusMeters;
    center?: { lat: number; lng: number };
    query?: string;
    /** true면 검색 후 지도 중심·bounds를 바꾸지 않음 (지정 지점 주변 검색용) */
    keepMapCenter?: boolean;
  };

  /** 지도 주변 검색 중심 — 한 번 정해지면 수동·옵션 변경 전까지 유지 */
  const ensureNearbySearchCenter = useCallback((): { lat: number; lng: number } => {
    if (nearbySearchCenterRef.current) return nearbySearchCenterRef.current;
    const init = mapCenterRef.current;
    nearbySearchCenterRef.current = init;
    setNearbySearchCenter(init);
    return init;
  }, []);

  const getSearchCenter = useCallback(
    (scope: SearchScope, override?: { lat: number; lng: number }) => {
      if (scope !== 'nearby') return mapCenter;
      if (override) return override;
      if (nearbySearchCenter) return nearbySearchCenter;
      return ensureNearbySearchCenter();
    },
    [mapCenter, nearbySearchCenter, ensureNearbySearchCenter]
  );

  const openSearchPanel = useCallback(() => {
    setPanelOpen(true);
    setPanelTab('search');
    setMobileSheet('search');
  }, []);

  const runSearch = useCallback(
    async (page: number, append: boolean, overrides?: SearchRunOverrides) => {
      const scope = overrides?.scope ?? searchScope;
      const category =
        overrides?.category !== undefined ? overrides.category : categoryFilter;
      const radius = overrides?.radius ?? searchRadius;
      const searchCenter = getSearchCenter(scope, overrides?.center);
      const keyword = (overrides?.query ?? query).trim();
      const keepMapCenter = overrides?.keepMapCenter === true;
      const batchQueries = keyword ? splitSearchQueries(keyword) : [];
      const isBatchSearch = batchQueries.length > 1 && !append && page === 1;
      /** 키워드·카테고리 없이 지도 주변만 볼 때: 주요 카테고리 병합 검색 */
      const browseNearby =
        scope === 'nearby' && !keyword && !category && !append && page === 1;
      const canSearch =
        Boolean(keyword) ||
        (scope === 'nearby' && Boolean(category)) ||
        browseNearby;
      const providerReady =
        mapProvider === 'google' ? googleReady : kakaoReady;
      if (!providerReady || !canSearch) return;

      if (mapProvider === 'google' && !canRunGoogleSearch(plan, isAdmin)) {
        showToast(tb('limits.searchCap'));
        setUpgradeOpen(true);
        return;
      }

      if (append) setLoadingMore(true);
      else {
        setSearching(true);
        setSearchEmpty(false);
        setSearchError(null);
        setFitSearchBounds(false);
        setSelectedPlaceId(null);
      }
      try {
        if (browseNearby) {
          const browseCodes = ['FD6', 'AT4', 'AD5', 'MT1'] as const;
          const merged: Place[] = [];
          const seen = new Set<string>();
          for (const code of browseCodes) {
            const { places } =
              mapProvider === 'google'
                ? await searchPlacesUnifiedWithGoogle({
                    categoryGroupCode: code,
                    scope: 'nearby',
                    center: searchCenter,
                    radiusMeters: radius,
                    size: 8,
                    page: 1,
                  })
                : await searchPlacesUnified({
                    categoryGroupCode: code,
                    scope: 'nearby',
                    center: searchCenter,
                    radiusMeters: radius,
                    size: 8,
                    page: 1,
                  });
            for (const place of places) {
              if (seen.has(place.id)) continue;
              seen.add(place.id);
              merged.push({
                ...place,
                distance: Math.round(haversineMeters(searchCenter, place)),
              });
            }
          }
          if (mapProvider === 'google') recordGoogleSearch(plan, isAdmin);
          if (isTourApiConfigured()) {
            const tourNearby = await searchTourPlacesNearby(searchCenter, radius);
            for (const place of tourNearby) {
              if (seen.has(place.id)) continue;
              seen.add(place.id);
              merged.push({
                ...place,
                distance: Math.round(haversineMeters(searchCenter, place)),
              });
            }
          }
          merged.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
          const clipped = merged.slice(0, 24);
          setResults(clipped);
          setSearchPage(1);
          setSearchHasMore(false);
          setSearchEmpty(clipped.length === 0);
          if (!keepMapCenter) {
            if (clipped.length === 1) {
              setMapCenter({ lat: clipped[0].lat, lng: clipped[0].lng });
            } else if (clipped.length > 1) {
              setFitSearchBounds(true);
            }
          }
          if (clipped.length > 0 && mapProvider === 'kakao') {
            setEnrichingStats(true);
            void enrichPlacesWithStats(clipped)
              .then(setResults)
              .finally(() => setEnrichingStats(false));
          }
          return;
        }

        if (isBatchSearch) {
          const merged: Place[] = [];
          const seen = new Set<string>();
          for (const q of batchQueries) {
            const { places } =
              mapProvider === 'google'
                ? await searchPlacesUnifiedWithGoogle({
                    keyword: q,
                    categoryGroupCode: category,
                    scope,
                    center: scope === 'nearby' ? searchCenter : undefined,
                    radiusMeters: scope === 'nearby' ? radius : undefined,
                    size: 10,
                    page: 1,
                  })
                : await searchPlacesUnified({
                    keyword: q,
                    categoryGroupCode: category,
                    scope,
                    center: scope === 'nearby' ? searchCenter : undefined,
                    radiusMeters: scope === 'nearby' ? radius : undefined,
                    size: 10,
                    page: 1,
                  });
            for (const place of places) {
              if (seen.has(place.id)) continue;
              seen.add(place.id);
              merged.push({
                ...place,
                distance: Math.round(haversineMeters(searchCenter, place)),
              });
            }
          }
          if (mapProvider === 'google') recordGoogleSearch(plan, isAdmin);
          setResults(merged);
          setSearchPage(1);
          setSearchHasMore(false);
          setSearchEmpty(merged.length === 0);
          if (!keepMapCenter) {
            if (merged.length === 1) {
              setMapCenter({ lat: merged[0].lat, lng: merged[0].lng });
            } else if (merged.length > 1) {
              setFitSearchBounds(true);
            }
          }
          if (merged.length > 0) {
            showToast(tp('search.batchDone', { count: batchQueries.length, results: merged.length }));
          }
          if (merged.length > 0 && mapProvider === 'kakao') {
            setEnrichingStats(true);
            void enrichPlacesWithStats(merged)
              .then(setResults)
              .finally(() => setEnrichingStats(false));
          }
          return;
        }

        const { places, hasMore } =
          mapProvider === 'google'
            ? await searchPlacesUnifiedWithGoogle({
                keyword: keyword || undefined,
                categoryGroupCode: category,
                scope,
                center: scope === 'nearby' ? searchCenter : undefined,
                radiusMeters: scope === 'nearby' ? radius : undefined,
                size: 15,
                page,
              })
            : await searchPlacesUnified({
                keyword: keyword || undefined,
                categoryGroupCode: category,
                scope,
                center: scope === 'nearby' ? searchCenter : undefined,
                radiusMeters: scope === 'nearby' ? radius : undefined,
                size: 15,
                page,
              });
        const withDistance = places.map((place) => ({
          ...place,
          distance: Math.round(haversineMeters(searchCenter, place)),
        }));
        setResults((prev) => (append ? [...prev, ...withDistance] : withDistance));
        if (mapProvider === 'google') recordGoogleSearch(plan, isAdmin);
        setSearchPage(page);
        setSearchHasMore(hasMore);
        if (!append) {
          setSearchEmpty(withDistance.length === 0);
          if (!keepMapCenter) {
            if (withDistance.length === 1) {
              setMapCenter({ lat: withDistance[0].lat, lng: withDistance[0].lng });
            } else if (withDistance.length > 1) {
              setFitSearchBounds(true);
            }
          }
        }
        if (withDistance.length > 0 && mapProvider === 'kakao') {
          setEnrichingStats(true);
          void enrichPlacesWithStats(withDistance).then((enriched) => {
            setResults((prev) => {
              if (append) {
                const byId = new Map(enriched.map((p) => [p.id, p]));
                return prev.map((p) => byId.get(p.id) ?? p);
              }
              return enriched;
            });
          }).finally(() => setEnrichingStats(false));
        }
        if (keyword && isTourApiConfigured()) {
          const tourPlaces = await searchTourPlaces(keyword);
          if (tourPlaces.length > 0) {
            setResults((prev) => {
              const seen = new Set(prev.map((p) => p.id));
              const extra = tourPlaces
                .filter((p) => !seen.has(p.id))
                .map((p) => ({
                  ...p,
                  distance: Math.round(haversineMeters(searchCenter, p)),
                }));
              return extra.length ? [...prev, ...extra] : prev;
            });
            if (!keepMapCenter) setFitSearchBounds(true);
          }
        }
      } catch (e) {
        console.error(e);
        if (!append) {
          setResults([]);
          setSearchEmpty(true);
        }
        setSearchError('검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setSearching(false);
        setLoadingMore(false);
      }
    },
    [
      mapProvider,
      googleReady,
      kakaoReady,
      query,
      getSearchCenter,
      searchScope,
      categoryFilter,
      searchRadius,
      plan,
      isAdmin,
      tb,
      showToast,
      tp,
    ]
  );

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      setCategoryFilter(null);
      setSearchScope('nationwide');
      void runSearch(1, false, { category: null, scope: 'nationwide' });
      return;
    }
    void runSearch(1, false);
  }, [runSearch, query]);

  const handleSearchCandidate = useCallback((candidate: string) => {
    setQuery(candidate);
    setCategoryFilter(null);
    setSearchScope('nationwide');
    void runSearch(1, false, {
      category: null,
      query: candidate,
      scope: 'nationwide',
    });
  }, [runSearch]);

  const handleLoadMore = useCallback(() => {
    if (!searchHasMore || loadingMore) return;
    void runSearch(searchPage + 1, true);
  }, [searchHasMore, loadingMore, searchPage, runSearch]);

  const handleSearchScopeChange = useCallback(
    (scope: SearchScope) => {
      setSearchScope(scope);
      const canSearch =
        query.trim() || (scope === 'nearby' && categoryFilter);
      if (canSearch && searchReady) {
        const center = scope === 'nearby' ? ensureNearbySearchCenter() : undefined;
        void runSearch(1, false, {
          scope,
          ...(center ? { center } : {}),
        });
      }
    },
    [query, searchReady, runSearch, categoryFilter, ensureNearbySearchCenter]
  );

  const handleMapProviderChange = useCallback(
    (provider: MapProvider) => {
      if (provider === mapProviderChoice) return;
      setMapProviderChoice(provider);
      writeMapProviderChoice(provider);
      setResults([]);
      setSearchEmpty(false);
      setSearchError(null);
      setSelectedPlaceId(null);
      setSearchPage(1);
      setSearchHasMore(false);
      showToast(
        provider === 'google'
          ? tc('mapProvider.switchedGoogle')
          : tc('mapProvider.switchedKakao')
      );
    },
    [mapProviderChoice, tc]
  );

  const handleMapCenterChange = useCallback((lat: number, lng: number) => {
    const next = { lat, lng };
    mapCenterRef.current = next;
    setMapCenter(next);
    writeMapViewport(next, mapLevelRef.current);
  }, []);

  const handleMapLevelChange = useCallback((level: number) => {
    mapLevelRef.current = level;
    setMapLevel(level);
    writeMapViewport(mapCenterRef.current, level);
  }, []);

  const handleCategoryFilterChange = useCallback(
    (code: SearchCategoryFilter) => {
      setCategoryFilter(code);
      setCategorySubFilters([]);

      if (code !== null) {
        setSearchScope('nearby');
        const center = ensureNearbySearchCenter();
        if (searchReady) {
          void runSearch(1, false, {
            scope: 'nearby',
            category: code,
            center,
          });
        }
        return;
      }

      const canSearch = Boolean(query.trim());
      if (canSearch && searchReady) {
        void runSearch(1, false, { category: null });
      }
    },
    [query, searchReady, runSearch, ensureNearbySearchCenter]
  );

  const handleSearchRadiusChange = useCallback(
    (radius: SearchRadiusMeters) => {
      setSearchRadius(radius);
      const canSearch =
        query.trim() || (searchScope === 'nearby' && categoryFilter);
      if (canSearch && searchReady && searchScope === 'nearby') {
        void runSearch(1, false, { radius });
      }
    },
    [query, searchScope, categoryFilter, searchReady, runSearch]
  );

  const handleResetSearch = useCallback(() => {
    setQuery('');
    setResults([]);
    setSearchEmpty(false);
    setSearchError(null);
    setSearchHasMore(false);
    setFitSearchBounds(false);
    setSelectedPlaceId(null);
    setCategoryFilter(null);
    setSearchRadius(5000);
    setEnrichingStats(false);
  }, []);

  const handleSelectPlace = useCallback((place: Place) => {
    setSelectedPlaceId(place.id);
    setFitSearchBounds(false);
    setMapCenter({ lat: place.lat, lng: place.lng });
    setInfoWindowPlace(place);
  }, []);

  /** 지도 검색 핀 호버 — 결과 칩만 선택 (지도 이동·말풍선 없음) */
  const handleHoverSearchPlace = useCallback((place: Place) => {
    setSelectedPlaceId((prev) => (prev === place.id ? prev : place.id));
  }, []);

  const handlePinnedMarkerClick = useCallback((place: Place) => {
    setSelectedPlaceId(place.id);
    setMapCenter({ lat: place.lat, lng: place.lng });
    setInfoWindowPlace(place);
  }, []);

  const handleCloseInfoWindow = useCallback(() => {
    setInfoWindowPlace(null);
  }, []);

  const handleToggleMapCategoryFilter = useCallback((category: SimpleCategory) => {
    setMapPinCategoryFilter((prev) => (prev === category ? null : category));
  }, []);

  const handleMapRightClick = useCallback(
    (lat: number, lng: number, clientX: number, clientY: number) => {
      setMapContextMenu({ lat, lng, x: clientX, y: clientY });
    },
    []
  );

  const handleSetSearchCenterFromMap = useCallback(() => {
    if (!mapContextMenu) return;
    const { lat, lng } = mapContextMenu;
    const center = { lat, lng };
    nearbySearchCenterRef.current = center;
    setNearbySearchCenter(center);
    setMapCenter(center);
    setSearchScope('nearby');
    setFitSearchBounds(false);
    openSearchPanel();
    showToast('이 위치를 중심으로 검색합니다');
    void runSearch(1, false, {
      scope: 'nearby',
      center,
      keepMapCenter: true,
    });
  }, [mapContextMenu, runSearch, openSearchPanel]);

  const handleOpenPlacePhotos = useCallback((place: Place) => {
    setPhotosTarget(place);
  }, []);

  const handleUseMyLocationForSearch = useCallback(() => {
    void getApproximateLocation().then((center) => {
      if (!center) {
        showToast('현재 위치를 가져올 수 없습니다');
        return;
      }
      nearbySearchCenterRef.current = center;
      setMapCenter(center);
      setNearbySearchCenter(center);
      setSearchScope('nearby');
      setFitSearchBounds(false);
      openSearchPanel();
      showToast('현재 위치를 중심으로 검색합니다');
      void runSearch(1, false, {
        scope: 'nearby',
        center,
        keepMapCenter: true,
      });
    });
  }, [runSearch, openSearchPanel]);

  const handleSearchFestivals = useCallback(() => {
    if (!isTourFestivalConfigured()) return;
    setSearchingFestivals(true);
    const regionLookup = kakaoReady
      ? coordsToAddress(mapCenter.lat, mapCenter.lng).catch(() => '')
      : Promise.resolve('');
    void regionLookup
      .then((address) => {
        const regionPrefix = regionPrefixOf(address);
        return searchTourFestivals({ regionPrefix });
      })
      .then((festivals) => {
        if (festivals.length === 0) {
          showToast(tp('search.festivalsEmpty'));
          return;
        }
        setResults((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const extra = festivals
            .filter((p) => !seen.has(p.id))
            .map((p) => ({
              ...p,
              distance: Math.round(haversineMeters(mapCenter, p)),
            }))
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
          return extra.length ? [...prev, ...extra] : prev;
        });
        if (festivals.length === 1) {
          setMapCenter({ lat: festivals[0].lat, lng: festivals[0].lng });
        } else if (festivals.length > 1) {
          setFitSearchBounds(true);
        }
        openSearchPanel();
        showToast(tp('search.festivalsFound', { count: festivals.length }));
      })
      .finally(() => setSearchingFestivals(false));
  }, [mapCenter, kakaoReady, openSearchPanel, tp]);

  // ============== 핀업 ==============
  const addPinFromPlace = useCallback(
    (place: Place) => {
      const current = trip.pinnedByDay[currentDay] ?? [];
      const pinnedPlace: PinnedPlace = {
        ...place,
        nameKo: place.nameKo ?? place.name,
        pinnedAt: Date.now(),
        order: current.length + 1,
        stayMinutes: suggestStayMinutes(place.category).minutes,
        day: currentDay,
      };
      setPinnedForDay(currentDay, [...current, pinnedPlace]);
      setRouteForDay(currentDay, null);
      showToast(`${place.name} 핀업 (${current.length + 1}번째)`);
      return pinnedPlace;
    },
    [trip.pinnedByDay, currentDay]
  );

  const handleTogglePin = useCallback(
    (place: Place) => {
      const current = trip.pinnedByDay[currentDay] ?? [];
      const exists = current.find((p) => p.id === place.id);
      if (exists) {
        const next = current
          .filter((p) => p.id !== place.id)
          .map((p, i) => ({ ...p, order: i + 1 }));
        setPinnedForDay(currentDay, next);
        setInfoWindowPlace((prev) => (prev?.id === place.id ? null : prev));
        showToast(`${place.name} 핀업 해제`);
      } else {
        const pinnedPlace: PinnedPlace = {
          ...place,
          nameKo: place.nameKo ?? place.name,
          pinnedAt: Date.now(),
          order: current.length + 1,
          stayMinutes: suggestStayMinutes(place.category).minutes,
          day: currentDay,
        };
        setPinnedForDay(currentDay, [...current, pinnedPlace]);
        showToast(`${place.name} 핀업 (${current.length + 1}번째)`);
      }
    },
    [trip.pinnedByDay, currentDay]
  );

  const handleTogglePinFromInfo = useCallback(
    (place: Place) => {
      handleTogglePin(place);
    },
    [handleTogglePin]
  );

  const handleToggleRequired = useCallback((id: string) => {
    const current = trip.pinnedByDay[currentDay] ?? [];
    const next = current.map((p) =>
      p.id === id ? { ...p, required: !p.required } : p
    );
    setPinnedForDay(currentDay, next);
  }, [trip.pinnedByDay, currentDay]);

  const handlePreferencesChange = useCallback((preferences: TripTheme[]) => {
    setTrip((prev) => ({ ...prev, preferences, updatedAt: Date.now() }));
  }, []);

  const handleFoodRestrictionsChange = useCallback((foodRestrictions: FoodRestriction[]) => {
    setTrip((prev) => ({ ...prev, foodRestrictions, updatedAt: Date.now() }));
  }, []);

  const handleTogglePinSelection = useCallback((id: string) => {
    setSelectedPinIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleClearAllPins = useCallback(() => {
    const count = (trip.pinnedByDay[currentDay] ?? []).length;
    if (count === 0) return;
    if (
      !confirm(
        `${currentDay}일차에 핀 ${count}개가 있습니다. 모두 해제할까요?\n(되돌릴 수 없습니다)`
      )
    ) {
      return;
    }
    setPinnedForDay(currentDay, []);
    setRouteForDay(currentDay, null);
    setSelectedPinIds(new Set());
    showToast(`${currentDay}일차 핀을 모두 해제했습니다`);
  }, [trip.pinnedByDay, currentDay]);

  const handleRemovePin = useCallback(
    (id: string) => {
      const current = trip.pinnedByDay[currentDay] ?? [];
      const next = current
        .filter((p) => p.id !== id)
        .map((p, i) => ({ ...p, order: i + 1 }));
      setPinnedForDay(currentDay, next);
      setInfoWindowPlace((prev) => (prev?.id === id ? null : prev));
      setSelectedPinIds((prev) => {
        if (!prev.has(id)) return prev;
        const nextSel = new Set(prev);
        nextSel.delete(id);
        return nextSel;
      });
    },
    [trip.pinnedByDay, currentDay]
  );

  const handleReorderPinned = useCallback(
    (next: PinnedPlace[]) => {
      setPinnedForDay(currentDay, next);
    },
    [currentDay]
  );

  const handleImportPins = useCallback((result: PinImportResult) => {
    setTrip((prev) => {
      const nextTotal = Math.max(prev.totalDays, result.totalDays);
      const pinnedByDay = { ...prev.pinnedByDay };
      const generatedRouteByDay = { ...prev.generatedRouteByDay };
      for (let d = 1; d <= nextTotal; d++) {
        if (!(d in pinnedByDay)) pinnedByDay[d] = [];
      }
      for (const [dayKey, list] of Object.entries(result.pinnedByDay)) {
        const day = Number(dayKey);
        pinnedByDay[day] = list;
        generatedRouteByDay[day] = null;
      }
      return {
        ...prev,
        totalDays: nextTotal,
        pinnedByDay,
        generatedRouteByDay,
        updatedAt: Date.now(),
      };
    });
  }, []);

  const handleMaterialsChange = useCallback((materials: TripMaterial[]) => {
    setTrip((prev) => ({ ...prev, materials, updatedAt: Date.now() }));
  }, []);

  const handleOpenMaterialsPanel = useCallback(() => {
    setMobileSheet(null);
    setRouteOptionsOpen(false);
    setMaterialsPanelOpen(true);
  }, []);

  // ============== 경로 옵션 ==============
  function setRouteOptions(next: RouteOptions) {
    setTrip((prev) => patchRouteOptionsForDay(prev, currentDay, next));
  }

  const handleOpenRouteOptions = useCallback(() => {
    const targetCount = selectedPinIds.size > 0 ? selectedPinIds.size : pinned.length;
    if (targetCount < 2) {
      showToast('일정을 만들려면 장소를 2곳 이상 선택하거나 핀업해 주세요');
      return;
    }
    setMobileSheet(null);
    setMaterialsPanelOpen(false);
    setPanelTab('route');
    setPanelOpen(true);
    setMobileSheetTab('route');
    setMobileSheetLevel('half');
    setRouteOptionsOpen(true);
  }, [pinned.length, selectedPinIds.size]);

  const handleClearRoute = useCallback(() => {
    if (!trip.generatedRouteByDay[currentDay]) return;
    if (!confirm(tp('dock.clearRouteConfirm', { day: currentDay }))) return;
    setRouteForDay(currentDay, null);
    setDockCollapsed(false);
    showToast(tp('dock.clearRouteDone', { day: currentDay }));
  }, [trip.generatedRouteByDay, currentDay, tp]);

  const openPlannerTab = useCallback((tab: PlannerPanelTab) => {
    setPanelTab(tab);
    setPanelOpen(true);
    if (tab === 'route') setRouteOptionsOpen(true);
  }, []);

  const cycleMobileSheet = useCallback(() => {
    setMobileSheetLevel((prev) =>
      prev === 'peek' ? 'half' : prev === 'half' ? 'full' : 'peek'
    );
  }, []);

  const handleUpdateStayMinutes = useCallback(
    (placeId: string, minutes: number) => {
      const clamped = Math.max(0, Math.min(480, Math.round(minutes)));
      setTrip((prev) => {
        const list = prev.pinnedByDay[currentDay] ?? [];
        const nextPinned = list.map((p) =>
          p.id === placeId ? { ...p, stayMinutes: clamped } : p
        );
        const opts = {
          ...getRouteOptionsForDay(prev, currentDay),
          autoStayTime: false,
        };
        return patchRouteOptionsForDay(
          {
            ...prev,
            pinnedByDay: { ...prev.pinnedByDay, [currentDay]: nextPinned },
            updatedAt: Date.now(),
          },
          currentDay,
          opts
        );
      });
    },
    [currentDay]
  );

  const handleTogglePresentation = useCallback(() => {
    setPresentationMode((prev) => !prev);
  }, []);

  const handleToggleTableView = useCallback(() => {
    setTableViewMode((prev) => !prev);
  }, []);

  const handleCloseTableView = useCallback(() => {
    setTableViewMode(false);
  }, []);

  const handlePickOriginFromMap = useCallback(() => {
    setPickingPinFromMap(false);
    setPendingManualPin(null);
    setPickingOriginFromMap(true);
  }, []);

  const handleTogglePinFromMap = useCallback(() => {
    setPickingOriginFromMap(false);
    setPendingManualPin(null);
    setPickingPinFromMap((v) => !v);
  }, []);

  /** 모바일 지도 롱프레스 — 토글이 아니라 항상 켜기(이미 픽 모드면 무시) */
  const handleLongPressPin = useCallback(() => {
    if (pickingOriginFromMap || pickingPinFromMap) return;
    setPendingManualPin(null);
    setPickingPinFromMap(true);
  }, [pickingOriginFromMap, pickingPinFromMap]);

  const handlePinLocationPicked = useCallback((lat: number, lng: number, address: string) => {
    setPickingPinFromMap(false);
    setPendingManualPin({
      lat,
      lng,
      address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
    });
    setMapCenter({ lat, lng });
  }, []);

  const handleConfirmManualPin = useCallback(
    (name: string) => {
      if (!pendingManualPin) return;
      const place = createManualPlace({
        lat: pendingManualPin.lat,
        lng: pendingManualPin.lng,
        name,
        address: pendingManualPin.address,
      });
      addPinFromPlace(place);
      setSelectedPlaceId(place.id);
      setPendingManualPin(null);
    },
    [pendingManualPin, addPinFromPlace]
  );

  const handleCancelManualPin = useCallback(() => {
    setPendingManualPin(null);
  }, []);

  const handleOriginPicked = useCallback(
    (lat: number, lng: number, address: string) => {
      setRouteOptions({
        ...routeOptions,
        origin: {
          type: 'map-click',
          label: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
          address,
        },
      });
      setPickingOriginFromMap(false);
    },
    [routeOptions]
  );

  // ============== 경로 생성 (실제 API 보강) ==============
  const handleGenerate = useCallback(async () => {
    if (routePins.length < 2) return;

    async function buildAndGenerate(resolvedOrigin: Origin) {
      const opts = {
        ...routeOptions,
        origin: resolvedOrigin,
        preferences: trip.preferences,
      };
      const base = generateRoute(routePins, opts);
      setRouteForDay(currentDay, base);
      setRouteOptionsOpen(false);
      setPanelOpen(false);
      setDockCollapsed(false);
      setMobileSheetTab('route');
      setMobileSheetLevel('half');

      if (opts.autoOrder) {
        const syncedPins: PinnedPlace[] = base.stops.map((s, i) => ({
          ...(s as PinnedPlace),
          order: i + 1,
        }));
        if (selectedPinIds.size > 0) {
          const routedIds = new Set(syncedPins.map((p) => p.id));
          const rest = pinned
            .filter((p) => !routedIds.has(p.id))
            .map((p, i) => ({ ...p, order: syncedPins.length + i + 1 }));
          setPinnedForDay(currentDay, [...syncedPins, ...rest]);
        } else {
          setPinnedForDay(currentDay, syncedPins);
        }
      }

      setRefining(true);
      try {
        const refined = await refineRouteWithRealLegs(base, fetchLegs);
        setRouteForDay(currentDay, refined);
        if (refined.legs.some((l) => l.source === 'api')) {
          showToast('실제 경로 정보가 반영되었습니다');
        }
      } catch (e) {
        console.warn('경로 보강 실패', e);
      } finally {
        setRefining(false);
      }
    }

    let origin: Origin;
    try {
      origin = await resolveOriginForRoute(routeOptions.origin);
    } catch (err) {
      const code = (err as Error).message;
      if (code === 'ADDRESS_NOT_FOUND') {
        showToast('주소·장소명을 찾을 수 없습니다. 다시 입력해 주세요.');
      } else if (code === 'GPS_UNAVAILABLE') {
        showToast('GPS를 사용할 수 없습니다. 첫 장소를 출발지로 사용합니다.');
        await buildAndGenerate({
          ...routeOptions.origin,
          lat: routePins[0].lat,
          lng: routePins[0].lng,
          label: routePins[0].name,
        });
        return;
      } else if (code === 'MAP_ORIGIN_REQUIRED') {
        showToast('지도에서 출발지를 선택해 주세요.');
      } else {
        showToast('출발지를 확인할 수 없습니다.');
      }
      return;
    }

    setRouteOptions({ ...routeOptions, origin });
    await buildAndGenerate(origin);
  }, [routePins, pinned, selectedPinIds, routeOptions, currentDay]);

  // ============== 다일정 ==============
  function selectDay(day: number) {
    setTrip((prev) => normalizeTrip({ ...prev, currentDay: day }));
    setMapPinCategoryFilter(null);
    setInfoWindowPlace(null);
    setSelectedPinIds(new Set());
  }
  function addDay() {
    const newDay = trip.totalDays + 1;
    const prevOpts = getRouteOptionsForDay(trip, trip.totalDays);
    setTrip((prev) =>
      normalizeTrip({
        ...prev,
        totalDays: newDay,
        currentDay: newDay,
        pinnedByDay: { ...prev.pinnedByDay, [newDay]: [] },
        routeOptionsByDay: {
          ...prev.routeOptionsByDay,
          [newDay]: { ...prevOpts, origin: { ...prevOpts.origin } },
        },
      })
    );
  }
  function removeDay(day: number) {
    if (trip.totalDays <= 1) return;
    if (!confirm(`${day}일차 일정을 삭제하시겠어요?`)) return;
    // 일차를 뒤에서부터 압축
    const remainingDays = Array.from({ length: trip.totalDays }, (_, i) => i + 1).filter(
      (d) => d !== day
    );
    const newPinned: Record<number, PinnedPlace[]> = {};
    const newRoutes: Record<number, GeneratedRoute | null> = {};
    remainingDays.forEach((oldD, idx) => {
      const newD = idx + 1;
      newPinned[newD] = (trip.pinnedByDay[oldD] ?? []).map((p) => ({ ...p, day: newD }));
      newRoutes[newD] = trip.generatedRouteByDay[oldD] ?? null;
    });
    patchTrip({
      totalDays: trip.totalDays - 1,
      currentDay: Math.min(trip.currentDay, trip.totalDays - 1),
      pinnedByDay: newPinned,
      generatedRouteByDay: newRoutes,
    });
  }

  const handleTitleChange = useCallback((title: string) => {
    setTrip((prev) => ({ ...prev, title, updatedAt: Date.now() }));
  }, []);

  const handleSelectTrip = useCallback(
    async (tripId: string) => {
      if (tripId === trip.id) return;
      const userId = user?.id ?? null;
      await tripsRepo.save({ ...trip, ownerId: userId ?? undefined, updatedAt: Date.now() });
      const loaded = await tripsRepo.load(userId, tripId);
      if (loaded) {
        const next = normalizeTrip({
          ...makeEmptyTrip(),
          ...loaded,
          pinnedByDay: loaded.pinnedByDay ?? { 1: [] },
          generatedRouteByDay: loaded.generatedRouteByDay ?? {},
        });
        setTrip(next);
        focusMapOnTrip(next);
        setResults([]);
        setQuery('');
        setSearchEmpty(false);
        setRouteOptionsOpen(false);
      }
      await refreshTripList(userId);
    },
    [trip, user?.id, refreshTripList, focusMapOnTrip]
  );

  const handleNewTrip = useCallback(async () => {
    if (!canCreateTrip(plan, tripSummaries.length, isAdmin)) {
      showToast(tb('limits.tripCount', { max: FREE_MAX_TRIPS }));
      setUpgradeOpen(true);
      return;
    }
    if (
      !confirm(
        `「${trip.title}」을 저장한 뒤 새 여행을 만듭니다.\n현재 화면의 핀·동선은 새 여행으로 전환됩니다. 계속할까요?`
      )
    ) {
      return;
    }
    const userId = user?.id ?? null;
    await tripsRepo.save({ ...trip, ownerId: userId ?? undefined, updatedAt: Date.now() });
    const fresh = makeEmptyTrip();
    setTrip(fresh);
    await tripsRepo.save({ ...fresh, ownerId: userId ?? undefined });
    setResults([]);
    setQuery('');
    setSearchEmpty(false);
    setRouteOptionsOpen(false);
    setMapCenter(DEFAULT_CENTER);
    writeMapViewport(DEFAULT_CENTER, mapLevelRef.current);
    await refreshTripList(userId);
  }, [trip, user?.id, refreshTripList, plan, isAdmin, tripSummaries.length, tb]);

  const handleDeleteTrip = useCallback(async () => {
    const userId = user?.id ?? null;
    const others = tripSummaries.filter((s) => s.id !== trip.id);
    const msg =
      others.length > 0
        ? `「${trip.title}」 여행을 삭제할까요?\n핀·동선·자료가 모두 지워지며 되돌릴 수 없습니다.`
        : `「${trip.title}」이(가) 마지막 여행입니다.\n삭제하면 빈 새 여행이 만들어집니다. 계속할까요?`;
    if (!confirm(msg)) return;

    try {
      await tripsRepo.delete(userId, trip.id);
    } catch (e) {
      console.error(e);
      showToast('여행 삭제에 실패했습니다');
      return;
    }

    await refreshTripList(userId);
    const list = await tripsRepo.list(userId);
    const nextSummary = list.find((s) => s.id !== trip.id) ?? list[0];

    if (nextSummary && nextSummary.id !== trip.id) {
      const loaded = await tripsRepo.load(userId, nextSummary.id);
      if (loaded) {
        const next = normalizeTrip({
          ...makeEmptyTrip(),
          ...loaded,
          pinnedByDay: loaded.pinnedByDay ?? { 1: [] },
          generatedRouteByDay: loaded.generatedRouteByDay ?? {},
        });
        setTrip(next);
        focusMapOnTrip(next);
      }
    } else {
      const fresh = makeEmptyTrip();
      setTrip(fresh);
      await tripsRepo.save({ ...fresh, ownerId: userId ?? undefined });
      await refreshTripList(userId);
      setMapCenter(DEFAULT_CENTER);
      writeMapViewport(DEFAULT_CENTER, mapLevelRef.current);
    }

    setResults([]);
    setQuery('');
    setSearchEmpty(false);
    setRouteOptionsOpen(false);
    setMaterialsPanelOpen(false);
    setSelectedPinIds(new Set());
    setInfoWindowPlace(null);
    setMapPinCategoryFilter(null);
    showToast(`「${trip.title}」 여행을 삭제했습니다`);
  }, [trip, tripSummaries, user?.id, refreshTripList, focusMapOnTrip]);

  // ============== 공유 / 저장 ==============
  const openShareModal = useCallback(() => {
    if (authConfigured && !user) {
      if (
        !confirm(
          '로그인하지 않으면 다른 기기·브라우저에서 공유 링크가 열리지 않을 수 있습니다.\n그래도 공유할까요?'
        )
      ) {
        return;
      }
    } else if (!authConfigured) {
      if (
        !confirm(
          '로컬 저장 모드입니다. 공유 링크는 이 브라우저에 저장된 경우에만 열릴 수 있습니다.\n계속할까요?'
        )
      ) {
        return;
      }
    }
    setShareModalOpen(true);
  }, [authConfigured, user]);

  const handleShareConfirm = useCallback(
    async (opts: ShareTripModalSubmit) => {
      setShareSaving(true);
      const userId = user?.id ?? null;
      let publicTrip = applyPlazaPublish(
        { ...trip, ownerId: userId ?? undefined },
        {
          listInPlaza: opts.listInPlaza,
          displayName: opts.displayName,
          email: opts.email,
        }
      );
      setTrip(publicTrip);
      try {
        await tripsRepo.save(publicTrip);
      } catch (e) {
        console.error(e);
        showToast('공유 저장 실패 — 로그인 후 다시 시도해 주세요');
        setShareSaving(false);
        return;
      }

      unlockPlazaNav();
      setPlazaNavVisible(true);
      setShareModalOpen(false);
      setShareSaving(false);

      const url = `${window.location.origin}/trip/${trip.slug}`;
      const copied = () => {
        const plazaMsg = opts.listInPlaza ? ' · 공유마당에 등록됨' : '';
        showToast(`공유 링크가 복사되었습니다 (공개 저장됨${plazaMsg})`);
      };
      if (navigator.share) {
        navigator.share({ title: trip.title, url }).catch(() => {
          navigator.clipboard?.writeText(url).then(copied);
        });
      } else {
        navigator.clipboard?.writeText(url).then(copied);
      }
    },
    [trip, user, showToast]
  );

  const countsByDay = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let d = 1; d <= trip.totalDays; d++) {
      counts[d] = (trip.pinnedByDay[d] ?? []).length;
    }
    return counts;
  }, [trip.pinnedByDay, trip.totalDays]);

  const displayResults = useMemo(() => {
    const selected =
      categoryFilter === 'FD6'
        ? (trip.foodRestrictions ?? [])
        : categorySubFilters;
    return filterPlacesBySubFilters(results, categoryFilter, selected);
  }, [results, categoryFilter, categorySubFilters, trip.foodRestrictions]);

  const pinnedIds = new Set(pinned.map((p) => p.id));
  const totalPinCount = useMemo(
    () =>
      Object.values(trip.pinnedByDay).reduce(
        (sum, list) => sum + (list?.length ?? 0),
        0
      ),
    [trip.pinnedByDay]
  );
  const showOnboarding = shouldShowOnboarding(totalPinCount, hydrated);

  const saveStatus: SaveStatus = useMemo(() => {
    if (savePending) return 'syncing';
    if (authConfigured && user) return 'cloud';
    if (authConfigured && !user) return 'guest';
    return 'local';
  }, [savePending, authConfigured, user]);

  const useMobileChrome = isMobile && !presentationMode;
  const searchExpanded =
    !useMobileChrome &&
    (query.trim().length > 0 || searching || results.length > 0);

  const toggleMobileSheet = useCallback((sheet: 'search' | 'pins') => {
    if (sheet === 'search') {
      setMobileSheet((prev) => (prev === 'search' ? null : 'search'));
      return;
    }
    setMobileSheet(null);
    setMobileSheetTab('pins');
    setMobileSheetLevel((prev) => (prev === 'peek' ? 'half' : prev));
  }, []);

  useEffect(() => {
    if (!useMobileChrome) setMobileSheet(null);
  }, [useMobileChrome]);

  useEffect(() => {
    if (!presentationMode || tableViewMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresentationMode(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [presentationMode, tableViewMode]);

  const rootClass = [
    'waymeld-root',
    panelOpen && !useMobileChrome ? 'panel-open' : '',
    !panelOpen && !useMobileChrome ? 'panel-collapsed' : '',
    materialsPanelOpen ? 'materials-open' : '',
    generatedRoute ? 'dock-open' : '',
    presentationMode ? 'presentation-mode' : '',
    searchExpanded ? 'search-expanded' : '',
    useMobileChrome ? 'mobile-layout' : '',
    mobileSheet === 'search' ? 'mobile-search-open mobile-sheet-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      {(mapProviderBooting ||
        !((mapProvider === 'kakao' && kakaoReady) ||
          (mapProvider === 'google' && googleReady))) && (
        <div className="map-canvas map-loading" aria-live="polite">
          {tc('loadingMap')}
        </div>
      )}
      <UpgradeModal open={upgradeOpen} onClose={() => setUpgradeOpen(false)} plan={plan} />
      {!mapProviderBooting &&
        ((mapProvider === 'kakao' && kakaoReady) ||
          (mapProvider === 'google' && googleReady)) && (
        <MapView
          key={mapProvider}
          provider={mapProvider}
          mapsReady={kakaoReady}
          googleMapsReady={googleReady}
          center={mapCenter}
          level={mapLevel}
          searchResults={displayResults}
          pinned={mapPins}
          pinCategoryFilter={mapPinCategoryFilter}
          origin={routeOptions.origin}
          generatedRoute={generatedRoute}
          nearbySearchCenter={searchScope === 'nearby' ? nearbySearchCenter : null}
          fitSearchBounds={fitSearchBounds}
          fitPinsBounds={presentationMode}
          pickingOriginFromMap={pickingOriginFromMap}
          pickingPinFromMap={pickingPinFromMap}
          onOriginPicked={handleOriginPicked}
          onPinLocationPicked={handlePinLocationPicked}
          onMapLongPress={handleLongPressPin}
          draftPinLocation={pendingManualPin}
          highlightPlaceId={selectedPlaceId}
          pinSelectionFilter={pinSelectionActive ? selectedPinIds : undefined}
          onSelectPlace={handleSelectPlace}
          onHoverSearchPlace={handleHoverSearchPlace}
          onPinnedMarkerClick={handlePinnedMarkerClick}
          infoWindowPlace={infoWindowPlace}
          pinnedIds={pinnedIds}
          onCloseInfoWindow={handleCloseInfoWindow}
          onTogglePinFromInfo={handleTogglePinFromInfo}
          onOpenRoadviewFromInfo={(p) => setRoadviewTarget(p)}
          onOpenPlacePhotosFromInfo={handleOpenPlacePhotos}
          onShowTaxiCardFromInfo={(p) => setTaxiCardPlace(p)}
          onMapRightClick={handleMapRightClick}
          onMapCenterChange={handleMapCenterChange}
          onMapLevelChange={handleMapLevelChange}
        />
      )}

      {!useMobileChrome && (
        <>
          <PlannerAppBar
            trip={trip}
            summaries={tripSummaries}
            countsByDay={countsByDay}
            saveStatus={saveStatus}
            lastSavedAt={lastSavedAt ?? trip.updatedAt}
            onGuestSaveClick={() => navigate('/login')}
            onTitleChange={handleTitleChange}
            onSelectTrip={handleSelectTrip}
            onSelectDay={selectDay}
            onAddDay={addDay}
            onRemoveDay={removeDay}
            onOpenMaterials={handleOpenMaterialsPanel}
            onNewTrip={handleNewTrip}
            onDeleteTrip={() => void handleDeleteTrip()}
            onShare={openShareModal}
            presentationMode={presentationMode}
            onTogglePresentation={handleTogglePresentation}
            tableViewMode={tableViewMode}
            onToggleTableView={handleToggleTableView}
            plazaNavVisible={plazaNavVisible}
          />

          <PlannerSidePanel
            open={panelOpen && !presentationMode}
            tab={panelTab}
            pinCount={pinned.length}
            onTabChange={openPlannerTab}
            onCollapse={() => setPanelOpen(false)}
            searchSlot={
              <SearchPanel
                results={displayResults}
                pinnedIds={pinnedIds}
                selectedId={selectedPlaceId}
                loading={searching}
                enrichingStats={enrichingStats}
                searchEmpty={searchEmpty}
                searchScope={searchScope}
                onSearchScopeChange={handleSearchScopeChange}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={handleCategoryFilterChange}
                searchRadius={searchRadius}
                onSearchRadiusChange={handleSearchRadiusChange}
                onUseMyLocation={handleUseMyLocationForSearch}
                onSearchFestivals={isTourFestivalConfigured() ? handleSearchFestivals : undefined}
                searchingFestivals={searchingFestivals}
                query={query}
                onQueryChange={setQuery}
                onSearch={handleSearch}
                onClear={handleResetSearch}
                onResetResults={handleResetSearch}
                onTogglePin={handleTogglePin}
                onSelectResult={handleSelectPlace}
                onOpenRoadview={(p) => setRoadviewTarget(p)}
                onOpenPlacePhotos={handleOpenPlacePhotos}
                hasMore={searchHasMore}
                loadingMore={loadingMore}
                onLoadMore={handleLoadMore}
                searchError={searchError}
                mapProvider={mapProvider}
                onMapProviderChange={handleMapProviderChange}
                onSearchCandidate={handleSearchCandidate}
                foodRestrictions={trip.foodRestrictions ?? []}
                onFoodRestrictionsChange={handleFoodRestrictionsChange}
                categorySubFilters={categorySubFilters}
                onCategorySubFiltersChange={setCategorySubFilters}
                preferences={trip.preferences}
              />
            }
            pinsSlot={
              <>
                <div className="trip-preferences-bar planner-prefs-inline">
                  <ThemePreferenceChips
                    selected={trip.preferences ?? []}
                    onChange={handlePreferencesChange}
                    compact
                  />
                </div>
                <PinupBar
                  variant="panel"
                  hideHeader
                  pinned={pinned}
                  tripTitle={trip.title}
                  currentDay={currentDay}
                  totalDays={trip.totalDays}
                  pinnedByDay={trip.pinnedByDay}
                  generatedRouteByDay={trip.generatedRouteByDay}
                  onExportNotify={showToast}
                  onUpgradeRequest={() => setUpgradeOpen(true)}
                  onImportPins={handleImportPins}
                  mapCategoryFilter={mapPinCategoryFilter}
                  onToggleMapCategoryFilter={handleToggleMapCategoryFilter}
                  onRemove={handleRemovePin}
                  onReorder={handleReorderPinned}
                  onSelectPin={handleSelectPlace}
                  selectedPinIds={selectedPinIds}
                  onTogglePinSelection={handleTogglePinSelection}
                  onClearAll={handleClearAllPins}
                  onOpenRouteOptions={handleOpenRouteOptions}
                  routeOptionsOpen={routeOptionsOpen}
                  mustVisitOnly={mustVisitOnly}
                  onToggleMustVisitOnly={() => setMustVisitOnly((v) => !v)}
                  onToggleRequired={handleToggleRequired}
                  onShowTaxiCard={(p) => setTaxiCardPlace(p)}
                />
              </>
            }
            routeSlot={
              <RouteOptionsPanel
                embedded
                open
                pinned={routePins}
                currentDay={currentDay}
                totalDays={trip.totalDays}
                options={routeOptions}
                hasExistingRoute={!!generatedRoute}
                onChange={setRouteOptions}
                onUpdateStayMinutes={handleUpdateStayMinutes}
                onCopyFromPreviousDay={() => {
                  setTrip((prev) => copyRouteOptionsFromDay(prev, currentDay - 1, currentDay));
                  showToast(`${currentDay - 1}일차 출발 설정을 복사했습니다`);
                }}
                onClose={() => setPanelOpen(false)}
                onGenerate={() => void handleGenerate()}
                onPickOriginFromMap={handlePickOriginFromMap}
                pickingOriginFromMap={pickingOriginFromMap}
              />
            }
            scenarioSlot={
              isTourScenarioConfigured() ? (
                <ThemeScenarioPanel
                  currentDay={currentDay}
                  totalDays={trip.totalDays}
                  pinnedByDay={trip.pinnedByDay}
                  onApply={(result) => {
                    handleImportPins(result);
                    showToast(tp('scenario.applied', { count: result.importedCount }));
                  }}
                />
              ) : undefined
            }
          />

          <PanelIconRail
            visible={!panelOpen && !presentationMode}
            pinCount={pinned.length}
            activeTab={null}
            onOpen={openPlannerTab}
          />

          {generatedRoute && !presentationMode && (
            <RouteTimelineDock
              route={generatedRoute}
              currentDay={currentDay}
              panelOpen={panelOpen}
              collapsed={dockCollapsed}
              onToggleCollapsed={() => setDockCollapsed((v) => !v)}
              onReoptimize={handleOpenRouteOptions}
              onClearRoute={handleClearRoute}
              selectedStopId={selectedPlaceId}
              onSelectStop={(id) => {
                const p = pinned.find((x) => x.id === id);
                if (p) handleSelectPlace(p);
              }}
              onShowTaxiCard={(p) => setTaxiCardPlace(p)}
              refining={refining}
            />
          )}

          <div className="overview-chrome">
            <span style={{ fontWeight: 700, fontSize: 13 }}>Overview · 조감</span>
            <button
              type="button"
              className={`overview-chrome-btn ${!mapPinCategoryFilter ? 'active' : ''}`}
              onClick={() => setMapPinCategoryFilter(null)}
            >
              All
            </button>
            <button
              type="button"
              className="overview-chrome-exit"
              onClick={handleTogglePresentation}
            >
              Exit
            </button>
          </div>
          <div className="overview-legend">
            {(
              [
                ['food', '#c2410c', 'Food'],
                ['tour', '#0e7490', 'Sights'],
                ['stay', '#475569', 'Stay'],
                ['shop', '#4d7c0f', 'Mart'],
              ] as const
            ).map(([cat, color, label]) => (
              <button
                key={cat}
                type="button"
                className={`overview-legend-chip ${
                  mapPinCategoryFilter === cat || !mapPinCategoryFilter ? 'on' : ''
                }`}
                style={{ background: color }}
                onClick={() =>
                  setMapPinCategoryFilter((prev) => (prev === cat ? null : cat))
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="overlay-map-tools desktop-only-overlay">
            <button
              type="button"
              className={`map-tool-btn ${pickingPinFromMap ? 'active' : ''}`}
              onClick={handleTogglePinFromMap}
              title={tp('trip.pinFromMap')}
            >
              <Icon name="pinPlus" />
              {tp('trip.pinFromMap')}
            </button>
          </div>
        </>
      )}

      <ItineraryTableView
        open={tableViewMode}
        trip={trip}
        selectedPlaceId={selectedPlaceId}
        onSelectPlaceId={setSelectedPlaceId}
        onOpenPlacePhotos={handleOpenPlacePhotos}
        onClose={handleCloseTableView}
      />

      {useMobileChrome && (
        <>
          <div className="mobile-planner-top">
            <div className="mobile-planner-search-row">
              <button
                type="button"
                className="mobile-planner-search-pill"
                onClick={() => setMobileSheet('search')}
              >
                <Icon name="search" size={18} />
                Search places · 장소 검색
              </button>
              <button
                type="button"
                className="mobile-planner-menu-btn"
                onClick={handleOpenMaterialsPanel}
                aria-label={tp('trip.materials')}
              >
                <Icon name="folder" size={18} />
              </button>
              <MobileMoreMenu
                onShare={openShareModal}
                plazaNavVisible={plazaNavVisible}
                onOpenScenario={isTourScenarioConfigured() ? () => setScenarioOpen(true) : undefined}
              />
            </div>
            <div className="mobile-planner-days">
              {Array.from({ length: trip.totalDays }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`mobile-planner-day ${d === currentDay ? 'active' : ''}`}
                  onClick={() => selectDay(d)}
                >
                  Day {d}
                  {(countsByDay[d] ?? 0) > 0 ? ` · ${countsByDay[d]}` : ''}
                </button>
              ))}
              <button type="button" className="mobile-planner-day" onClick={addDay}>
                + Day
              </button>
            </div>
          </div>

          {generatedRoute && mobileSheetLevel === 'peek' && mobileSheet !== 'search' && (
            <RouteTimelineDock
              variant="mobile"
              route={generatedRoute}
              currentDay={currentDay}
              panelOpen={false}
              collapsed={dockCollapsed}
              onToggleCollapsed={() => setDockCollapsed((v) => !v)}
              onReoptimize={handleOpenRouteOptions}
              onClearRoute={handleClearRoute}
              selectedStopId={selectedPlaceId}
              onSelectStop={(id) => {
                const p = pinned.find((x) => x.id === id);
                if (p) handleSelectPlace(p);
              }}
              onShowTaxiCard={(p) => setTaxiCardPlace(p)}
              refining={refining}
            />
          )}

          <div
            className={`mobile-planner-sheet sheet-${mobileSheetLevel} ${
              mobileSheetLevel === 'peek' ? 'mobile-sheet-peek-only' : ''
            }`}
          >
            <button
              type="button"
              className="mobile-sheet-handle-btn"
              onClick={cycleMobileSheet}
            >
              <span className="mobile-sheet-handle-bar" />
            </button>
            <div className="mobile-sheet-head">
              <span className="mobile-sheet-head-title">
                {mobileSheetTab === 'route' && generatedRoute
                  ? `Day ${currentDay} route · ${currentDay}일차 동선`
                  : trip.title}
              </span>
              <span className="mobile-sheet-head-summary">
                {mobileSheetTab === 'route' && generatedRoute
                  ? `${generatedRoute.totalDistanceKm} km · ${generatedRoute.totalTravelMinutes}m`
                  : `${pinned.length} pins · Day ${currentDay}`}
              </span>
            </div>
            <div className="mobile-sheet-tabs">
              <button
                type="button"
                className={`mobile-sheet-tab ${mobileSheetTab === 'pins' ? 'active' : ''}`}
                onClick={() => setMobileSheetTab('pins')}
              >
                Pins 핀 {pinned.length}
              </button>
              <button
                type="button"
                className={`mobile-sheet-tab ${mobileSheetTab === 'route' ? 'active' : ''}`}
                onClick={() => {
                  setMobileSheetTab('route');
                  setRouteOptionsOpen(true);
                }}
              >
                Route 동선
              </button>
            </div>
            <div className="mobile-sheet-content">
              {mobileSheetTab === 'pins' ? (
                <PinupBar
                  variant="panel"
                  hideHeader
                  pinned={pinned}
                  tripTitle={trip.title}
                  currentDay={currentDay}
                  totalDays={trip.totalDays}
                  pinnedByDay={trip.pinnedByDay}
                  generatedRouteByDay={trip.generatedRouteByDay}
                  onExportNotify={showToast}
                  onUpgradeRequest={() => setUpgradeOpen(true)}
                  onImportPins={handleImportPins}
                  mapCategoryFilter={mapPinCategoryFilter}
                  onToggleMapCategoryFilter={handleToggleMapCategoryFilter}
                  onRemove={handleRemovePin}
                  onReorder={handleReorderPinned}
                  onSelectPin={(p) => {
                    handleSelectPlace(p);
                    setMobileSheetLevel('peek');
                  }}
                  selectedPinIds={selectedPinIds}
                  onTogglePinSelection={handleTogglePinSelection}
                  onClearAll={handleClearAllPins}
                  onOpenRouteOptions={handleOpenRouteOptions}
                  routeOptionsOpen={routeOptionsOpen}
                  mustVisitOnly={mustVisitOnly}
                  onToggleMustVisitOnly={() => setMustVisitOnly((v) => !v)}
                  onToggleRequired={handleToggleRequired}
                  onShowTaxiCard={(p) => setTaxiCardPlace(p)}
                />
              ) : (
                <RouteOptionsPanel
                  embedded
                  open
                  pinned={routePins}
                  currentDay={currentDay}
                  totalDays={trip.totalDays}
                  options={routeOptions}
                  hasExistingRoute={!!generatedRoute}
                  onChange={setRouteOptions}
                  onUpdateStayMinutes={handleUpdateStayMinutes}
                  onClose={() => setMobileSheetLevel('peek')}
                  onGenerate={() => void handleGenerate()}
                  onPickOriginFromMap={handlePickOriginFromMap}
                  pickingOriginFromMap={pickingOriginFromMap}
                />
              )}
            </div>
          </div>

          {mobileSheet === 'search' && (
            <div className="mobile-search-overlay">
              <MobileSearchSheet
                open
                onClose={() => setMobileSheet(null)}
                results={displayResults}
                pinnedIds={pinnedIds}
                selectedId={selectedPlaceId}
                loading={searching}
                enrichingStats={enrichingStats}
                searchEmpty={searchEmpty}
                searchScope={searchScope}
                onSearchScopeChange={handleSearchScopeChange}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={handleCategoryFilterChange}
                searchRadius={searchRadius}
                onSearchRadiusChange={handleSearchRadiusChange}
                onUseMyLocation={handleUseMyLocationForSearch}
                onSearchFestivals={isTourFestivalConfigured() ? handleSearchFestivals : undefined}
                searchingFestivals={searchingFestivals}
                query={query}
                onQueryChange={setQuery}
                onSearch={handleSearch}
                onClear={handleResetSearch}
                onResetResults={handleResetSearch}
                onTogglePin={handleTogglePin}
                onSelectResult={handleSelectPlace}
                onOpenRoadview={(p) => setRoadviewTarget(p)}
                onOpenPlacePhotos={handleOpenPlacePhotos}
                hasMore={searchHasMore}
                loadingMore={loadingMore}
                onLoadMore={handleLoadMore}
                searchError={searchError}
                mapProvider={mapProvider}
                onMapProviderChange={handleMapProviderChange}
                onSearchCandidate={handleSearchCandidate}
                foodRestrictions={trip.foodRestrictions ?? []}
                onFoodRestrictionsChange={handleFoodRestrictionsChange}
                categorySubFilters={categorySubFilters}
                onCategorySubFiltersChange={setCategorySubFilters}
                preferences={trip.preferences}
              />
            </div>
          )}
        </>
      )}

      <MapContextMenu
        open={!!mapContextMenu}
        x={mapContextMenu?.x ?? 0}
        y={mapContextMenu?.y ?? 0}
        onSetSearchCenter={handleSetSearchCenterFromMap}
        onClose={() => setMapContextMenu(null)}
      />

      <TripMaterialsPanel
        open={materialsPanelOpen}
        onClose={() => setMaterialsPanelOpen(false)}
        materials={trip.materials ?? []}
        onChange={handleMaterialsChange}
        tripId={trip.id}
        tripTitle={trip.title}
        totalDays={trip.totalDays}
        currentDay={currentDay}
        pinnedByDay={trip.pinnedByDay}
        userId={user?.id ?? null}
        authConfigured={authConfigured}
        onNotify={showToast}
      />

      {pickingOriginFromMap && (
        <div className="picking-toast">
          <Icon name="pinSelect" />
          지도를 클릭해 출발지를 지정하세요
        </div>
      )}

      {pickingPinFromMap && (
        <div className="picking-toast">
          <Icon name="pinPlus" />
          {tp('trip.pickingPin')}
        </div>
      )}

      <ManualPinModal
        open={!!pendingManualPin}
        lat={pendingManualPin?.lat ?? 0}
        lng={pendingManualPin?.lng ?? 0}
        address={pendingManualPin?.address ?? ''}
        onConfirm={handleConfirmManualPin}
        onClose={handleCancelManualPin}
      />

      <RoadviewModal
        key={roadviewTarget?.id ?? 'roadview-closed'}
        open={!!roadviewTarget}
        lat={roadviewTarget?.lat ?? 0}
        lng={roadviewTarget?.lng ?? 0}
        placeName={roadviewTarget?.name}
        onClose={() => setRoadviewTarget(null)}
      />

      <PlacePhotosModal
        open={!!photosTarget}
        place={photosTarget}
        onClose={() => setPhotosTarget(null)}
        onShowTaxiCard={(p) => setTaxiCardPlace(p)}
      />

      <TaxiDriverCardModal
        open={!!taxiCardPlace}
        place={taxiCardPlace}
        onClose={() => setTaxiCardPlace(null)}
      />

      <AppSheetModal
        open={scenarioOpen}
        title={tp('scenario.title')}
        onClose={() => setScenarioOpen(false)}
        wide
      >
        <ThemeScenarioPanel
          currentDay={currentDay}
          totalDays={trip.totalDays}
          pinnedByDay={trip.pinnedByDay}
          onApply={(result) => {
            handleImportPins(result);
            showToast(tp('scenario.applied', { count: result.importedCount }));
          }}
        />
      </AppSheetModal>

      {showOnboarding && (
        <OnboardingCoach
          mobile={useMobileChrome}
          onOpenSearch={() => toggleMobileSheet('search')}
          onOpenPins={() => toggleMobileSheet('pins')}
          onOpenRoute={handleOpenRouteOptions}
        />
      )}

      <ShareTripModal
        open={shareModalOpen}
        tripTitle={trip.title}
        userEmail={user?.email ?? null}
        authConfigured={authConfigured}
        saving={shareSaving}
        onClose={() => !shareSaving && setShareModalOpen(false)}
        onConfirm={handleShareConfirm}
      />

      <Toast message={toast} />
    </div>
  );
}
