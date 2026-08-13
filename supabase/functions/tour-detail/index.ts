import { corsHeaders } from '../_shared/cors.ts';
import {
  buildTourDetailCommonUrl,
  buildTourDetailImageUrl,
  buildTourDetailIntroUrl,
} from '../_shared/tourDetail.ts';

interface TourApiEnvelope<T> {
  response?: { body?: { items?: { item?: T | T[] } } };
}

function firstItem<T>(json: TourApiEnvelope<T> | null): T | null {
  const raw = json?.response?.body?.items?.item;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
}

function allItems<T>(json: TourApiEnvelope<T> | null): T[] {
  const raw = json?.response?.body?.items?.item;
  return Array.isArray(raw) ? raw : raw ? [raw] : [];
}

function stripHtml(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

function extractHref(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const match = raw.match(/href="([^"]+)"/i);
  if (match) return match[1];
  const trimmed = stripHtml(raw);
  return /^https?:\/\//.test(trimmed) ? trimmed : null;
}

function pickFirst(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = item[key];
    if (typeof v === 'string' && v.trim()) return stripHtml(v);
  }
  return '';
}

async function fetchJson<T>(url: string): Promise<TourApiEnvelope<T> | null> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  try {
    return (await res.json()) as TourApiEnvelope<T>;
  } catch {
    return null;
  }
}

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

  let contentId = '';
  let contentTypeId = '';
  try {
    const body = (await req.json()) as { contentId?: string; contentTypeId?: string };
    contentId = body.contentId?.trim() ?? '';
    contentTypeId = body.contentTypeId?.trim() ?? '';
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!contentId) {
    return new Response(JSON.stringify({ error: 'contentId가 필요합니다.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const [commonJson, introJson, imageJson] = await Promise.all([
      fetchJson<Record<string, unknown>>(buildTourDetailCommonUrl(contentId, serviceKey)),
      contentTypeId && contentTypeId !== '0'
        ? fetchJson<Record<string, unknown>>(
            buildTourDetailIntroUrl(contentId, contentTypeId, serviceKey)
          )
        : Promise.resolve(null),
      fetchJson<Record<string, unknown>>(buildTourDetailImageUrl(contentId, serviceKey)),
    ]);

    const common = firstItem(commonJson) ?? {};
    const intro = firstItem(introJson) ?? {};
    const images = allItems(imageJson);

    const overview = stripHtml(common.overview as string | undefined);
    const homepage = extractHref(common.homepage as string | undefined);
    const tel = (common.tel as string | undefined)?.trim() || null;
    const address = [common.addr1, common.addr2]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter(Boolean)
      .join(' ') || null;

    const hours =
      pickFirst(intro, ['usetime', 'usetimeculture', 'usetimefestival', 'usetimeleports', 'opentimefood']) ||
      (pickFirst(intro, ['checkintime']) && pickFirst(intro, ['checkouttime'])
        ? `체크인 ${pickFirst(intro, ['checkintime'])} · 체크아웃 ${pickFirst(intro, ['checkouttime'])}`
        : '');
    const restDate = pickFirst(intro, [
      'restdate',
      'restdateculture',
      'restdatefestival',
      'restdateleports',
      'restdatefood',
    ]);
    const parking = pickFirst(intro, [
      'parking',
      'parkingculture',
      'parkingfestival',
      'parkingleports',
      'parkinglodging',
      'parkingfood',
    ]);
    const infoCenter = pickFirst(intro, [
      'infocenter',
      'infocenterculture',
      'infocenterfestival',
      'infocenterleports',
      'infocenterlodging',
      'infocenterfood',
    ]);
    const fee = pickFirst(intro, ['usefee', 'usetimefestival']);

    const imageUrls = [
      ...new Set(
        [
          (common.firstimage as string | undefined)?.trim(),
          ...images.map((img) => (img.originimgurl as string | undefined)?.trim()),
        ].filter((u): u is string => Boolean(u))
      ),
    ];

    return new Response(
      JSON.stringify({
        overview: overview || null,
        homepage,
        tel,
        address,
        images: imageUrls,
        intro: {
          ...(hours ? { hours } : {}),
          ...(restDate ? { restDate } : {}),
          ...(parking ? { parking } : {}),
          ...(infoCenter ? { infoCenter } : {}),
          ...(fee && fee !== hours ? { fee } : {}),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('tour-detail failed', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
