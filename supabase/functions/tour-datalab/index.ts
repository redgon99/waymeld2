import { corsHeaders } from '../_shared/cors.ts';
import { buildDataLabUrl, fetchDataLabRegions, type DataLabLevel } from '../_shared/tourDataLab.ts';

const YMD_RE = /^\d{8}$/;

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

  let body: { level?: string; ymd?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const level: DataLabLevel = body.level === 'locgo' ? 'locgo' : 'metco';
  const ymd = body.ymd?.trim() ?? '';
  if (!YMD_RE.test(ymd)) {
    return new Response(JSON.stringify({ error: 'ymd must be yyyyMMdd' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = buildDataLabUrl(level, serviceKey, ymd);
    const { regions, baseYmd } = await fetchDataLabRegions(url);
    return new Response(JSON.stringify({ regions, baseYmd }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('tour-datalab failed', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
