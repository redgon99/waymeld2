import { corsHeaders } from '../_shared/cors.ts';
import { buildTourSearchUrl } from '../_shared/tourSearch.ts';

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
  try {
    const body = (await req.json()) as { keyword?: string };
    keyword = body.keyword?.trim() ?? '';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!keyword) {
    return new Response(JSON.stringify({ response: { body: { items: {} } } }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = buildTourSearchUrl(keyword, serviceKey);
    const upstream = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    const text = await upstream.text();

    if (!upstream.ok) {
      console.error('Tour API upstream error', upstream.status, text.slice(0, 200));
      return new Response(JSON.stringify({ error: 'Tour API upstream failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(text, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Tour API proxy error', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
