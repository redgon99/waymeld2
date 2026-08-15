import { corsHeaders } from '../_shared/cors.ts';
import { buildTrailCourseUrl, fetchTourTrails, type TrailKind } from '../_shared/tourTrails.ts';

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
  let brdDiv: TrailKind | undefined;
  let level: '1' | '2' | '3' | undefined;
  let pageNo = 1;
  let numOfRows = 30;
  try {
    const body = (await req.json()) as {
      keyword?: string;
      brdDiv?: string;
      level?: string;
      pageNo?: number;
      numOfRows?: number;
    };
    keyword = body.keyword?.trim() ?? '';
    brdDiv = body.brdDiv === 'DNWW' || body.brdDiv === 'DNBW' ? body.brdDiv : undefined;
    level = body.level === '1' || body.level === '2' || body.level === '3' ? body.level : undefined;
    pageNo = Math.max(1, Math.round(Number(body.pageNo ?? 1)));
    numOfRows = Math.min(50, Math.max(1, Math.round(Number(body.numOfRows ?? 30))));
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = buildTrailCourseUrl(serviceKey, { keyword: keyword || undefined, brdDiv, level, pageNo, numOfRows });
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
