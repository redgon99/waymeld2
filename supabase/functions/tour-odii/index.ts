import { corsHeaders } from '../_shared/cors.ts';
import { buildOdiiSitesUrl, buildOdiiStoriesUrl, fetchOdiiSites, fetchOdiiStories } from '../_shared/tourOdii.ts';
import { getServiceClient } from '../_shared/insightDb.ts';
import { fetchOfficialAddressCached, isMultilingualLocale } from '../_shared/tourMultilingual.ts';

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

  let body: {
    mode?: string;
    keyword?: string;
    pageNo?: number;
    numOfRows?: number;
    tid?: string;
    tlid?: string;
    locale?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    if (body.mode === 'stories') {
      const tid = body.tid?.trim();
      const tlid = body.tlid?.trim();
      if (!tid || !tlid) {
        return new Response(JSON.stringify({ error: 'tid/tlid required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const url = buildOdiiStoriesUrl(serviceKey, tid, tlid);
      const { items, totalCount } = await fetchOdiiStories(url);
      return new Response(JSON.stringify({ items, totalCount }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pageNo = Math.max(1, Math.round(Number(body.pageNo ?? 1)));
    const numOfRows = Math.min(48, Math.max(1, Math.round(Number(body.numOfRows ?? 24))));
    const url = buildOdiiSitesUrl(serviceKey, { keyword: body.keyword, pageNo, numOfRows });
    const { items, totalCount } = await fetchOdiiSites(url);

    const locale = isMultilingualLocale(body.locale) ? body.locale : null;
    let overlaid: Array<
      (typeof items)[number] & { officialAddress?: string; officialAddressFetchedAt?: string }
    > = items;
    if (locale) {
      const sb = getServiceClient();
      overlaid = await Promise.all(
        items.map(async (site) => {
          const match = await fetchOfficialAddressCached(
            sb,
            'odii',
            `${site.tid}:${site.tlid}`,
            locale,
            serviceKey,
            site.title,
            site.lat,
            site.lng
          );
          return { ...site, officialAddress: match?.address, officialAddressFetchedAt: match?.fetchedAt };
        })
      );
    }

    return new Response(JSON.stringify({ items: overlaid, totalCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('tour-odii failed', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
