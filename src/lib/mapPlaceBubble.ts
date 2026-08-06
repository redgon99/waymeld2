import type { Place } from '../types';
import { iconSvgMarkup } from '../icons/waymeld-icons';
import { buildPlaceMapLinks } from './mapLinks';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 구글맵 POI 말풍선과 유사한 상세 보기 링크 */
export function getPlaceDetailUrl(place: Place): string {
  if (place.placeUrl?.trim()) return place.placeUrl.trim();
  const links = buildPlaceMapLinks({
    name: place.nameKo ?? place.name,
    lat: place.lat,
    lng: place.lng,
    address: place.roadAddress || place.address,
  });
  return links.kakao;
}

function bubbleInnerHtml(place: Place): string {
  const addr = place.roadAddress || place.address || '';
  const detailUrl = getPlaceDetailUrl(place);
  return `
    <div class="map-place-bubble-card">
      <div class="map-place-bubble-text">
        <div class="map-place-bubble-title">${escapeHtml(place.name)}</div>
        ${
          addr
            ? `<div class="map-place-bubble-addr">${escapeHtml(addr)}</div>`
            : ''
        }
      </div>
      <a
        class="map-place-bubble-link"
        href="${escapeHtml(detailUrl)}"
        target="_blank"
        rel="noopener noreferrer"
        title="상세 정보 보기"
        aria-label="상세 정보 보기"
      >
        ${iconSvgMarkup('externalLink', { size: 16, color: '#fff' })}
      </a>
    </div>
    <div class="map-place-bubble-tail" aria-hidden="true"></div>
  `;
}

/** 구글맵 스타일 대상물 상세 말풍선 (카카오 CustomOverlay용 DOM) */
export function createMapPlaceBubbleElement(
  place: Place,
  opts?: { onClose?: () => void }
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'map-place-bubble';
  root.innerHTML = bubbleInnerHtml(place);

  root.querySelector('.map-place-bubble-link')?.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  root.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  // 말풍선 바깥 클릭 닫기는 지도 click 리스너에서 처리
  void opts;

  return root;
}

/** GoogleHtmlMarker용 HTML 문자열 */
export function createMapPlaceBubbleHtml(place: Place): string {
  return `<div class="map-place-bubble">${bubbleInnerHtml(place)}</div>`;
}
