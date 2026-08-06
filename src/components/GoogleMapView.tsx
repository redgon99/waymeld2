import { useEffect, useRef } from 'react';
import type { Place, PinnedPlace, GeneratedRoute, Origin, SimpleCategory } from '../types';
import { getCategoryMeta } from '../lib/categories';
import { reverseGeocodeWithGoogle } from '../lib/googleMaps';
import { GoogleHtmlMarker } from '../lib/googleHtmlMarker';
import {
  renderPlaceMarkerHtml,
  renderSearchCenterMarkerHtml,
} from '../lib/mapMarkers';
import { createMapPlaceBubbleHtml } from '../lib/mapPlaceBubble';
import { kakaoLevelToGoogleZoom, googleZoomToKakaoLevel } from '../lib/mapZoom';

interface Props {
  mapsReady?: boolean;
  center: { lat: number; lng: number };
  level?: number;
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
  onMapRightClick?: (lat: number, lng: number, clientX: number, clientY: number) => void;
  onMapCenterChange?: (lat: number, lng: number) => void;
  onMapLevelChange?: (level: number) => void;
  infoWindowPlace?: Place | null;
  onCloseInfoWindow?: () => void;
  fitRouteBounds?: boolean;
  fitSearchBounds?: boolean;
  highlightPlaceId?: string | null;
  onHoverSearchPlace?: (place: Place) => void;
  pinSelectionFilter?: ReadonlySet<string>;
  plazaMarkers?: ReadonlyArray<{ id: string; lat: number; lng: number; title: string }>;
  highlightPlazaId?: string | null;
  onPlazaMarkerClick?: (id: string) => void;
}

function levelToZoom(level: number) {
  // 상세(≤3, ~50m)는 축척 맞춤, 그 외는 기존 개요 매핑 유지
  if (level <= 3) return kakaoLevelToGoogleZoom(level);
  return Math.max(3, Math.min(18, 15 - level));
}

