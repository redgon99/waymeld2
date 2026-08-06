import { Icon } from './Icon';
import { useEffect, useState } from 'react';
import type { Place } from '../types';
import { buildKakaoPhotosUrl } from '../lib/kakaoPlaceUrls';
import { proxiedThumbnailUrl } from '../lib/kakaoPlaceApi';
import {
  fetchPlacePanelDetail,
  type PlacePanelTab,
  type PlacePanelTabId,
} from '../lib/placePanelTabs';
import { googlePlaceDetailModalPayload } from '../lib/googlePlaceDetail';
import { fetchGooglePlaceDetail } from '../lib/googleMaps';
import { PlaceDetailTabPanel } from './PlaceDetailTabPanels';
import { PlaceActionBar } from './PlaceActionBar';

interface Props {
  open: boolean;
  place: Place | null;
  onClose: () => void;
  onShowTaxiCard?: (place: Place) => void;
}

export function PlacePhotosModal({ open, place, onClose, onShowTaxiCard }: Props) {
  const [tabs, setTabs] = useState<PlacePanelTab[]>([
    { id: 'PHOTO', label: '사진' },
    { id: 'SUMMARY', label: '요약' },
  ]);
  const [activeTab, setActiveTab] = useState<PlacePanelTabId>('PHOTO');
  const [panel, setPanel] = useState<Record<string, unknown> | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isGooglePlace = Boolean(place?.id?.startsWith('g:'));

  useEffect(() => {
    if (!open || !place) {
      setTabs([
        { id: 'PHOTO', label: '사진' },
        { id: 'SUMMARY', label: '요약' },
      ]);
      setActiveTab('PHOTO');
      setPanel(null);
      setPhotos([]);
      setActiveIndex(0);
      setLoading(false);
      setPhotoError(false);
      setLightboxOpen(false);
      return;
    }

    const fallback = place.thumbnailUrl
      ? [proxiedThumbnailUrl(place.thumbnailUrl) ?? place.thumbnailUrl]
      : [];

    setTabs([
      { id: 'PHOTO', label: '사진' },
      { id: 'SUMMARY', label: '요약' },
    ]);
    setActiveTab('PHOTO');
    setPhotos(fallback);
    setActiveIndex(0);
    setPhotoError(false);
    setLoading(true);

    let cancelled = false;
    const load = isGooglePlace
      ? fetchGooglePlaceDetail(place).then((detail) =>
          googlePlaceDetailModalPayload(detail, place.placeUrl)
        )
      : fetchPlacePanelDetail(place.id).then((detail) => ({
          ...detail,
          placeUrl: place.placeUrl,
        }));

    load.then(({ panel: p, tabs: t, photos: urls, placeUrl }) => {
      if (cancelled) return;
      setPanel(placeUrl ? { ...(p ?? {}), place_url: placeUrl } : p);
      setTabs(
        t.length > 0
          ? t
          : [
              { id: 'PHOTO', label: '사진' },
              { id: 'SUMMARY', label: '요약' },
            ]
      );
      setLoading(false);
      if (urls.length > 0) {
        setPhotos(urls);
        setActiveIndex(0);
      } else if (fallback.length === 0) {
        setPhotoError(true);
      }
    }).catch(() => {
      if (cancelled) return;
      setLoading(false);
      if (fallback.length === 0) setPhotoError(true);
    });

    return () => {
      cancelled = true;
    };
  }, [open, place?.id, place?.thumbnailUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false);
        } else {
          onClose();
        }
        return;
      }
      if (activeTab !== 'PHOTO' || photos.length === 0) return;
      if (e.key === 'ArrowLeft') {
        setActiveIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === 'ArrowRight') {
        setActiveIndex((i) => Math.min(photos.length - 1, i + 1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, lightboxOpen, photos.length, activeTab]);

  const openLightbox = () => {
    if (photos.length > 0 && photos[activeIndex]) setLightboxOpen(true);
  };

  if (!open || !place) return null;

  const placeExternalUrl = isGooglePlace
    ? (panel?.place_url as string | undefined) ??
      place.placeUrl ??
      `https://www.google.com/maps/place/?q=place_id:${place.id.replace(/^g:/, '')}`
    : place.photosUrl ?? buildKakaoPhotosUrl(place.id, place.placeUrl);
  const active = photos[activeIndex];
  const isPhotoTab = activeTab === 'PHOTO';

  return (
    <div
      className="photos-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${place.name} 상세`}
      onClick={onClose}
    >
      <div className="photos-panel place-detail-panel" onClick={(e) => e.stopPropagation()}>
        <header className="photos-header place-detail-header">
          <span className="photos-title">{place.name}</span>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            <Icon name="close" />
          </button>
        </header>

        <nav className="place-detail-tabs" role="tablist" aria-label="장소 정보 탭">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              className={`place-detail-tab ${activeTab === tab.id ? 'active' : ''}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div
          className={`place-detail-body ${isPhotoTab ? 'place-detail-body-photos' : ''}`}
          role="tabpanel"
        >
          {loading && isPhotoTab && photos.length === 0 && (
            <p className="photos-status">불러오는 중…</p>
          )}

          {isPhotoTab ? (
            <>
              {photoError && !loading && (
                <div className="photos-empty">
                  <p>표시할 사진이 없습니다.</p>
                  <a href={placeExternalUrl} target="_blank" rel="noopener noreferrer">
                    {isGooglePlace ? 'Google 지도에서 확인' : '카카오맵에서 확인'}
                  </a>
                </div>
              )}
              {active && (
                <div className="photos-main">
                  <button
                    type="button"
                    className="photos-main-zoom"
                    onClick={openLightbox}
                    aria-label={`${place.name} 사진 크게 보기`}
                  >
                    <img
                      key={active}
                      src={active}
                      alt=""
                      className="photos-main-img"
                      referrerPolicy="no-referrer"
                    />
                    <span className="photos-zoom-hint" aria-hidden="true">
                      <Icon name="zoomIn" />
                      크게 보기
                    </span>
                  </button>
                  {photos.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="photos-nav photos-nav-prev"
                        disabled={activeIndex <= 0}
                        onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                        aria-label="이전 사진"
                      >
                        <Icon name="chevronLeft" />
                      </button>
                      <button
                        type="button"
                        className="photos-nav photos-nav-next"
                        disabled={activeIndex >= photos.length - 1}
                        onClick={() =>
                          setActiveIndex((i) => Math.min(photos.length - 1, i + 1))
                        }
                        aria-label="다음 사진"
                      >
                        <Icon name="chevronRight" />
                      </button>
                      <span className="photos-counter">
                        {activeIndex + 1} / {photos.length}
                      </span>
                    </>
                  )}
                </div>
              )}
              {photos.length > 1 && (
                <div className="photos-thumbs" role="list">
                  {photos.map((url, i) => (
                    <button
                      key={`${url}-${i}`}
                      type="button"
                      role="listitem"
                      className={`photos-thumb ${i === activeIndex ? 'active' : ''}`}
                      onClick={() => setActiveIndex(i)}
                      aria-label={`${i + 1}번째 사진`}
                      aria-current={i === activeIndex}
                    >
                      <img src={url} alt="" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="place-detail-tab-scroll">
              {loading && !panel ? (
                <p className="photos-status">정보 불러오는 중…</p>
              ) : (
                <PlaceDetailTabPanel tabId={activeTab} panel={panel} place={place} />
              )}
            </div>
          )}
        </div>

        <PlaceActionBar
          place={place}
          onShowTaxiCard={onShowTaxiCard ? () => onShowTaxiCard(place) : undefined}
        />
        <footer className="photos-footer">
          <a href={placeExternalUrl} target="_blank" rel="noopener noreferrer">
            {isGooglePlace ? 'Google 지도에서 더보기' : '카카오맵에서 더보기'}
            <Icon name="externalLink" />
          </a>
        </footer>
      </div>

      {lightboxOpen && active && (
        <div
          className="photo-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="사진 크게 보기"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="photo-lightbox-close"
            onClick={() => setLightboxOpen(false)}
            aria-label="크게 보기 닫기"
          >
            <Icon name="close" />
          </button>
          {photos.length > 1 && (
            <>
              <button
                type="button"
                className="photo-lightbox-nav photo-lightbox-nav-prev"
                disabled={activeIndex <= 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((i) => Math.max(0, i - 1));
                }}
                aria-label="이전 사진"
              >
                <Icon name="chevronLeft" />
              </button>
              <button
                type="button"
                className="photo-lightbox-nav photo-lightbox-nav-next"
                disabled={activeIndex >= photos.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIndex((i) => Math.min(photos.length - 1, i + 1));
                }}
                aria-label="다음 사진"
              >
                <Icon name="chevronRight" />
              </button>
              <span className="photo-lightbox-counter">
                {activeIndex + 1} / {photos.length}
              </span>
            </>
          )}
          <img
            src={active}
            alt={`${place.name} 사진 ${activeIndex + 1}`}
            className="photo-lightbox-img"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
