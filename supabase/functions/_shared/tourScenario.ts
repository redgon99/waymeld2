/**
 * 테마 여행 시나리오 — Phase 1: 테마별 후보 장소 수집 전략
 *
 * TourAPI에는 "의료관광/명상관광/웰빙관광" 같은 라이프스타일 테마 카테고리가
 * 없다. 대신 키워드 검색(searchKeyword2, 전국 대상)으로 후보를 모은다.
 *
 * 이 기능은 "지도 근처 둘러보기"가 아니라 "전국에서 테마에 가장 적합한
 * 지역을 찾아 시나리오를 만드는" 것이므로 좌표/반경으로 후보를 제한하지
 * 않는다. 대신 전국 후보를 지역(시도)별로 클러스터링해 밀집 지역을 찾고,
 * 그 지역을 시나리오의 무대로 삼는다.
 */

export type ScenarioTheme = 'meditation' | 'wellbeing' | 'shopping' | 'family' | 'honeymoon';

interface ThemeQuerySpec {
  keywords: string[];
}

export const SCENARIO_THEME_QUERIES: Record<ScenarioTheme, ThemeQuerySpec> = {
  // '산사'는 '황병산사냥'처럼 부분 문자열로 오탐되어 '사찰'/'수련원'으로 교체
  meditation: { keywords: ['템플스테이', '한옥스테이', '사찰', '수련원'] },
  // '스파'는 의류 브랜드 '스파오'와 충돌하여 제외, '휴양림' 추가
  wellbeing: { keywords: ['온천', '찜질방', '힐링', '휴양림'] },
  // 좌표 기반 cat1(A04) 조회를 뺀 대신 '백화점' 키워드로 보완
  shopping: { keywords: ['아울렛', '전통시장', '면세점', '백화점'] },
  family: { keywords: ['키즈카페', '동물원', '과학관', '테마파크'] },
  honeymoon: { keywords: ['리조트', '오션뷰', '전망대', '스카이워크'] },
};

const BASE = 'https://apis.data.go.kr/B551011/KorService2';

function keyParam(serviceKey: string): string {
  return serviceKey.includes('%')
    ? `serviceKey=${serviceKey}`
    : `serviceKey=${encodeURIComponent(serviceKey)}`;
}

/** searchKeyword2 — 키워드 전국 검색 */
export function buildScenarioKeywordUrl(
  keyword: string,
  serviceKey: string,
  numOfRows = 100
): string {
  const params = new URLSearchParams({
    MobileOS: 'ETC',
    MobileApp: 'WayMeld',
    _type: 'json',
    keyword,
    numOfRows: String(numOfRows),
    pageNo: '1',
    arrange: 'C',
  });
  return `${BASE}/searchKeyword2?${keyParam(serviceKey)}&${params.toString()}`;
}

/** 주소 첫 토큰(시도 단위)으로 지역 그룹핑 — src/lib/koreaAreaCodes.ts의 regionPrefixOf와 동일 로직 */
export function regionPrefixOf(address: string | undefined | null): string | undefined {
  if (!address) return undefined;
  const first = address.trim().split(/\s+/)[0];
  return first || undefined;
}
