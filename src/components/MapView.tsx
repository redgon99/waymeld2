import { useEffect, useRef } from 'react';
import type { Place, PinnedPlace, GeneratedRoute, Origin, SimpleCategory } from '../types';
import { getCategoryMeta } from '../lib/categories';
import { coordsToAddress } from '../lib/kakao';
import { createMapInfoCardElement } from '../lib/mapInfoCard';
import { iconSvgMarkup } from '../icons/waymeld-icons';
import {
  renderPlaceMarkerHtml,
  renderSearchCenterMarkerHtml,
} from '../lib/mapMarkers';
import { GoogleMapView } from './GoogleMapView';
import type { MapProvider } from '../lib/mapProvider';

interface Props {
  provider?: MapProvider;
  mapsReady?: boolean;
  googleMapsReady?: boolean;
  center: { lat: number; lng: number };
  level?: number;
  /** level 적용을 강제할 때 증가 (같은 level로 재클릭해도 setLevel) */
  levelTick?: number;
  searchResults: Place[];
  pinned: PinnedPlace[];
  pinCategoryFilter?: SimpleCategory | null;
  origin?: Origin;
  generatedRoute?: GeneratedRoute | null;
  nearbySearchCenter?: { lat: number; lng: number } | null;
  pickingOriginFromMap?: boolean;
  pickingPinFromMap?: boolean;
  onOriginPicked?: (lat: number, lng: number, address: string) => void;
  onPinLocationPicked?: (lat: number, lng: number, address: string) => void;
  draftPinLocation?: { lat: number; lng: number } | null;
  onSelectPlace?: (place: Place) => void;
  onPinnedMarkerClick?: (place: Place) => void;
  infoWindowPlace?: Place | null;
  pinnedIds?: Set<string>;
  onCloseInfoWindow?: () => void;
  onTogglePinFromInfo?: (place: Place) => void;
  onOpenRoadviewFromInfo?: (place: Place) => void;
  onOpenPlacePhotosFromInfo?: (place: Place) => void;
  onShowTaxiCardFromInfo?: (place: Place) => void;
  onMapRightClick?: (lat: number, lng: number, clientX: number, clientY: number) => void;
  onMapCenterChange?: (lat: number, lng: number) => void;
  /** 사용자 줌 변경 시 카카오 레벨로 동기화 */
  onMapLevelChange?: (level: number) => void;
  fitRouteBounds?: boolean;
  fitSearchBounds?: boolean;
  highlightPlaceId?: string | null;
  /** 핀업 선택 모드: 지정 시 선택된 핀 마커만 표시(검색 마커 숨김) */
  pinSelectionFilter?: ReadonlySet<string>;
  /** 공유마당 전국 지도용 마커 */
  plazaMarkers?: ReadonlyArray<{ id: string; lat: number; lng: number; title: string }>;
  highlightPlazaId?: string | null;
  onPlazaMarkerClick?: (id: string) => void;
}

export function MapView({
  provider = 'kakao',
  mapsReady = false,
  googleMapsReady = false,
  ...rest
}: Props) {
  if (provider === 'google') {
    return (
      <GoogleMapView
        mapsReady={googleMapsReady}
        center={rest.center}
        level={rest.level}
        levelTick={rest.levelTick}
        searchResults={rest.searchResults}
        pinned={rest.pinned}
        pinCategoryFilter={rest.pinCategoryFilter}
        origin={rest.origin}
        generatedRoute={rest.generatedRoute}
        nearbySearchCenter={rest.nearbySearchCenter}
        pickingOriginFromMap={rest.pickingOriginFromMap}
        pickingPinFromMap={rest.pickingPinFromMap}
        onOriginPicked={rest.onOriginPicked}
        onPinLocationPicked={rest.onPinLocationPicked}
        draftPinLocation={rest.draftPinLocation}
        onSelectPlace={rest.onSelectPlace}
        onPinnedMarkerClick={rest.onPinnedMarkerClick}
        onMapRightClick={rest.onMapRightClick}
        onMapCenterChange={rest.onMapCenterChange}
        onMapLevelChange={rest.onMapLevelChange}
        fitRouteBounds={rest.fitRouteBounds}
        fitSearchBounds={rest.fitSearchBounds}
        highlightPlaceId={rest.highlightPlaceId}
        pinSelectionFilter={rest.pinSelectionFilter}
        plazaMarkers={rest.plazaMarkers}
        highlightPlazaId={rest.highlightPlazaId}
        onPlazaMarkerClick={rest.onPlazaMarkerClick}
      />
    );
  }

  return <KakaoMapView mapsReady={mapsReady} {...rest} />;
}

