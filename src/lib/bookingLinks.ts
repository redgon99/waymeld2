/**
 * 핀 메모(note)에 붙여 넣은 예약 링크를 알아보고 카드로 보여주기 위한 판별기.
 *
 * 여행자는 예약 확인 메일·앱 링크를 메모에 그냥 붙여 넣는다.
 * 그걸 긴 URL 텍스트로 두는 대신 어디 예약인지 알아볼 수 있는 카드로 바꾼다.
 */

export type BookingProvider =
  | 'naver'
  | 'catchtable'
  | 'tabling'
  | 'yanolja'
  | 'yeogi'
  | 'klook'
  | 'kkday'
  | 'myrealtrip'
  | 'interpark'
  | 'ticketlink'
  | 'agoda'
  | 'booking'
  | 'airbnb'
  | 'trip'
  | 'web';

export interface BookingLink {
  href: string;
  host: string;
  provider: BookingProvider;
  /** 브랜드 표기 — 번역 대상이 아니다 */
  brand: string;
}

const PROVIDERS: Array<{ match: RegExp; provider: BookingProvider; brand: string }> = [
  { match: /(^|\.)booking\.naver\.com$/, provider: 'naver', brand: '네이버 예약' },
  { match: /(^|\.)m\.booking\.naver\.com$/, provider: 'naver', brand: '네이버 예약' },
  { match: /(^|\.)catchtable\.co\.kr$/, provider: 'catchtable', brand: '캐치테이블' },
  { match: /(^|\.)tabling\.co\.kr$/, provider: 'tabling', brand: '테이블링' },
  { match: /(^|\.)yanolja\.com$/, provider: 'yanolja', brand: '야놀자' },
  { match: /(^|\.)goodchoice\.kr$/, provider: 'yeogi', brand: '여기어때' },
  { match: /(^|\.)klook\.com$/, provider: 'klook', brand: 'Klook' },
  { match: /(^|\.)kkday\.com$/, provider: 'kkday', brand: 'KKday' },
  { match: /(^|\.)myrealtrip\.com$/, provider: 'myrealtrip', brand: '마이리얼트립' },
  { match: /(^|\.)interpark\.com$/, provider: 'interpark', brand: '인터파크' },
  { match: /(^|\.)ticketlink\.co\.kr$/, provider: 'ticketlink', brand: '티켓링크' },
  { match: /(^|\.)agoda\.com$/, provider: 'agoda', brand: 'Agoda' },
  { match: /(^|\.)booking\.com$/, provider: 'booking', brand: 'Booking.com' },
  { match: /(^|\.)airbnb\.(com|co\.kr)$/, provider: 'airbnb', brand: 'Airbnb' },
  { match: /(^|\.)trip\.com$/, provider: 'trip', brand: 'Trip.com' },
];

const URL_PATTERN = /https?:\/\/[^\s<>()[\]"']+/gi;

function classify(host: string): { provider: BookingProvider; brand: string } {
  const clean = host.replace(/^www\./, '').toLowerCase();
  for (const entry of PROVIDERS) {
    if (entry.match.test(clean)) return { provider: entry.provider, brand: entry.brand };
  }
  return { provider: 'web', brand: clean };
}

/** 메모에서 http(s) 링크를 찾아 예약처를 판별한다 (중복 URL은 한 번만) */
export function extractBookingLinks(note: string | undefined | null): BookingLink[] {
  if (!note) return [];

  const found = note.match(URL_PATTERN);
  if (!found) return [];

  const seen = new Set<string>();
  const links: BookingLink[] = [];

  for (const raw of found) {
    // 문장 끝 문장부호가 URL에 붙어 들어오는 경우가 잦다
    const trimmed = raw.replace(/[.,;:!?]+$/, '');
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    if (seen.has(url.href)) continue;
    seen.add(url.href);

    const { provider, brand } = classify(url.hostname);
    links.push({ href: url.href, host: url.hostname.replace(/^www\./, ''), provider, brand });
  }

  return links;
}

/** 링크를 제외한 메모 본문 (카드로 따로 보여주므로 중복 노출을 피한다) */
export function noteWithoutLinks(note: string | undefined | null): string {
  if (!note) return '';
  return note.replace(URL_PATTERN, '').replace(/\s{2,}/g, ' ').trim();
}
