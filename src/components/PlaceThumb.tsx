import { useEffect, useState } from 'react';
import type { Place } from '../types';
import { Icon } from './Icon';
import { getCategoryMeta } from '../lib/categories';
import { proxiedThumbnailUrl } from '../lib/kakaoPlaceApi';

interface Props {
  place: Place;
  isClosed?: boolean;
  onOpenPhotos: (place: Place) => void;
}

export function PlaceThumb({ place, isClosed = false, onOpenPhotos }: Props) {
  const meta = getCategoryMeta(place.categoryCode);
  const borderColor = isClosed ? '#9ca3af' : meta.bgColor;
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [place.id, place.thumbnailUrl]);

  const thumbSrc = proxiedThumbnailUrl(place.thumbnailUrl);
  const showImage = Boolean(thumbSrc) && !imgFailed;

  return (
    <button
      type="button"
      className="result-thumb"
      style={{ borderColor, boxShadow: `0 0 0 1px ${borderColor}33` }}
      onClick={(e) => {
        e.stopPropagation();
        onOpenPhotos(place);
      }}
      title={`${place.name} 사진 보기`}
      aria-label={`${place.name} 사진 보기`}
    >
      {showImage ? (
        <img
          src={thumbSrc}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <span
          className="result-thumb-fallback"
          style={{ background: isClosed ? '#e5e7eb' : meta.bgColor }}
        >
          <Icon
            name={meta.icon}
            size={22}
            style={{ color: isClosed ? '#6b7280' : meta.iconColor }}
          />
        </span>
      )}
      <span className="result-thumb-badge" aria-hidden="true">
        <Icon name="photo" size={14} />
      </span>
    </button>
  );
}