export function GoogleMapView({
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
  onMapRightClick,
  onMapCenterChange,
  onMapLevelChange,
  infoWindowPlace = null,
  onCloseInfoWindow,
  fitRouteBounds = false,
  fitSearchBounds = false,
  highlightPlaceId = null,
  onHoverSearchPlace,
  pinSelectionFilter,
  plazaMarkers = [],
  highlightPlazaId = null,
  onPlazaMarkerClick,
}: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const placeMarkersRef = useRef<GoogleHtmlMarker[]>([]);
  const routeLineRef = useRef<any>(null);
  const originMarkerRef = useRef<any>(null);
  const searchCenterMarkerRef = useRef<any>(null);
  const draftPinRef = useRef<any>(null);
  const listenersRef = useRef<any[]>([]);
  const selectPlaceRef = useRef(onSelectPlace);
  const pinnedClickRef = useRef(onPinnedMarkerClick);
  const hoverSearchRef = useRef(onHoverSearchPlace);
  selectPlaceRef.current = onSelectPlace;
  pinnedClickRef.current = onPinnedMarkerClick;
  hoverSearchRef.current = onHoverSearchPlace;
  const infoBubbleRef = useRef<GoogleHtmlMarker | null>(null);

  const pinSelectionActive = pinSelectionFilter != null && pinSelectionFilter.size > 0;
  let visiblePinned = pinCategoryFilter
    ? pinned.filter((p) => getCategoryMeta(p.categoryCode).category === pinCategoryFilter)
    : pinned;
  if (pinSelectionActive) {
    visiblePinned = visiblePinned.filter((p) => pinSelectionFilter!.has(p.id));
  }

  useEffect(() => {
    if (!mapsReady || !mapEl.current || !window.google?.maps) return;
    if (mapRef.current) return;
    mapRef.current = new window.google.maps.Map(mapEl.current, {
      center,
      zoom: levelToZoom(level),
      streetViewControl: false,
      mapTypeControl: false,
      fullscreenControl: false,
    });
    return () => {
      markersRef.current.forEach((m) => {
        try {
          m.setMap(null);
        } catch {
          /* ignore */
        }
      });
      markersRef.current = [];
      for (const ref of [
        routeLineRef,
        originMarkerRef,
        searchCenterMarkerRef,
        draftPinRef,
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
      listenersRef.current.forEach((l) => l.remove?.());
      listenersRef.current = [];
      infoBubbleRef.current?.setMap(null);
      infoBubbleRef.current = null;
      mapRef.current = null;
      if (mapEl.current) mapEl.current.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setCenter(center);
  }, [center.lat, center.lng]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setZoom(levelToZoom(level));
  }, [level, levelTick]);

  useEffect(() => {
    if (!mapRef.current) return;
    listenersRef.current.forEach((l) => l.remove?.());
    listenersRef.current = [];
    if (onMapCenterChange) {
      listenersRef.current.push(
        mapRef.current.addListener('dragend', () => {
          const c = mapRef.current.getCenter();
          onMapCenterChange(c.lat(), c.lng());
        })
      );
    }
    listenersRef.current.push(
      mapRef.current.addListener('zoom_changed', () => {
        const z = mapRef.current.getZoom();
        if (typeof z === 'number') onMapLevelChange?.(googleZoomToKakaoLevel(z));
        if (onMapCenterChange) {
          const c = mapRef.current.getCenter();
          onMapCenterChange(c.lat(), c.lng());
        }
      })
    );
    if (onCloseInfoWindow && !pickingOriginFromMap && !pickingPinFromMap) {
      listenersRef.current.push(
        mapRef.current.addListener('click', () => onCloseInfoWindow())
      );
    }
    if (pickingOriginFromMap || pickingPinFromMap) {
      listenersRef.current.push(
        mapRef.current.addListener('click', async (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          let addr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          try {
            addr = await reverseGeocodeWithGoogle(lat, lng);
          } catch {
            // noop
          }
          if (pickingOriginFromMap) onOriginPicked?.(lat, lng, addr);
          else onPinLocationPicked?.(lat, lng, addr);
        })
      );
    }
    if (onMapRightClick && !pickingOriginFromMap && !pickingPinFromMap) {
      listenersRef.current.push(
        mapRef.current.addListener('rightclick', (e: any) => {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          const ev = e.domEvent as MouseEvent | undefined;
          onMapRightClick(lat, lng, ev?.clientX ?? 0, ev?.clientY ?? 0);
        })
      );
    }
    return () => {
      listenersRef.current.forEach((l) => l.remove?.());
      listenersRef.current = [];
    };
  }, [
    onMapCenterChange,
    onMapLevelChange,
    onMapRightClick,
    pickingOriginFromMap,
    pickingPinFromMap,
    onOriginPicked,
    onPinLocationPicked,
    onCloseInfoWindow,
  ]);

  useEffect(() => {
    if (!mapRef.current) return;
    infoBubbleRef.current?.setMap(null);
    infoBubbleRef.current = null;
    if (!infoWindowPlace) return;
    infoBubbleRef.current = new GoogleHtmlMarker(
      mapRef.current,
      { lat: infoWindowPlace.lat, lng: infoWindowPlace.lng },
      createMapPlaceBubbleHtml(infoWindowPlace),
      1.28,
      undefined,
      2000
    );
  }, [infoWindowPlace]);

  useEffect(() => {
    if (!mapRef.current) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    placeMarkersRef.current = [];

    if (plazaMarkers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      plazaMarkers.forEach((m) => {
        const marker = new window.google.maps.Marker({
          map: mapRef.current,
          position: { lat: m.lat, lng: m.lng },
          title: m.title,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: highlightPlazaId === m.id ? '#dc2626' : '#2563eb',
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: highlightPlazaId === m.id ? 9 : 7,
          },
        });
        marker.addListener('click', () => onPlazaMarkerClick?.(m.id));
        markersRef.current.push(marker);
        bounds.extend(marker.getPosition());
      });
      if (plazaMarkers.length >= 2) mapRef.current.fitBounds(bounds);
      return;
    }

    const pinnedMap = new Map(visiblePinned.map((p) => [p.id, p]));
    const resultsForMarkers = pinSelectionActive ? [] : searchResults;
    const searchIdSet = new Set(resultsForMarkers.map((s) => s.id));
    const places: Array<Place & { _pinned?: PinnedPlace }> = [
      ...resultsForMarkers.map((s) => ({ ...s, _pinned: pinnedMap.get(s.id) })),
      ...visiblePinned
        .filter((p) => !resultsForMarkers.some((s) => s.id === p.id))
        .map((p) => ({ ...p, _pinned: p })),
    ];

    places.forEach((place) => {
      const isPinned = !!place._pinned;
      const isSearchResult = searchIdSet.has(place.id);
      const marker = new GoogleHtmlMarker(
        mapRef.current,
        { lat: place.lat, lng: place.lng },
        renderPlaceMarkerHtml({
          place,
          pinned: place._pinned,
          isSelected: false,
        }),
        1,
        {
          placeId: place.id,
          zIndex: isPinned ? 500 : 200,
          onClick: () => {
            if (isPinned) pinnedClickRef.current?.(place);
            else selectPlaceRef.current?.(place);
          },
          onMouseEnter: isSearchResult
            ? () => hoverSearchRef.current?.(place)
            : undefined,
        }
      );
      markersRef.current.push(marker);
      placeMarkersRef.current.push(marker);
    });
  }, [
    searchResults,
    visiblePinned,
    pinSelectionActive,
    plazaMarkers,
    highlightPlazaId,
    onPlazaMarkerClick,
  ]);

  useEffect(() => {
    placeMarkersRef.current.forEach((marker) => {
      marker.setSelected(marker.placeId === highlightPlaceId);
    });
  }, [highlightPlaceId, searchResults, visiblePinned, pinSelectionActive]);

  useEffect(() => {
    if (!mapRef.current) return;
    originMarkerRef.current?.setMap(null);
    originMarkerRef.current = null;
    if (origin?.lat && origin?.lng) {
      originMarkerRef.current = new window.google.maps.Marker({
        map: mapRef.current,
        position: { lat: origin.lat, lng: origin.lng },
        title: '출발지',
        icon: {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          fillColor: '#2563eb',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 1.5,
          scale: 5,
        },
      });
    }
  }, [origin?.lat, origin?.lng]);

  useEffect(() => {
    if (!mapRef.current) return;
    searchCenterMarkerRef.current?.setMap(null);
    searchCenterMarkerRef.current = null;
    if (!nearbySearchCenter) return;
    searchCenterMarkerRef.current = new GoogleHtmlMarker(
      mapRef.current,
      nearbySearchCenter,
      renderSearchCenterMarkerHtml(),
      0.5
    );
  }, [nearbySearchCenter?.lat, nearbySearchCenter?.lng]);

  useEffect(() => {
    if (!mapRef.current) return;
    draftPinRef.current?.setMap(null);
    draftPinRef.current = null;
    if (!draftPinLocation) return;
    draftPinRef.current = new window.google.maps.Marker({
      map: mapRef.current,
      position: draftPinLocation,
      title: '선택 위치',
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        fillColor: '#1f2937',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        scale: 8,
      },
    });
  }, [draftPinLocation?.lat, draftPinLocation?.lng]);

  useEffect(() => {
    if (!mapRef.current) return;
    routeLineRef.current?.setMap(null);
    routeLineRef.current = null;
    if (!generatedRoute) return;
    const path: Array<{ lat: number; lng: number }> = [];
    if (generatedRoute.routePath?.length) {
      generatedRoute.routePath.forEach((p) => path.push({ lat: p.lat, lng: p.lng }));
    } else if (generatedRoute.stops.length >= 2) {
      if (generatedRoute.origin.lat && generatedRoute.origin.lng) {
        path.push({ lat: generatedRoute.origin.lat, lng: generatedRoute.origin.lng });
      }
      generatedRoute.stops.forEach((s) => path.push({ lat: s.lat, lng: s.lng }));
    }
    if (path.length < 2) return;
    routeLineRef.current = new window.google.maps.Polyline({
      map: mapRef.current,
      path,
      strokeColor: '#1f2937',
      strokeOpacity: 0.85,
      strokeWeight: 4,
    });
    if (fitRouteBounds) {
      const bounds = new window.google.maps.LatLngBounds();
      path.forEach((p) => bounds.extend(p));
      mapRef.current.fitBounds(bounds);
    }
  }, [generatedRoute, fitRouteBounds]);

  useEffect(() => {
    if (!mapRef.current || !fitSearchBounds || searchResults.length < 2) return;
    const bounds = new window.google.maps.LatLngBounds();
    searchResults.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    mapRef.current.fitBounds(bounds);
  }, [searchResults, fitSearchBounds]);

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
