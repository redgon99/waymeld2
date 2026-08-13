import { corsHeaders } from '../_shared/cors.ts';
import { buildTourNearbyUrl } from '../_shared/tourNearby.ts';

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

  let mapX = NaN;
  let mapY = NaN;
  let radius = 3000;
  let contentTypeId = '';
  try {
    const body = (await req.json()) as {
      mapX?: number;
      mapY?: number;
      radius?: number;
      contentTypeId?: string;
    };
    mapX = Number(body.mapX);
    mapY = Number(body.mapY);
    radius = Number(body.radius ?? 3000);
    contentTypeId = body.contentTypeId?.trim() ?? '';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!Number.isFinite(mapX) || !Number.isFinite(mapY)) {
    return new Response(JSON.stringify({ error: 'mapX/mapY가 필요합니다.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = buildTourNearbyUrl(mapX, mapY, radius, serviceKey, contentTypeId || undefined);
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await upstream.text();

    if (!upstream.ok) {
      console.error('Tour Nearby API upstream error', upstream.status, text.slice(0, 200));
      return new Response(JSON.stringify({ error: 'Tour Nearby API upstream failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Tour Nearby API proxy error', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
