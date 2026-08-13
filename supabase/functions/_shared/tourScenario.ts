/**
 * 테마 여행 시나리오 — 테마별 후보 장소 수집 전략
 *
 * TourAPI에는 "의료관광/명상관광/웰빙관광" 같은 라이프스타일 테마 카테고리가
 * 없다. 대신 키워드 검색(searchKeyword2, 전국 대상)으로 후보를 모은다.
 *
 * 이 기능은 "지도 근처 둘러보기"가 아니라 "전국에서 테마에 가장 적합한
 * 지역을 찾아 시나리오를 만드는" 것이므로 좌표/반경으로 후보를 제한하지
 * 않는다. 대신 전국 후보를 지역(시도)별로 클러스터링해 밀집 지역을 찾고,
 * 그 지역을 시나리오의 무대로 삼는다.
 */

export type ScenarioTheme =
  | 'meditation'
  | 'wellbeing'
  | 'shopping'
  | 'family'
  | 'honeymoon'
  | 'night'
  | 'hallyu'
  | 'camping'
  | 'walking'
  | 'marine';

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
  // KTO 데이터랩 "특화관광 테마" 분류 참고해 추가
  night: { keywords: ['야시장', '야경', '야간개장'] },
  // '한류' 단독 검색은 결과가 거의 없어 '촬영지'/'케이팝' 위주로 구성
  hallyu: { keywords: ['촬영지', '케이팝', '아이돌'] },
  camping: { keywords: ['캠핑장', '글램핑', '오토캠핑'] },
  walking: { keywords: ['둘레길', '트레킹', '올레길'] },
  marine: { keywords: ['해수욕장', '마리나', '요트'] },
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

interface RawItem {
  contentid: string;
  contenttypeid?: string;
  title: string;
  addr1?: string;
  mapx: string;
  mapy: string;
  firstimage?: string;
}

export interface ScenarioCandidate {
  contentId: string;
  contentTypeId: string;
  title: string;
  address: string;
  region: string;
  lat: number;
  lng: number;
  sourceKeyword: string;
  thumbnailUrl?: string;
}

export interface ScenarioRegionCluster {
  region: string;
  count: number;
  candidates: ScenarioCandidate[];
}

async function fetchItems(url: string): Promise<RawItem[]> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    response?: { body?: { items?: { item?: RawItem | RawItem[] } } };
  };
  const raw = json.response?.body?.items?.item;
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

/** 테마 후보를 전국에서 모아 지역(시도)별로 클러스터링한다. 밀집도 내림차순 정렬. */
export async function fetchThemeRegionClusters(
  theme: ScenarioTheme,
  serviceKey: string
): Promise<{ regionClusters: ScenarioRegionCluster[]; rawCountsByQuery: Record<string, number> }> {
  const spec = SCENARIO_THEME_QUERIES[theme];
  const rawCountsByQuery: Record<string, number> = {};

  const keywordResults = await Promise.all(
    spec.keywords.map(async (kw) => {
      const items = await fetchItems(buildScenarioKeywordUrl(kw, serviceKey));
      rawCountsByQuery[kw] = items.length;
      return items.map((it) => ({ item: it, sourceKeyword: kw }));
    })
  );

  const seen = new Set<string>();
  const clusters = new Map<string, ScenarioCandidate[]>();

  for (const { item, sourceKeyword } of keywordResults.flat()) {
    if (!item.contentid || seen.has(item.contentid)) continue;
    // '수련원' 검색어가 청소년 단체캠프 시설을 오탐하는 문제 — 명상 테마 취지와 무관하므로 제외
    if (sourceKeyword === '수련원' && item.title.includes('청소년')) continue;
    const lat = parseFloat(item.mapy);
    const lng = parseFloat(item.mapx);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const region = regionPrefixOf(item.addr1) ?? '미상';
    if (region === '미상') continue;
    seen.add(item.contentid);
    const candidate: ScenarioCandidate = {
      contentId: item.contentid,
      contentTypeId: item.contenttypeid?.trim() || '0',
      title: item.title.replace(/<[^>]+>/g, ''),
      address: item.addr1 ?? '',
      region,
      lat,
      lng,
      sourceKeyword,
      thumbnailUrl: item.firstimage?.trim() || undefined,
    };
    const list = clusters.get(region);
    if (list) list.push(candidate);
    else clusters.set(region, [candidate]);
  }

  const regionClusters: ScenarioRegionCluster[] = Array.from(clusters.entries())
    .map(([region, candidates]) => ({ region, count: candidates.length, candidates }))
    .sort((a, b) => b.count - a.count);

  return { regionClusters, rawCountsByQuery };
}
