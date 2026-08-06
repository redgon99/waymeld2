import { useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import type { Place } from '../types';
import { proxiedThumbnailUrl } from '../lib/kakaoPlaceApi';
import { getPanelSummary, hasMenu } from '../lib/placePanelTabs';
import type { PlacePanelTabId } from '../lib/placePanelTabs';
import {
  getBusinessOpenStatus,
  parseClosingAtMs,
  parseOpeningAtMs,
  type BusinessOpenStatus,
} from '../lib/openHoursStatus';
import { OpenStatusBadge } from './OpenStatusBadge';
import { parseStoreFacilities } from '../lib/storeFacilities';
import type { GooglePlaceReview } from '../lib/googlePlaceDetail';

interface TabProps {
  panel: Record<string, unknown> | null;
  place?: Place | null;
}

export function PlaceDetailTabPanel({
  tabId,
  panel,
  place,
}: TabProps & { tabId: PlacePanelTabId }) {
  switch (tabId) {
    case 'SUMMARY':
      return <SummaryTab panel={panel} place={place} />;
    case 'PRODUCT':
      return <MenuTab panel={panel} />;
    case 'REVIEW':
      if (panel?.provider === 'google') return <GoogleReviewTab panel={panel} />;
      return <KakaoReviewTab panel={panel} />;
    case 'MAP':
      if (panel?.provider === 'google') return <GoogleMapTab panel={panel} />;
      return <EmptyTab message="지도 정보가 없습니다." />;
    case 'INFO':
      if (panel?.provider === 'google') return <GoogleInfoTab panel={panel} />;
      return <EmptyTab message="추가 정보가 없습니다." />;
    case 'BLOG':
      return <BlogReviewTab panel={panel} />;
    case 'BOOKING':
      return <BookingTab panel={panel} />;
    case 'NEWS':
      return <NewsTab panel={panel} />;
    case 'SPECIAL':
      return <SpecialTab panel={panel} />;
    case 'RANKING':
      return <RankingTab panel={panel} />;
    case 'HOME':
      return <HomeTab panel={panel} />;
    default:
      return <EmptyTab message="이 탭의 정보를 표시할 수 없습니다." />;
  }
}

function EmptyTab({ message }: { message: string }) {
  return <p className="place-detail-empty">{message}</p>;
}

function SummaryTab({ panel, place }: TabProps) {
  const provider = panel?.provider;
  if (provider === 'google') {
    return <GoogleSummaryTab panel={panel} place={place} />;
  }

  const summary = getPanelSummary(panel);
  const hoursBlock = getOpenHoursBlock(panel);
  const address =
    formatKakaoAddress(summary) ?? place?.roadAddress ?? place?.address;
  const phones = collectPhones(summary, place);
  const links = collectHomepageLinks(summary);
  const storeFacilities = parseStoreFacilities(panel);
  const cardTags = Array.isArray(panel?.panel_card_tags)
    ? (panel.panel_card_tags as string[])
    : [];
  const bizVerified = cardTags.includes('BIZ') && summary?.status === 'Y';
  const daysOff = pickStr(
    hoursBlock?.headline_addition as Record<string, unknown> | undefined,
    'days_off_desc'
  );
  const businessStatus = resolveBusinessStatus(hoursBlock?.headline, place);
  const closesAt =
    businessStatus === 'open' && hoursBlock?.headline
      ? (place?.closesAt ??
        parseClosingAtMs(hoursBlock.headline, hoursBlock.rawHeadline))
      : undefined;
  const opensAt =
    businessStatus === 'scheduled' && hoursBlock?.headline
      ? (place?.opensAt ??
        parseOpeningAtMs(hoursBlock.headline, hoursBlock.rawHeadline))
      : undefined;

  const koName = place?.nameKo ?? place?.name;

  if (!summary && !address && phones.length === 0 && links.length === 0 && !koName) {
    return <EmptyTab message="요약 정보가 없습니다." />;
  }

  return (
    <div className="place-detail-summary">
      {koName && (
        <SummaryRow icon="mapPin" copyText={koName} copyLabel="한국어 이름">
          <p className="place-detail-summary-text place-detail-name-ko">{koName}</p>
        </SummaryRow>
      )}
      {hoursBlock?.headline && (
        <SummaryRow icon="clock">
          <div className="place-detail-summary-hours-wrap">
            {businessStatus && (
              <OpenStatusBadge
                status={businessStatus}
                closesAt={closesAt}
                opensAt={opensAt}
                className="place-detail-open-status"
              />
            )}
            <p className="place-detail-summary-text place-detail-summary-hours-detail">
              {hoursBlock.headline.displayText}
              {hoursBlock.headline.displayTextInfo
                ? ` ${hoursBlock.headline.displayTextInfo}`
                : ''}
            </p>
            {daysOff && <p className="place-detail-summary-sub">{daysOff}</p>}
          </div>
        </SummaryRow>
      )}

      {links.map((link) => (
        <SummaryRow key={link.url} icon="globe">
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            {link.label}
          </a>
        </SummaryRow>
      ))}

      {address && (
        <SummaryRow icon="mapPin" copyText={address} copyLabel="주소">
          <p className="place-detail-summary-text">{address}</p>
        </SummaryRow>
      )}

      {phones.map((tel) => (
        <SummaryRow key={tel} icon="phone" copyText={tel} copyLabel="전화번호">
          <a href={`tel:${tel.replace(/\s/g, '')}`} className="place-detail-summary-text">
            {tel}
          </a>
        </SummaryRow>
      ))}

      {bizVerified && (
        <p className="place-detail-summary-verified">
          <Icon name="check" />
          사업자 정보가 확인된 장소입니다.
        </p>
      )}

      {(storeFacilities.chips.length > 0 || storeFacilities.details.length > 0) && (
        <StoreFacilitySection section={storeFacilities} />
      )}
    </div>
  );
}

function GoogleSummaryTab({ panel, place }: TabProps) {
  const summary = (panel?.summary as Record<string, unknown> | undefined) ?? {};
  const address = pickStr(summary, 'address') ?? place?.roadAddress ?? place?.address;
  const phone = pickStr(summary, 'phone') ?? place?.phone;
  const website = pickStr(summary, 'website');
  const openingText = pickStr(summary, 'openingText');
  const todayHours = pickStr(summary, 'todayHours');
  const openingNowRaw = summary.openingNow;
  const openingNow =
    typeof openingNowRaw === 'boolean'
      ? openingNowRaw
      : openingNowRaw != null
        ? String(openingNowRaw).toLowerCase() === 'true'
        : undefined;
  const openingStatus: BusinessOpenStatus | null =
    openingNow === true ? 'open' : openingNow === false ? 'closed' : null;
  const editorial = pickStr(summary, 'editorialSummary');
  const categoryLabel = pickStr(summary, 'categoryLabel') ?? place?.categoryLabel;
  const priceLevelLabel = pickStr(summary, 'priceLevelLabel');
  const ratingRaw = summary.rating;
  const reviewRaw = summary.reviewCount;
  const rating =
    typeof ratingRaw === 'number'
      ? ratingRaw
      : ratingRaw != null
        ? Number(ratingRaw)
        : place?.rating;
  const reviewCount =
    typeof reviewRaw === 'number'
      ? reviewRaw
      : reviewRaw != null
        ? Number(reviewRaw)
        : place?.reviewCount;
  const hoursDisplay = todayHours ?? openingText;

  if (!address && !phone && !website && !hoursDisplay && rating == null && !editorial) {
    return <EmptyTab message="요약 정보가 없습니다." />;
  }

  return (
    <div className="place-detail-summary place-detail-google-summary">
      {(rating != null && !Number.isNaN(rating)) ||
      categoryLabel ||
      priceLevelLabel ? (
        <div className="place-detail-google-hero">
          {rating != null && !Number.isNaN(rating) && (
            <div className="place-detail-google-rating">
              <span className="place-detail-google-rating-value">{rating.toFixed(1)}</span>
              <span className="place-detail-google-rating-stars" aria-hidden="true">
                <Icon name="star" size={16} />
              </span>
              {reviewCount != null && !Number.isNaN(reviewCount) && (
                <span className="place-detail-google-rating-count">
                  리뷰 {Math.round(reviewCount).toLocaleString()}개
                </span>
              )}
            </div>
          )}
          <div className="place-detail-google-meta-chips">
            {priceLevelLabel && (
              <span className="place-detail-google-chip">{priceLevelLabel}</span>
            )}
            {categoryLabel && (
              <span className="place-detail-google-chip">{categoryLabel}</span>
            )}
          </div>
        </div>
      ) : null}

      {editorial && <p className="place-detail-google-editorial">{editorial}</p>}

      {hoursDisplay && (
        <SummaryRow icon="clock">
          <div className="place-detail-summary-hours-wrap">
            {openingStatus && (
              <OpenStatusBadge
                status={openingStatus}
                className="place-detail-open-status"
              />
            )}
            <p
              className={`place-detail-summary-text place-detail-summary-hours-detail${openingText?.includes('\n') ? ' place-detail-summary-preline' : ''}`}
            >
              {hoursDisplay}
            </p>
          </div>
        </SummaryRow>
      )}

      {address && (
        <SummaryRow icon="mapPin" copyText={address} copyLabel="주소">
          <p className="place-detail-summary-text">{address}</p>
        </SummaryRow>
      )}

      {phone && (
        <SummaryRow icon="phone" copyText={phone} copyLabel="전화번호">
          <a href={`tel:${phone.replace(/\s/g, '')}`} className="place-detail-summary-text">
            {phone}
          </a>
        </SummaryRow>
      )}

      {website && (
        <SummaryRow icon="globe">
          <a href={website} target="_blank" rel="noopener noreferrer">
            {website}
          </a>
        </SummaryRow>
      )}

      {panel?.api_source != null && (
        <p className="place-detail-google-api-note">
          {String(panel.api_source) === 'new' ? 'Places API (New)' : 'Places API'} 데이터
        </p>
      )}
    </div>
  );
}

function GoogleReviewTab({ panel }: TabProps) {
  const summary = (panel?.summary as Record<string, unknown> | undefined) ?? {};
  const reviews = (panel?.reviews as GooglePlaceReview[] | undefined) ?? [];
  const ratingRaw = summary.rating;
  const reviewRaw = summary.reviewCount;
  const rating =
    typeof ratingRaw === 'number' ? ratingRaw : ratingRaw != null ? Number(ratingRaw) : undefined;
  const reviewCount =
    typeof reviewRaw === 'number'
      ? reviewRaw
      : reviewRaw != null
        ? Number(reviewRaw)
        : undefined;

  if (reviews.length === 0 && rating == null) {
    return <EmptyTab message="리뷰가 없습니다." />;
  }

  return (
    <div className="place-detail-google-reviews">
      {rating != null && !Number.isNaN(rating) && (
        <div className="place-detail-google-review-summary">
          <span className="place-detail-google-rating-value">{rating.toFixed(1)}</span>
          <Icon name="star" size={18} />
          {reviewCount != null && !Number.isNaN(reviewCount) && (
            <span className="place-detail-google-rating-count">
              {Math.round(reviewCount).toLocaleString()}개 리뷰
            </span>
          )}
        </div>
      )}
      <ul className="place-detail-google-review-list">
        {reviews.map((r, i) => (
          <li key={`${String(r.authorName)}-${i}`} className="place-detail-google-review-item">
            <div className="place-detail-google-review-head">
              <div className="place-detail-google-review-author">
                {r.profilePhotoUrl ? (
                  <img
                    src={String(r.profilePhotoUrl)}
                    alt=""
                    className="place-detail-google-review-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="place-detail-google-review-avatar-fallback" aria-hidden="true">
                    {(String(r.authorName ?? '?')).charAt(0)}
                  </span>
                )}
                <div>
                  {r.authorUri ? (
                    <a
                      href={String(r.authorUri)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="place-detail-google-review-author"
                    >
                      {String(r.authorName ?? 'Google 사용자')}
                    </a>
                  ) : (
                    <span className="place-detail-google-review-author">
                      {String(r.authorName ?? 'Google 사용자')}
                    </span>
                  )}
                  {r.relativeTime ? (
                    <time className="place-detail-google-review-time">{r.relativeTime}</time>
                  ) : null}
                </div>
              </div>
              {typeof r.rating === 'number' && (
                <span className="place-detail-google-review-stars">
                  {r.rating.toFixed(1)} <Icon name="star" size={12} />
                </span>
              )}
            </div>
            {r.text != null && String(r.text).length > 0 && (
              <p className="place-detail-google-review-body">{String(r.text)}</p>
            )}
          </li>
        ))}
      </ul>
      <footer className="place-detail-google-attribution">
        Google 리뷰 · 일부만 표시됩니다
      </footer>
    </div>
  );
}

function GoogleInfoTab({ panel }: TabProps) {
  const options = (panel?.serviceOptions as Array<{ label?: string; available?: boolean }>) ?? [];
  if (options.length === 0) {
    return <EmptyTab message="표시할 매장 정보가 없습니다." />;
  }

  return (
    <section className="place-detail-google-service-block" aria-label="서비스 옵션">
      <h4 className="place-detail-google-section-title">서비스 옵션</h4>
      <ul className="place-detail-google-service-list">
        {options.map((opt) => (
          <li
            key={String(opt.label)}
            className={`place-detail-google-service-item ${opt.available ? 'available' : 'unavailable'}`}
          >
            <Icon name={opt.available ? 'check' : 'close'} size={14} />
            {String(opt.label ?? '')}
          </li>
        ))}
      </ul>
    </section>
  );
}

function GoogleMapTab({ panel }: TabProps) {
  const mapEmbedUrl = panel?.map_embed_url as string | undefined;
  const placeUrl = panel?.place_url as string | undefined;
  if (!mapEmbedUrl) {
    return <EmptyTab message="지도 미리보기를 사용할 수 없습니다." />;
  }

  return (
    <div className="place-detail-google-map-wrap">
      <iframe
        title="Google 지도"
        className="place-detail-google-map-embed"
        src={mapEmbedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <p className="place-detail-google-map-hint">
        Google Maps Embed · 길찾기·전체 정보는 하단 링크에서 확인하세요
      </p>
      {placeUrl && (
        <a
          href={placeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="place-detail-google-map-link"
        >
          Google 지도에서 열기
          <Icon name="externalLink" size={14} />
        </a>
      )}
    </div>
  );
}

function StoreFacilitySection({
  section,
}: {
  section: ReturnType<typeof parseStoreFacilities>;
}) {
  return (
    <section className="place-detail-store-section" aria-label="매장 정보">
      <h4 className="place-detail-store-title">매장 정보</h4>
      {section.chips.length > 0 && (
        <ul className="place-detail-facility-grid" role="list">
          {section.chips.map((chip) => (
            <li key={chip.key} className="place-detail-facility-chip" role="listitem">
              <span className="place-detail-facility-icon" aria-hidden="true">
                <Icon name={chip.icon} size={28} />
              </span>
              <span className="place-detail-facility-label">{chip.label}</span>
            </li>
          ))}
        </ul>
      )}
      {section.details.length > 0 && (
        <ul className="place-detail-facility-details">
          {section.details.map((row) => (
            <li key={row.key} className="place-detail-facility-detail">
              {row.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SummaryRow({
  icon,
  children,
  copyText,
  copyLabel,
}: {
  icon: 'clock' | 'globe' | 'mapPin' | 'phone';
  children: ReactNode;
  copyText?: string;
  copyLabel?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="place-detail-summary-row">
      <span className="place-detail-summary-icon" aria-hidden="true">
        <Icon name={icon} />
      </span>
      <div className="place-detail-summary-main">{children}</div>
      {copyText && (
        <button
          type="button"
          className="place-detail-copy-btn"
          onClick={() => void handleCopy()}
          aria-label={`${copyLabel ?? '내용'} 복사`}
        >
          {copied ? '복사됨' : '복사'}
        </button>
      )}
    </div>
  );
}

function resolveBusinessStatus(
  headline: { code?: string; displayText: string; displayTextInfo?: string } | undefined,
  place?: Place | null
): BusinessOpenStatus | null {
  const fromHours = getBusinessOpenStatus(headline);
  if (fromHours) return fromHours;
  if (place?.openingStatus === 'open' || place?.isOpenNow === true) return 'open';
  if (place?.openingStatus === 'scheduled') return 'scheduled';
  if (place?.openingStatus === 'closed') return 'closed';
  if (place?.openingStatus === 'offday') return 'offday';
  return null;
}

function getOpenHoursBlock(panel: Record<string, unknown> | null): {
  headline: { code?: string; displayText: string; displayTextInfo?: string };
  rawHeadline?: Record<string, unknown>;
  headline_addition?: Record<string, unknown>;
} | null {
  const summary = getPanelSummary(panel);
  const raw = (panel?.open_hours ?? summary?.open_hours) as
    | Record<string, unknown>
    | undefined;
  if (!raw) return null;
  const headline = raw.headline as Record<string, unknown> | undefined;
  if (!headline?.display_text) return null;
  return {
    headline: {
      code: pickStr(headline, 'code'),
      displayText: String(headline.display_text),
      displayTextInfo: headline.display_text_info
        ? String(headline.display_text_info)
        : undefined,
    },
    rawHeadline: headline,
    headline_addition: raw.headline_addition as Record<string, unknown> | undefined,
  };
}

function formatKakaoAddress(
  summary: Record<string, unknown> | undefined
): string | undefined {
  const addr = summary?.address as Record<string, unknown> | undefined;
  if (!addr) return undefined;
  const base =
    pickStr(addr, 'disp') ?? pickStr(addr, 'road') ?? pickStr(addr, 'jibun');
  if (!base) return undefined;
  const zone = pickStr(addr, 'base_zone_no');
  return zone ? `${base} (우)${zone}` : base;
}

function collectPhones(
  summary: Record<string, unknown> | undefined,
  place?: Place | null
): string[] {
  const fromPanel = (
    (summary?.phone_numbers as Array<{ tel?: string }> | undefined) ?? []
  )
    .map((p) => p.tel?.trim())
    .filter((t): t is string => Boolean(t));
  if (fromPanel.length > 0) return [...new Set(fromPanel)];
  if (place?.phone?.trim()) return [place.phone.trim()];
  return [];
}

function collectHomepageLinks(
  summary: Record<string, unknown> | undefined
): Array<{ url: string; label: string }> {
  const links: Array<{ url: string; label: string }> = [];
  const related = summary?.related_links as Record<string, unknown> | undefined;
  const primary = (related?.primary_links as Array<Record<string, unknown>>) ?? [];
  for (const item of primary) {
    const url = pickStr(item, 'url');
    if (!url) continue;
    links.push({
      url,
      label: pickStr(item, 'display_text') ?? url,
    });
  }
  const homepages = (summary?.homepages as string[] | undefined) ?? [];
  for (const url of homepages) {
    if (!url?.trim()) continue;
    if (links.some((l) => l.url === url)) continue;
    links.push({ url, label: url });
  }
  return links;
}

function HomeTab({ panel }: TabProps) {
  const summary = panel?.summary as Record<string, unknown> | undefined;
  if (!summary) return <EmptyTab message="홈 정보가 없습니다." />;

  const displayInfo = summary.display_info as Record<string, unknown> | undefined;
  const name = pickStr(displayInfo, 'display_name1') ?? pickStr(summary, 'name');
  const category = summary.category as Record<string, unknown> | undefined;
  const catPath = [category?.name1, category?.name2, category?.name3, category?.name4]
    .filter(Boolean)
    .join(' > ');
  const address = (summary.address as Record<string, unknown> | undefined)?.disp as
    | string
    | undefined;
  const phones = summary.phone_numbers as Array<{ tel?: string }> | undefined;
  const hours = summary.open_hours as Record<string, unknown> | undefined;
  const headline = hours?.headline as Record<string, unknown> | undefined;
  const homepages = summary.homepages as string[] | undefined;
  const addInfo = panel?.place_add_info as Record<string, unknown> | undefined;
  const tags = (addInfo?.tags as string[]) ?? [];

  return (
    <div className="place-detail-home">
      {name && <h3 className="place-detail-home-name">{name}</h3>}
      {catPath && <p className="place-detail-meta">{catPath}</p>}
      {headline?.display_text != null && (
        <p className="place-detail-hours">
          <Icon name="clock" />
          {String(headline.display_text)}
          {headline.display_text_info != null
            ? ` · ${String(headline.display_text_info)}`
            : ''}
        </p>
      )}
      {address && (
        <p className="place-detail-row">
          <Icon name="mapPin" />
          {address}
        </p>
      )}
      {phones?.[0]?.tel && (
        <p className="place-detail-row">
          <Icon name="phone" />
          {phones[0].tel}
        </p>
      )}
      {homepages?.[0] && (
        <p className="place-detail-row">
          <Icon name="globe" />
          <a href={homepages[0]} target="_blank" rel="noopener noreferrer">
            {homepages[0]}
          </a>
        </p>
      )}
      {tags.length > 0 && (
        <div className="place-detail-tags">
          {tags.map((t) => (
            <span key={t} className="place-detail-tag">
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MenuTab({ panel }: TabProps) {
  if (!hasMenu(panel)) return <EmptyTab message="메뉴 정보가 없습니다." />;

  const menu = panel!.menu as Record<string, unknown>;
  const items =
    ((menu.menus as Record<string, unknown>)?.items as Array<Record<string, unknown>>) ??
    [];

  return (
    <ul className="place-detail-menu-list">
      {items.map((item) => {
        const photo = item.photo_url as string | undefined;
        const proxied = photo ? proxiedThumbnailUrl(photo) ?? photo : undefined;
        return (
          <li key={String(item.product_id ?? item.name)} className="place-detail-menu-item">
            {proxied && (
              <img src={proxied} alt="" className="place-detail-menu-img" />
            )}
            <div className="place-detail-menu-text">
              <span className="place-detail-menu-name">{String(item.name ?? '')}</span>
              {item.desc != null && String(item.desc).length > 0 && (
                <span className="place-detail-menu-desc">{String(item.desc)}</span>
              )}
              {item.price !== undefined && (
                <span className="place-detail-menu-price">
                  {Number(item.price).toLocaleString()}원
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function KakaoReviewTab({ panel }: TabProps) {
  const block = panel?.kakaomap_review as Record<string, unknown> | undefined;
  const score = block?.score_set as Record<string, unknown> | undefined;
  const reviews = (block?.reviews as Array<Record<string, unknown>>) ?? [];

  if (reviews.length === 0 && !score?.average_score) {
    return <EmptyTab message="카카오맵 후기가 없습니다." />;
  }

  return (
    <div className="place-detail-reviews">
      {score?.average_score !== undefined && (
        <p className="place-detail-score">
          <Icon name="star" />
          {Number(score.average_score).toFixed(1)}
          {score.review_count !== undefined && (
            <span> · 후기 {Number(score.review_count).toLocaleString()}개</span>
          )}
        </p>
      )}
      <ul className="place-detail-review-list">
        {reviews.map((r) => (
          <li key={String(r.review_id)} className="place-detail-review-item">
            <div className="place-detail-review-head">
              <span className="place-detail-review-author">
                {(r.meta as Record<string, unknown>)?.owner
                  ? String(
                      (
                        (r.meta as Record<string, unknown>).owner as Record<
                          string,
                          unknown
                        >
                      ).nickname ?? '익명'
                    )
                  : '익명'}
              </span>
              {r.star_rating !== undefined && (
                <span className="place-detail-review-stars">
                  <Icon name="star" />
                  {Number(r.star_rating)}
                </span>
              )}
            </div>
            {r.contents != null && (
              <p className="place-detail-review-body">{String(r.contents)}</p>
            )}
            {r.registered_at != null && (
              <time className="place-detail-review-date">{String(r.registered_at)}</time>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BlogReviewTab({ panel }: TabProps) {
  const block = panel?.blog_review as Record<string, unknown> | undefined;
  const reviews = (block?.reviews as Array<Record<string, unknown>>) ?? [];

  if (reviews.length === 0) {
    return <EmptyTab message="블로그 후기가 없습니다." />;
  }

  return (
    <ul className="place-detail-blog-list">
      {reviews.map((r) => (
        <li key={String(r.review_id)} className="place-detail-blog-item">
          {r.origin_url ? (
            <a href={String(r.origin_url)} target="_blank" rel="noopener noreferrer">
              <span className="place-detail-blog-title">{String(r.title ?? '블로그 글')}</span>
            </a>
          ) : (
            <span className="place-detail-blog-title">{String(r.title ?? '블로그 글')}</span>
          )}
          {r.author != null && (
            <span className="place-detail-blog-author">{String(r.author)}</span>
          )}
          {r.contents != null && (
            <p className="place-detail-blog-excerpt">{String(r.contents).slice(0, 120)}…</p>
          )}
        </li>
      ))}
    </ul>
  );
}

function BookingTab({ panel }: TabProps) {
  const notice = panel?.my_store_notice as Record<string, unknown> | undefined;
  if (!notice) return <EmptyTab message="예약 정보가 없습니다." />;

  const available = notice.is_available_booking === true;
  return (
    <div className="place-detail-booking">
      <p className={available ? 'place-detail-ok' : 'place-detail-muted'}>
        {available ? '예약 가능한 매장입니다.' : '예약 정보를 확인할 수 없습니다.'}
      </p>
      {notice.notice_count !== undefined && (
        <p className="place-detail-meta">매장 소식 {Number(notice.notice_count)}건</p>
      )}
    </div>
  );
}

function NewsTab({ panel }: TabProps) {
  const notice = panel?.my_store_notice as Record<string, unknown> | undefined;
  const channel = panel?.talk_channel as Record<string, unknown> | undefined;

  if (!notice && !channel) return <EmptyTab message="소식이 없습니다." />;

  return (
    <div className="place-detail-news">
      {notice?.status != null && (
        <p className="place-detail-meta">매장 상태: {String(notice.status)}</p>
      )}
      {channel?.name != null && (
        <p className="place-detail-row">
          <Icon name="bell" />
          {String(channel.name)}
        </p>
      )}
      <p className="place-detail-muted">자세한 소식은 카카오맵에서 확인해 주세요.</p>
    </div>
  );
}

function SpecialTab({ panel }: TabProps) {
  const events = panel?.events as Record<string, unknown> | unknown[] | undefined;
  const list = Array.isArray(events)
    ? events
    : Array.isArray((events as Record<string, unknown>)?.items)
      ? ((events as Record<string, unknown>).items as unknown[])
      : [];

  if (list.length === 0) return <EmptyTab message="기획전 정보가 없습니다." />;

  return (
    <ul className="place-detail-special-list">
      {list.map((ev, i) => {
        const item = ev as Record<string, unknown>;
        return (
          <li key={String(item.id ?? i)} className="place-detail-special-item">
            {item.title ? String(item.title) : `기획전 ${i + 1}`}
          </li>
        );
      })}
    </ul>
  );
}

function RankingTab({ panel }: TabProps) {
  const rank = panel?.trend_rank as Record<string, unknown> | undefined;
  if (!rank?.show_ranking_card) {
    return <EmptyTab message="랭킹 정보가 없습니다." />;
  }

  return (
    <div className="place-detail-ranking">
      <p className="place-detail-ok">
        <Icon name="trophy" /> 이 장소는 카카오맵 랭킹에 포함되어
        있습니다.
      </p>
      <p className="place-detail-muted">상세 랭킹은 카카오맵에서 확인해 주세요.</p>
    </div>
  );
}

function pickStr(obj: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}
