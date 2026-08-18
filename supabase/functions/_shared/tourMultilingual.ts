/**
 * TourAPI 다국어 서비스(EngService2/JpnService2/ChsService2/ChtService2)로 KorService2
 * 장소의 공식 현지어 주소를 찾아 덮어씌운다.
 *
 * 라이브 검증 결과 이 4개 서비스는 KorService2와 contentId 공간이 완전히 분리돼
 * 있다(GoCamping/Odii와 동일한 패턴). 처음엔 좌표 반경검색(locationBasedList2)으로
 * 매칭을 시도했으나, 이 오퍼레이션이 유명 랜드마크(예: 경복궁 본체)조차 누락하는
 * 인덱싱 버그가 라이브로 확인돼(distance-radius 500m/10건 조회에도 본체가 아예
 * 안 잡힘) 폐기했다. 대신 다국어 서비스의 title 필드가 항상 끝에 원문 한글명을
 * 괄호로 담고 있다는 점(예: "Gyeongbokgung Palace (경복궁)")을 이용해, KorService2
 * titleKo 그대로 searchKeyword2(한글 키워드도 그대로 받는다 — 라이브 확인)에
 * 검색한 뒤 괄호 안 한글명이 정확히 일치하는 항목을 고른다. 완전 동명이인이 여럿
 * 나오는 극히 드문 경우에만 좌표 근접도를 보조 필터로 쓴다.
 */

export type MultilingualLocale = 'en' | 'ja' | 'zh';

const SERVICE_BY_LOCALE: Record<MultilingualLocale, string> = {
  en: 'EngService2',
  ja: 'JpnService2',
  zh: 'ChsService2',
};

function keyParam(serviceKey: string): string {
  return serviceKey.includes('%')
    ? `serviceKey=${serviceKey}`
    : `serviceKey=${encodeURIComponent(serviceKey)}`;
}

/**
 * 제목 끝의 "(한글명)"을 추출한다. 예: "Gyeongbokgung Palace (경복궁)" → "경복궁".
 * JpnService2는 반각(ASCII) 괄호가 아니라 전각 괄호"（）"를 쓰는 경우가 확인돼(예:
 * "景福宮（경복궁）") 두 괄호 유형을 모두 인식해야 한다.
 */
function extractKoreanName(title: string): string {
  const cleaned = title.replace(/<[^>]+>/g, '');
  const match = cleaned.match(/[（(]([^（）()]+)[）)]\s*$/);
  return (match ? match[1] : cleaned).trim();
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 한글 이름이 정확히 일치하지 않는 동명이인 후보에게 적용하는 최대 허용 거리 */
const FUZZY_MAX_DIST_M = 300;

interface RawKeywordItem {
  contentid: string;
  title: string;
  addr1?: string;
  addr2?: string;
  mapx?: string;
  mapy?: string;
}

export interface OfficialAddressMatch {
  contentId: string;
  title: string;
  address: string;
  distanceM: number;
}

export async function fetchOfficialAddress(
  locale: MultilingualLocale,
  serviceKey: string,
  titleKo: string,
  lat: number,
  lng: number
): Promise<OfficialAddressMatch | null> {
  const keyword = titleKo.trim();
  if (!keyword) return null;
  const service = SERVICE_BY_LOCALE[locale];
  const params = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'WayMeld',
    _type: 'json',
    numOfRows: '10',
    keyword,
  });
  const url = `https://apis.data.go.kr/B551011/${service}/searchKeyword2?${keyParam(serviceKey)}&${params.toString()}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      response?: { body?: { items?: { item?: RawKeywordItem | RawKeywordItem[] } } };
    };
    const raw = json.response?.body?.items?.item;
    const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
    if (list.length === 0) return null;

    const exactMatches = list.filter((it) => extractKoreanName(it.title) === keyword);
    const pool = exactMatches.length > 0 ? exactMatches : list;
    const ranked = pool
      .map((it) => ({
        it,
        dist: haversineM(lat, lng, Number(it.mapy), Number(it.mapx)),
      }))
      .filter((x) => Number.isFinite(x.dist))
      .sort((a, b) => a.dist - b.dist);

    const best = ranked[0];
    if (!best) return null;
    if (exactMatches.length === 0 && best.dist > FUZZY_MAX_DIST_M) return null;

    const address = [best.it.addr1, best.it.addr2].filter(Boolean).join(' ').trim();
    if (!address) return null;
    return {
      contentId: best.it.contentid,
      title: best.it.title.replace(/<[^>]+>/g, ''),
      address,
      distanceM: Math.round(best.dist),
    };
  } catch {
    return null;
  }
}
