import { corsHeaders } from '../_shared/cors.ts';
import { buildPhotoGalleryUrl, fetchTourPhotos } from '../_shared/tourPhotos.ts';

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
  let pageNo = 1;
  let numOfRows = 24;
  try {
    const body = (await req.json()) as { keyword?: string; pageNo?: number; numOfRows?: number };
    keyword = body.keyword?.trim() ?? '';
    pageNo = Math.max(1, Math.round(Number(body.pageNo ?? 1)));
    numOfRows = Math.min(48, Math.max(1, Math.round(Number(body.numOfRows ?? 24))));
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = buildPhotoGalleryUrl(serviceKey, { keyword: keyword || undefined, pageNo, numOfRows });
    const { items, totalCount } = await fetchTourPhotos(url);
    return new Response(JSON.stringify({ items, totalCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('tour-photos failed', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
