import type { Place } from '../types';
import { iconSvgMarkup } from '../icons/waymeld-icons';
import { getCategoryMeta } from './categories';
import { proxiedThumbnailUrl } from './kakaoPlaceApi';
import { buildPlaceMapLinks } from './mapLinks';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function createMapInfoCardElement(
  place: Place,
  opts: {
    isPinned: boolean;
    isClosed: boolean;
    onClose: () => void;
    onTogglePin: () => void;
    onRoadview?: () => void;
    onOpenPlacePhotos?: () => void;
    onShowTaxiCard?: () => void;
  }
): HTMLElement {
  const meta = getCategoryMeta(place.categoryCode, place.category);
  const borderColor = opts.isClosed ? '#9ca3af' : meta.bgColor;
  const thumbSrc = proxiedThumbnailUrl(place.thumbnailUrl);
  const addr = place.roadAddress || place.address;
  const koName = place.nameKo ?? place.name;
  const links = buildPlaceMapLinks({
    name: koName,
    lat: place.lat,
    lng: place.lng,
    address: addr,
  });

  const root = document.createElement('div');
  root.className = 'map-info-card';
  root.innerHTML = `
    <button type="button" class="map-info-close" aria-label="닫기">
      ${iconSvgMarkup('close', { size: 16 })}
    </button>
    <div class="map-info-card-body result-item ${opts.isPinned ? 'pinned' : ''} ${opts.isClosed ? 'closed' : ''}">
      <button
        type="button"
        class="result-thumb map-info-thumb"
        style="border-color:${borderColor};box-shadow:0 0 0 1px ${borderColor}33"
        title="${escapeHtml(place.name)} 사진 보기"
        aria-label="${escapeHtml(place.name)} 사진 보기"
      >
        ${
          thumbSrc
            ? `<img src="${escapeHtml(thumbSrc)}" alt="" referrerpolicy="no-referrer" />`
            : `<span class="result-thumb-fallback" style="background:${opts.isClosed ? '#e5e7eb' : meta.bgColor}">
                ${iconSvgMarkup(meta.icon, {
                  size: 22,
                  color: opts.isClosed ? '#6b7280' : meta.iconColor,
                })}
               </span>`
        }
        <span class="result-thumb-badge" aria-hidden="true">
          ${iconSvgMarkup('photo', { size: 14 })}
        </span>
      </button>
      <div class="result-body">
        <div class="result-name-row">
          <span class="result-name ${opts.isClosed ? 'strike' : ''}">${escapeHtml(place.name)}</span>
        </div>
        <div class="result-meta">
          ${place.categoryLabel ? `<span class="result-cat-badge">${escapeHtml(place.categoryLabel)}</span>` : ''}
          ${place.categoryDetail ? `<span class="result-cat-detail">${escapeHtml(place.categoryDetail)}</span>` : ''}
          ${
            place.rating != null
              ? `<span class="result-rating">★ ${place.rating.toFixed(1)}${
                  place.reviewCount != null ? ` · ${place.reviewCount}` : ''
                }</span>`
              : ''
          }
          ${addr ? `<span class="result-addr">${escapeHtml(addr)}</span>` : ''}
        </div>
        ${
          place.rating != null && place.rating >= 4
            ? `<div class="traveler-insight-box map-info-insight">
                <div class="traveler-insight-label">✦ TRAVELER INSIGHT</div>
                <div class="traveler-insight-text">Highly rated by travelers · 여행자 평점이 높은 장소입니다.</div>
               </div>`
            : place.rating != null && place.rating < 3.2
              ? `<div class="traveler-insight-box map-info-insight">
                <div class="traveler-insight-label">✦ TRAVELER INSIGHT</div>
                <div class="traveler-insight-text">Mixed recent reviews — check hours & payment · 최근 후기를 확인해 보세요.</div>
               </div>`
              : ''
        }
      </div>
      ${
        addr || opts.onShowTaxiCard
          ? `<div class="map-info-quick">
              ${
                addr
                  ? `<button type="button" class="map-info-quick-btn" data-copy="${escapeHtml(addr)}" title="주소 복사">
                      ${iconSvgMarkup('note', { size: 14 })} 주소
                     </button>`
                  : ''
              }
              ${
                opts.onShowTaxiCard
                  ? `<button type="button" class="map-info-quick-btn map-info-taxi" title="택시 카드">
                      ${iconSvgMarkup('transportCar', { size: 14 })} Taxi
                     </button>`
                  : ''
              }
              <a class="map-info-quick-btn" href="${links.kakao}" target="_blank" rel="noopener noreferrer">K</a>
              <a class="map-info-quick-btn" href="${links.naver}" target="_blank" rel="noopener noreferrer">N</a>
              <a class="map-info-quick-btn" href="${links.google}" target="_blank" rel="noopener noreferrer">G</a>
            </div>`
          : ''
      }
      <div class="result-actions map-info-actions">
        ${
          opts.onRoadview
            ? `<button type="button" class="result-aux-btn result-roadview-btn map-info-roadview" title="로드뷰" aria-label="로드뷰">
                ${iconSvgMarkup('roadview', { size: 18 })}
               </button>`
            : ''
        }
        <button type="button" class="pin-btn map-info-pin ${opts.isPinned ? 'pinned' : ''}" ${opts.isClosed ? 'disabled' : ''}>
          ${
            opts.isPinned
              ? `${iconSvgMarkup('check', { size: 16 })} 핀업됨`
              : `${iconSvgMarkup('pinPlus', { size: 18 })} 핀업`
          }
        </button>
      </div>
    </div>
  `;

  root.querySelector('.map-info-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    opts.onClose();
  });
  root.querySelector('.map-info-pin')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!opts.isClosed) opts.onTogglePin();
  });
  root.querySelector('.map-info-roadview')?.addEventListener('click', (e) => {
    e.stopPropagation();
    opts.onRoadview?.();
  });
  root.querySelector('.map-info-thumb')?.addEventListener('click', (e) => {
    e.stopPropagation();
    opts.onOpenPlacePhotos?.();
  });
  root.querySelector('.map-info-taxi')?.addEventListener('click', (e) => {
    e.stopPropagation();
    opts.onShowTaxiCard?.();
  });
  root.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = btn.getAttribute('data-copy');
      if (text) void navigator.clipboard.writeText(text);
    });
  });
  root.addEventListener('click', (e) => e.stopPropagation());

  return root;
}
