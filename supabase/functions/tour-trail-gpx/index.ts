import { corsHeaders } from '../_shared/cors.ts';
import { fetchGpxRoute, isAllowedGpxUrl } from '../_shared/tourTrailGpx.ts';

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

  let gpxUrl = '';
  try {
    const body = (await req.json()) as { gpxUrl?: string };
    gpxUrl = body.gpxUrl?.trim() ?? '';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!gpxUrl || !isAllowedGpxUrl(gpxUrl)) {
    return new Response(JSON.stringify({ error: 'gpxUrl이 두루누비(durunubi.kr) 주소가 아닙니다.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const points = await fetchGpxRoute(gpxUrl);
    return new Response(JSON.stringify({ points }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('tour-trail-gpx failed', e);
    return new Response(JSON.stringify({ error: 'GPX fetch/parse failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
