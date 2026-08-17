import { corsHeaders } from '../_shared/cors.ts';
import { buildTrailCourseUrl, fetchTourTrails } from '../_shared/tourTrails.ts';

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

  let keyword = '';
  let level: '1' | '2' | '3' | undefined;
  let pageNo = 1;
  let numOfRows = 150;
  try {
    const body = (await req.json()) as {
      keyword?: string;
      level?: string;
      pageNo?: number;
      numOfRows?: number;
    };
    keyword = body.keyword?.trim() ?? '';
    level = body.level === '1' || body.level === '2' || body.level === '3' ? body.level : undefined;
    pageNo = Math.max(1, Math.round(Number(body.pageNo ?? 1)));
    // 두루누비 courseList는 필터 없이도 전체가 144건뿐이라 페이지네이션 없이 한 번에 받는다.
    // (brdDiv 파라미터는 API 상에서 실효가 없는 것으로 확인되어 이 프록시는 받지 않는다.)
    numOfRows = Math.min(200, Math.max(1, Math.round(Number(body.numOfRows ?? 150))));
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = buildTrailCourseUrl(serviceKey, { keyword: keyword || undefined, level, pageNo, numOfRows });
    const { items, totalCount } = await fetchTourTrails(url);
    return new Response(JSON.stringify({ items, totalCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('tour-trails failed', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
