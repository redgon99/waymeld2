import { useEffect } from 'react';
import { Icon } from './Icon';
import type { TripMaterial } from '../types';

interface Props {
  materials: TripMaterial[];
  index: number;
  signedUrls: Record<string, string>;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export function MaterialsPhotoGallery({
  materials,
  index,
  signedUrls,
  onClose,
  onIndexChange,
}: Props) {
  const current = materials[index];
  const url = current ? signedUrls[current.id] : undefined;
  const canPrev = index > 0;
  const canNext = index < materials.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && canPrev) onIndexChange(index - 1);
      if (e.key === 'ArrowRight' && canNext) onIndexChange(index + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, canPrev, canNext, onClose, onIndexChange]);

  if (!current || !url) return null;

  return (
    <div
      className="photo-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="사진 보기"
      onClick={onClose}
    >
      <button
        type="button"
        className="photo-lightbox-close"
        onClick={onClose}
        aria-label="닫기"
      >
        <Icon name="close" />
      </button>

      {materials.length > 1 && (
        <>
          <button
            type="button"
            className="photo-lightbox-nav photo-lightbox-nav-prev"
            disabled={!canPrev}
            aria-label="이전 사진"
            onClick={(e) => {
              e.stopPropagation();
              if (canPrev) onIndexChange(index - 1);
            }}
          >
            <Icon name="chevronLeft" />
          </button>
          <button
            type="button"
            className="photo-lightbox-nav photo-lightbox-nav-next"
            disabled={!canNext}
            aria-label="다음 사진"
            onClick={(e) => {
              e.stopPropagation();
              if (canNext) onIndexChange(index + 1);
            }}
          >
            <Icon name="chevronRight" />
          </button>
          <div className="photo-lightbox-counter" onClick={(e) => e.stopPropagation()}>
            {index + 1} / {materials.length}
          </div>
        </>
      )}

      <img
        className="photo-lightbox-img"
        src={url}
        alt={current.title}
        onClick={(e) => e.stopPropagation()}
      />
      <p className="photo-lightbox-caption" onClick={(e) => e.stopPropagation()}>
        {current.title}
      </p>
    </div>
  );
}
