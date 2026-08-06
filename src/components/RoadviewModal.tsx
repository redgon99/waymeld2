import { Icon } from './Icon';
import { useEffect, useRef, useState } from 'react';

interface Props {
  open: boolean;
  lat: number;
  lng: number;
  placeName?: string;
  onClose: () => void;
}

export function RoadviewModal({ open, lat, lng, placeName, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) {
      setUnavailable(false);
      setLoading(true);
      return;
    }

    const container = containerRef.current;
    if (!container || !window.kakao?.maps?.Roadview) {
      setUnavailable(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setUnavailable(false);

    const position = new window.kakao.maps.LatLng(lat, lng);
    const roadview = new window.kakao.maps.Roadview(container);
    const client = new window.kakao.maps.RoadviewClient();

    client.getNearestPanoId(position, 80, (panoId: number | null) => {
      if (cancelled) return;
      setLoading(false);
      if (panoId === null) {
        setUnavailable(true);
        return;
      }
      setUnavailable(false);
      roadview.setPanoId(panoId, position);
    });

    return () => {
      cancelled = true;
    };
  }, [open, lat, lng]);

  if (!open) return null;

  const externalUrl = `https://map.kakao.com/link/roadview/${lat},${lng}`;

  return (
    <div className="roadview-overlay" role="dialog" aria-modal="true" aria-label="로드뷰">
      <div className="roadview-panel">
        <header className="roadview-header">
          <span className="roadview-title">
            <Icon name="roadview" /> 로드뷰
            {placeName ? ` · ${placeName}` : ''}
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </header>

        {loading && <p className="roadview-status">로드뷰 불러오는 중…</p>}

        {unavailable && !loading && (
          <div className="roadview-unavailable">
            <p>이 위치 근처에 로드뷰가 없습니다.</p>
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              카카오맵에서 확인
            </a>
          </div>
        )}

        <div
          ref={containerRef}
          className={`roadview-canvas ${unavailable ? 'hidden' : ''}`}
        />
      </div>
    </div>
  );
}
