import { corsHeaders } from '../_shared/cors.ts';
import { buildTourFestivalUrl } from '../_shared/tourFestival.ts';

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

  let eventStartDate = '';
  let eventEndDate = '';
  try {
    const body = (await req.json()) as { eventStartDate?: string; eventEndDate?: string };
    eventStartDate = body.eventStartDate?.trim() ?? '';
    eventEndDate = body.eventEndDate?.trim() ?? '';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!/^\d{8}$/.test(eventStartDate)) {
    return new Response(JSON.stringify({ error: 'eventStartDate는 yyyymmdd 형식이 필요합니다.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = buildTourFestivalUrl(eventStartDate, eventEndDate || undefined, serviceKey);
    const upstream = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await upstream.text();

    if (!upstream.ok) {
      console.error('Tour Festival API upstream error', upstream.status, text.slice(0, 200));
      return new Response(JSON.stringify({ error: 'Tour Festival API upstream failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Tour Festival API proxy error', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