function KakaoMapView({
  mapsReady = false,
  center,
  level = 5,
  levelTick = 0,
  searchResults,
  pinned,
  pinCategoryFilter = null,
  origin,
  generatedRoute,
  nearbySearchCenter = null,
  pickingOriginFromMap = false,
  pickingPinFromMap = false,
  onOriginPicked,
  onPinLocationPicked,
  draftPinLocation = null,
  onSelectPlace,
  onPinnedMarkerClick,
  infoWindowPlace = null,
  pinnedIds = new Set(),
  onCloseInfoWindow,
  onTogglePinFromInfo,
  onOpenRoadviewFromInfo,
  onOpenPlacePhotosFromInfo,
  onShowTaxiCardFromInfo,
  onMapRightClick,
  onMapCenterChange,
  onMapLevelChange,
  fitRouteBounds = false,
  fitSearchBounds = false,
  highlightPlaceId = null,
  pinSelectionFilter,
  plazaMarkers = [],
  highlightPlazaId = null,
  onPlazaMarkerClick,
}: Omit<Props, 'provider' | 'googleMapsReady'>) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const searchCenterMarkerRef = useRef<any>(null);
  const infoOverlayRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const rightClickListenerRef = useRef<any>(null);
  const mapClickCloseInfoRef = useRef<any>(null);

  const infoHandlersRef = useRef({
    onCloseInfoWindow,
    onTogglePinFromInfo,
    onOpenRoadviewFromInfo,
    onOpenPlacePhotosFromInfo,
    onShowTaxiCardFromInfo,
    pinnedIds,
  });
  infoHandlersRef.current = {
    onCloseInfoWindow,
    onTogglePinFromInfo,
    onOpenRoadviewFromInfo,
    onOpenPlacePhotosFromInfo,
    onShowTaxiCardFromInfo,
    pinnedIds,
  };

  const pinSelectionActive =
    pinSelectionFilter != null && pinSelectionFilter.size > 0;

  let visiblePinned = pinCategoryFilter
    ? pinned.filter((p) => getCategoryMeta(p.categoryCode).category === pinCategoryFilter)
    : pinned;
  if (pinSelectionActive) {
    visiblePinned = visiblePinned.filter((p) => pinSelectionFilter!.has(p.id));
  }

  // 지도 초기화 (SDK 로드 완료 후에만 실행)
  useEffect(() => {
    if (!mapsReady || !mapEl.current || !window.kakao?.maps) return;
    if (mapRef.current) return;

    const map = new window.kakao.maps.Map(mapEl.current, {
      center: new window.kakao.maps.LatLng(center.lat, center.lng),
      level,
    });
    mapRef.current = map;
    const relayout = () => requestAnimationFrame(() => map.relayout());
    relayout();
    window.addEventListener('resize', relayout);
    window.addEventListener('orientationchange', relayout);
    const ro = new ResizeObserver(relayout);
    if (mapEl.current) ro.observe(mapEl.current);

    return () => {
      window.removeEventListener('resize', relayout);
      window.removeEventListener('orientationchange', relayout);
      ro.disconnect();
      overlaysRef.current.forEach((o) => {
        try {
          o.setMap(null);
        } catch {
          /* ignore */
        }
      });
      overlaysRef.current = [];
      for (const ref of [
        polylineRef,
        originMarkerRef,
        searchCenterMarkerRef,
        infoOverlayRef,
      ] as const) {
        if (ref.current) {
          try {
            ref.current.setMap(null);
          } catch {
            /* ignore */
          }
          ref.current = null;
        }
      }
      mapRef.current = null;
      // StrictMode 재마운트·provider 전환 시 같은 컨테이너에 Map이 중첩되지 않도록 비움
      if (mapEl.current) mapEl.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  // 센터 변경
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setCenter(new window.kakao.maps.LatLng(center.lat, center.lng));
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setLevel(level);
  }, [level, levelTick]);

  // 사용자가 지도를 움직이면 중심 좌표 동기화 (카테고리·지도 주변 검색용)
  useEffect(() => {
    if (!mapRef.current || (!onMapCenterChange && !onMapLevelChange)) return;
    const map = mapRef.current;
    const emitCenter = () => {
      if (!onMapCenterChange) return;
      const c = map.getCenter();
      onMapCenterChange(c.getLat(), c.getLng());
    };
    const emitLevel = () => {
      onMapLevelChange?.(map.getLevel());
    };
    const dragEnd = window.kakao.maps.event.addListener(map, 'dragend', emitCenter);
    const zoomChanged = window.kakao.maps.event.addListener(map, 'zoom_changed', () => {
      emitCenter();
      emitLevel();
    });
    return () => {
      window.kakao.maps.event.removeListener(map, 'dragend', dragEnd);
      window.kakao.maps.event.removeListener(map, 'zoom_changed', zoomChanged);
    };
  }, [onMapCenterChange, onMapLevelChange]);

  // 클릭으로 출발지·수동 핀 위치 선택
  useEffect(() => {
    if (!mapRef.current) return;
    if (clickListenerRef.current) {
      window.kakao.maps.event.removeListener(
        mapRef.current,
        'click',
        clickListenerRef.current
      );
      clickListenerRef.current = null;
    }

    const pickMode = pickingOriginFromMap
      ? 'origin'
      : pickingPinFromMap
        ? 'pin'
        : null;
    if (!pickMode) return;

    const handler = async (e: any) => {
      const latlng = e.latLng;
      const lat = latlng.getLat();
      const lng = latlng.getLng();
      let addr = '';
      try {
        addr = await coordsToAddress(lat, lng);
      } catch {
        addr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
      if (pickMode === 'origin') {
        onOriginPicked?.(lat, lng, addr);
      } else {
        onPinLocationPicked?.(lat, lng, addr);
      }
    };
    clickListenerRef.current = handler;
    window.kakao.maps.event.addListener(mapRef.current, 'click', handler);

    return () => {
      if (mapRef.current && clickListenerRef.current) {
        window.kakao.maps.event.removeListener(
          mapRef.current,
          'click',
          clickListenerRef.current
        );
        clickListenerRef.current = null;
      }
    };
  }, [pickingOriginFromMap, pickingPinFromMap, onOriginPicked, onPinLocationPicked]);

  // 지도 클릭 시 인포윈도우 닫기
  useEffect(() => {
    if (!mapRef.current) return;
    if (mapClickCloseInfoRef.current) {
      window.kakao.maps.event.removeListener(
        mapRef.current,
        'click',
        mapClickCloseInfoRef.current
      );
      mapClickCloseInfoRef.current = null;
    }
    if (!infoWindowPlace || pickingOriginFromMap || pickingPinFromMap) return;

    const handler = () => infoHandlersRef.current.onCloseInfoWindow?.();
    mapClickCloseInfoRef.current = handler;
    window.kakao.maps.event.addListener(mapRef.current, 'click', handler);

    return () => {
      if (mapRef.current && mapClickCloseInfoRef.current) {
        window.kakao.maps.event.removeListener(
          mapRef.current,
          'click',
          mapClickCloseInfoRef.current
        );
        mapClickCloseInfoRef.current = null;
      }
    };
  }, [infoWindowPlace, pickingOriginFromMap, pickingPinFromMap]);

  // 우클릭 → 검색 중심 메뉴
  useEffect(() => {
    if (!mapRef.current) return;
    if (rightClickListenerRef.current) {
      window.kakao.maps.event.removeListener(
        mapRef.current,
        'rightclick',
        rightClickListenerRef.current
      );
      rightClickListenerRef.current = null;
    }

    const handler = (mouseEvent: any) => {
      if (pickingOriginFromMap || pickingPinFromMap) return;
      const lat = mouseEvent.latLng.getLat();
      const lng = mouseEvent.latLng.getLng();
      const ev = mouseEvent.originalEvent as MouseEvent | undefined;
      const mapRect = mapEl.current?.getBoundingClientRect();
      let clientX = ev?.clientX ?? 0;
      let clientY = ev?.clientY ?? 0;
      if ((!clientX && !clientY) && mouseEvent.point && mapRect) {
        clientX = mapRect.left + mouseEvent.point.x;
        clientY = mapRect.top + mouseEvent.point.y;
      }
      onMapRightClick?.(lat, lng, clientX, clientY);
    };
    rightClickListenerRef.current = handler;
    window.kakao.maps.event.addListener(mapRef.current, 'rightclick', handler);

    return () => {
      if (mapRef.current && rightClickListenerRef.current) {
        window.kakao.maps.event.removeListener(
          mapRef.current,
          'rightclick',
          rightClickListenerRef.current
        );
        rightClickListenerRef.current = null;
      }
    };
  }, [pickingOriginFromMap, pickingPinFromMap, onMapRightClick]);

  // 공유마당 마커
  useEffect(() => {
    if (!mapRef.current || plazaMarkers.length === 0) return;

    const plazaOverlays: any[] = [];
    plazaMarkers.forEach((m) => {
      const isSelected = highlightPlazaId === m.id;
      const content = document.createElement('div');
      content.className = `map-marker plaza-marker ${isSelected ? 'selected' : ''}`;
      content.innerHTML = `
        <div class="marker-label plaza-marker-label">${escapeHtml(m.title)}</div>
        <div class="marker-dot plaza-marker-dot"></div>
      `;
      content.addEventListener('click', (e) => {
        e.stopPropagation();
        onPlazaMarkerClick?.(m.id);
      });
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(m.lat, m.lng),
        content,
        yAnchor: 1,
        clickable: true,
      });
      overlay.setMap(mapRef.current);
      plazaOverlays.push(overlay);
    });

    if (plazaMarkers.length >= 2) {
      const bounds = new window.kakao.maps.LatLngBounds();
      plazaMarkers.forEach((m) =>
        bounds.extend(new window.kakao.maps.LatLng(m.lat, m.lng))
      );
      mapRef.current.setBounds(bounds);
    }

    return () => {
      plazaOverlays.forEach((o) => o.setMap(null));
    };
  }, [plazaMarkers, highlightPlazaId, onPlazaMarkerClick]);

  // 마커 렌더링 (검색 결과 + 핀업 표시)
  useEffect(() => {
    if (!mapRef.current) return;
    if (plazaMarkers.length > 0) return;
    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = [];

    const pinnedMap = new Map(visiblePinned.map((p) => [p.id, p]));
    const resultsForMarkers = pinSelectionActive ? [] : searchResults;

    const places: Array<Place & { _pinned?: PinnedPlace }> = [
      ...resultsForMarkers.map((s) => ({ ...s, _pinned: pinnedMap.get(s.id) })),
      ...visiblePinned
        .filter((p) => !resultsForMarkers.some((s) => s.id === p.id))
        .map((p) => ({ ...p, _pinned: p })),
    ];

    const markerPlaces = [...places].sort((a, b) => {
      const aSel = highlightPlaceId === a.id;
      const bSel = highlightPlaceId === b.id;
      if (aSel === bSel) return 0;
      return aSel ? 1 : -1;
    });

    markerPlaces.forEach((place) => {
      const isPinned = !!place._pinned;
      const isSelected = highlightPlaceId === place.id;

      const content = document.createElement('div');
      content.innerHTML = renderPlaceMarkerHtml({
        place,
        pinned: place._pinned,
        isSelected,
      });
      content.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isPinned) {
          onPinnedMarkerClick?.(place);
        } else {
          onSelectPlace?.(place);
        }
      });

      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(place.lat, place.lng),
        content,
        yAnchor: 1,
        clickable: true,
      });
      overlay.setMap(mapRef.current);
      overlaysRef.current.push(overlay);
    });

    if (draftPinLocation) {
      const content = document.createElement('div');
      content.className = 'map-marker draft-pin';
      content.innerHTML = `
        <div class="marker-label draft-pin-label">선택 위치</div>
        <div class="marker-dot draft-pin-dot">
          ${iconSvgMarkup('pinPlus', { size: 16, color: '#fff' })}
        </div>
      `;
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(draftPinLocation.lat, draftPinLocation.lng),
        content,
        yAnchor: 1,
      });
      overlay.setMap(mapRef.current);
      overlaysRef.current.push(overlay);
    }
  }, [
    searchResults,
    visiblePinned,
    pinSelectionActive,
    onSelectPlace,
    onPinnedMarkerClick,
    highlightPlaceId,
    draftPinLocation,
    plazaMarkers.length,
  ]);

  // 핀업 인포윈도우
  useEffect(() => {
    if (!mapRef.current) return;
    if (infoOverlayRef.current) {
      infoOverlayRef.current.setMap(null);
      infoOverlayRef.current = null;
    }
    if (!infoWindowPlace) return;

    const place = infoWindowPlace;
    const isPinned = infoHandlersRef.current.pinnedIds.has(place.id);
    const content = createMapInfoCardElement(place, {
      isPinned,
      isClosed: false,
      onClose: () => infoHandlersRef.current.onCloseInfoWindow?.(),
      onTogglePin: () => infoHandlersRef.current.onTogglePinFromInfo?.(place),
      onRoadview: () => infoHandlersRef.current.onOpenRoadviewFromInfo?.(place),
      onOpenPlacePhotos: () =>
        infoHandlersRef.current.onOpenPlacePhotosFromInfo?.(place),
      onShowTaxiCard: () =>
        infoHandlersRef.current.onShowTaxiCardFromInfo?.(place),
    });

    const overlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(place.lat, place.lng),
      content,
      yAnchor: 1.35,
      zIndex: 20,
      clickable: true,
    });
    overlay.setMap(mapRef.current);
    infoOverlayRef.current = overlay;
  }, [infoWindowPlace, pinnedIds]);

  // 검색 결과가 여러 개일 때 지도 범위 맞춤
  useEffect(() => {
    if (!mapRef.current || !fitSearchBounds || searchResults.length < 2) return;
    const bounds = new window.kakao.maps.LatLngBounds();
    searchResults.forEach((p) =>
      bounds.extend(new window.kakao.maps.LatLng(p.lat, p.lng))
    );
    mapRef.current.setBounds(bounds);
  }, [searchResults, fitSearchBounds]);

  // 출발지 마커
  useEffect(() => {
    if (!mapRef.current) return;
    if (originMarkerRef.current) {
      originMarkerRef.current.setMap(null);
      originMarkerRef.current = null;
    }
    if (origin?.lat && origin?.lng) {
      const content = document.createElement('div');
      content.className = 'origin-marker';
      content.innerHTML = `
        <div class="origin-label">${iconSvgMarkup('flag', { size: 14 })} 출발지</div>
        <div class="origin-dot"></div>
      `;
      const overlay = new window.kakao.maps.CustomOverlay({
        position: new window.kakao.maps.LatLng(origin.lat, origin.lng),
        content,
        yAnchor: 1,
      });
      overlay.setMap(mapRef.current);
      originMarkerRef.current = overlay;
    }
  }, [origin?.lat, origin?.lng]);

  // 지도 주변 검색 중심 마커
  useEffect(() => {
    if (!mapRef.current) return;
    if (searchCenterMarkerRef.current) {
      searchCenterMarkerRef.current.setMap(null);
      searchCenterMarkerRef.current = null;
    }
    if (!nearbySearchCenter) return;

    const content = document.createElement('div');
    content.innerHTML = renderSearchCenterMarkerHtml();
    const overlay = new window.kakao.maps.CustomOverlay({
      position: new window.kakao.maps.LatLng(
        nearbySearchCenter.lat,
        nearbySearchCenter.lng
      ),
      content,
      yAnchor: 0.5,
    });
    overlay.setMap(mapRef.current);
    searchCenterMarkerRef.current = overlay;
  }, [nearbySearchCenter?.lat, nearbySearchCenter?.lng]);

  // 생성된 경로 폴리라인
  useEffect(() => {
    if (!mapRef.current) return;
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }
    if (!generatedRoute) return;
    const path: any[] = [];
    if (generatedRoute.routePath?.length) {
      generatedRoute.routePath.forEach((p) =>
        path.push(new window.kakao.maps.LatLng(p.lat, p.lng))
      );
    } else if (generatedRoute.stops.length >= 2) {
      if (generatedRoute.origin.lat && generatedRoute.origin.lng) {
        path.push(
          new window.kakao.maps.LatLng(generatedRoute.origin.lat, generatedRoute.origin.lng)
        );
      }
      generatedRoute.stops.forEach((s) =>
        path.push(new window.kakao.maps.LatLng(s.lat, s.lng))
      );
    }
    if (path.length < 2) return;
    const line = new window.kakao.maps.Polyline({
      path,
      strokeWeight: 4,
      strokeColor: '#1f2937',
      strokeOpacity: 0.85,
      strokeStyle: 'solid',
    });
    line.setMap(mapRef.current);
    polylineRef.current = line;

    if (fitRouteBounds) {
      const bounds = new window.kakao.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      mapRef.current.setBounds(bounds);
    }
  }, [generatedRoute, fitRouteBounds]);

  return (
    <div
      ref={mapEl}
      className={`map-canvas ${pickingOriginFromMap || pickingPinFromMap ? 'picking' : ''}`}
      role="application"
      aria-label="지도"
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
