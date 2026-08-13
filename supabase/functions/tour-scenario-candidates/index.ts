import { corsHeaders } from '../_shared/cors.ts';
import {
  SCENARIO_THEME_QUERIES,
  buildScenarioKeywordUrl,
  regionPrefixOf,
  type ScenarioTheme,
} from '../_shared/tourScenario.ts';

interface RawItem {
  contentid: string;
  contenttypeid?: string;
  title: string;
  addr1?: string;
  mapx: string;
  mapy: string;
  firstimage?: string;
}

interface Candidate {
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

interface RegionCluster {
  region: string;
  count: number;
  candidates: Candidate[];
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const serviceKey = Deno.env.get('TOUR_API_KEY')?.trim();
  if (!serviceKey) {
    return new Response(JSON.stringify({ error: 'TOUR_API_KEY not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let theme: ScenarioTheme | '' = '';
  try {
    const body = (await req.json()) as { theme?: string };
    theme = (body.theme ?? '') as ScenarioTheme;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const spec = SCENARIO_THEME_QUERIES[theme as ScenarioTheme];
  if (!spec) {
    return new Response(JSON.stringify({ error: '유효한 theme이 필요합니다.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const byKeyword: Record<string, number> = {};

  try {
    const keywordResults = await Promise.all(
      spec.keywords.map(async (kw) => {
        const items = await fetchItems(buildScenarioKeywordUrl(kw, serviceKey));
        byKeyword[kw] = items.length;
        return items.map((it) => ({ item: it, sourceKeyword: kw }));
      })
    );

    const seen = new Set<string>();
    const clusters = new Map<string, Candidate[]>();

    for (const { item, sourceKeyword } of keywordResults.flat()) {
      if (!item.contentid || seen.has(item.contentid)) continue;
      // '수련원' 검색어가 청소년 단체캠프 시설을 오탐하는 문제 — 명상 테마 취지와 무관하므로 제외
      if (sourceKeyword === '수련원' && item.title.includes('청소년')) continue;
      const lat = parseFloat(item.mapy);
      const lng = parseFloat(item.mapx);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const region = regionPrefixOf(item.addr1) ?? '미상';
      seen.add(item.contentid);
      const candidate: Candidate = {
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

    const regionClusters: RegionCluster[] = Array.from(clusters.entries())
      .map(([region, candidates]) => ({ region, count: candidates.length, candidates: candidates.slice(0, 15) }))
      .filter((c) => c.region !== '미상')
      .sort((a, b) => b.count - a.count);

    return new Response(
      JSON.stringify({
        theme,
        rawCountsByQuery: byKeyword,
        totalCandidates: seen.size,
        regionClusters: regionClusters.slice(0, 8),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('tour-scenario-candidates failed', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
