import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';
import { loadGoogleMapsSdk, getGoogleMapsApiKey } from '../lib/googleMaps';
import { fetchTrailGpxRoute, type TourTrailCourse } from '../lib/tourInfo';

interface Props {
  course: TourTrailCourse | null;
  onClose: () => void;
}

export function TrailRouteModal({ course, onClose }: Props) {
  const { t } = useTranslation('korInfo');
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!course) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [course, onClose]);

  useEffect(() => {
    if (!course?.gpxUrl || !mapEl.current) return;
    let alive = true;
    mapRef.current = null;
    setLoading(true);
    setError(null);

    (async () => {
      const apiKey = getGoogleMapsApiKey();
      if (!apiKey) throw new Error(t('trails.mapNotConfigured'));
      const [google, { points }] = await Promise.all([
        loadGoogleMapsSdk(apiKey),
        fetchTrailGpxRoute(course.gpxUrl!),
      ]);
      if (!alive || !mapEl.current) return;
      if (points.length < 2) throw new Error(t('trails.routeUnavailable'));

      const map = new google.maps.Map(mapEl.current, {
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      });
      mapRef.current = map;

      new google.maps.Polyline({
        map,
        path: points,
        strokeColor: '#1f2937',
        strokeOpacity: 0.9,
        strokeWeight: 4,
      });

      const first = points[0];
      const last = points[points.length - 1];
      new google.maps.Marker({
        map,
        position: first,
        label: { text: t('trails.start'), fontSize: '11px', fontWeight: '700' },
      });
      new google.maps.Marker({
        map,
        position: last,
        label: { text: t('trails.finish'), fontSize: '11px', fontWeight: '700' },
      });

      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds);
    })()
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : t('trails.routeUnavailable'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [course, t]);

  if (!course) return null;

  return (
    <div className="trail-route-overlay" role="dialog" aria-modal="true" aria-label={course.name} onClick={onClose}>
      <div className="trail-route-panel" onClick={(e) => e.stopPropagation()}>
        <header className="trail-route-header">
          <span>{course.name}</span>
          <button type="button" className="trail-route-close" onClick={onClose} aria-label={t('trails.close')}>
            <Icon name="close" size={18} />
          </button>
        </header>
        {loading && <p className="guides-muted">{t('list.loading')}</p>}
        {error && <p className="guides-error">{error}</p>}
        <div ref={mapEl} className="trail-route-map" style={{ display: error ? 'none' : 'block' }} />
      </div>
    </div>
  );
}
