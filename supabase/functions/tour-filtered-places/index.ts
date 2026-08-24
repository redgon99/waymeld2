import { corsHeaders } from '../_shared/cors.ts';
import { buildPlaceListUrl, fetchFilteredPlaces, type PlaceListKind } from '../_shared/tourPetWith.ts';
import { getServiceClient } from '../_shared/insightDb.ts';
import { isMultilingualLocale, overlayAddressesOnList } from '../_shared/tourMultilingual.ts';

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

  let kind: PlaceListKind | '' = '';
  let keyword = '';
  let contentTypeId = '';
  let pageNo = 1;
  let numOfRows = 24;
  let locale: 'en' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'ru' | null = null;
  try {
    const body = (await req.json()) as {
      kind?: string;
      keyword?: string;
      contentTypeId?: string;
      pageNo?: number;
      numOfRows?: number;
      locale?: string;
    };
    kind = body.kind === 'pet' || body.kind === 'with' ? body.kind : '';
    keyword = body.keyword?.trim() ?? '';
    const rawType = body.contentTypeId?.trim() ?? '';
    contentTypeId = ['12', '14', '15', '25', '28', '32', '38', '39'].includes(rawType) ? rawType : '';
    pageNo = Math.max(1, Math.round(Number(body.pageNo ?? 1)));
    numOfRows = Math.min(48, Math.max(1, Math.round(Number(body.numOfRows ?? 24))));
    locale = isMultilingualLocale(body.locale) ? body.locale : null;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!kind) {
    return new Response(JSON.stringify({ error: "kind는 'pet' 또는 'with'여야 합니다." }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const url = buildPlaceListUrl(kind, serviceKey, {
      keyword: keyword || undefined,
      contentTypeId: contentTypeId || undefined,
      pageNo,
      numOfRows,
    });
    const { items, totalCount } = await fetchFilteredPlaces(url);
    const overlaid = locale
      ? await overlayAddressesOnList(getServiceClient(), kind, locale, serviceKey, items)
      : items;
    return new Response(JSON.stringify({ items: overlaid, totalCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('tour-filtered-places failed', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
