import { corsHeaders } from '../_shared/cors.ts';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const MAX_PLACES = 20;
const MAX_SOURCE_CHARS = 12000;
const MAX_COMMENTS = 15;

interface ExtractResponse {
  videoId: string;
  title: string | null;
  places: Array<{ name: string; category: string }>;
  sourcesUsed: string[];
}

function parseVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith('youtube.com')) {
      const v = url.searchParams.get('v');
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live') {
        const id = parts[1];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
      }
    }
  } catch {
    /* not a URL */
  }
  const m = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return m?.[1] ?? null;
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

async function fetchVideoMeta(
  videoId: string,
  apiKey: string
): Promise<{ title: string; description: string; tags: string[] } | null> {
  const url = new URL(`${YOUTUBE_API_BASE}/videos`);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('id', videoId);
  url.searchParams.set('key', apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`youtube videos.list failed: ${res.status}`);
  }
  const json = (await res.json()) as {
    items?: Array<{
      snippet?: {
        title?: string;
        description?: string;
        tags?: string[];
      };
    }>;
  };
  const snippet = json.items?.[0]?.snippet;
  if (!snippet) return null;
  return {
    title: snippet.title ?? '',
    description: snippet.description ?? '',
    tags: snippet.tags ?? [],
  };
}

async function fetchTopComments(videoId: string, apiKey: string): Promise<string[]> {
  const url = new URL(`${YOUTUBE_API_BASE}/commentThreads`);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('videoId', videoId);
  url.searchParams.set('order', 'relevance');
  url.searchParams.set('maxResults', String(MAX_COMMENTS));
  url.searchParams.set('textFormat', 'plainText');
  url.searchParams.set('key', apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) return [];
  const json = (await res.json()) as {
    items?: Array<{
      snippet?: {
        topLevelComment?: { snippet?: { textDisplay?: string } };
      };
    }>;
  };
  return (json.items ?? [])
    .map((it) => it.snippet?.topLevelComment?.snippet?.textDisplay?.trim() ?? '')
    .filter(Boolean);
}

/** Best-effort public timedtext (자막). 실패해도 MVP는 제목·설명으로 진행 */
async function fetchCaptionsText(videoId: string): Promise<string | null> {
  try {
    const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
    const listRes = await fetch(listUrl, {
      headers: { 'Accept-Language': 'ko,en;q=0.8' },
    });
    if (!listRes.ok) return null;
    const listXml = await listRes.text();
    const tracks = [...listXml.matchAll(/<track\b[^>]*>/gi)].map((m) => m[0]);
    if (tracks.length === 0) return null;

    const pick =
      tracks.find((t) => /\blang_code="ko"/i.test(t)) ??
      tracks.find((t) => /\blang_code="en"/i.test(t)) ??
      tracks[0];
    const lang = pick.match(/\blang_code="([^"]+)"/i)?.[1];
    const name = pick.match(/\bname="([^"]*)"/i)?.[1] ?? '';
    if (!lang) return null;

    const capUrl = new URL('https://www.youtube.com/api/timedtext');
    capUrl.searchParams.set('v', videoId);
    capUrl.searchParams.set('lang', lang);
    if (name) capUrl.searchParams.set('name', name);
    capUrl.searchParams.set('fmt', 'srv3');

    const capRes = await fetch(capUrl.toString());
    if (!capRes.ok) return null;
    const xml = await capRes.text();
    const texts = [...xml.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)]
      .map((m) =>
        m[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/<[^>]+>/g, '')
          .trim()
      )
      .filter(Boolean);
    if (texts.length === 0) return null;
    return truncate(texts.join(' '), 8000);
  } catch {
    return null;
  }
}

function parsePlacesJson(text: string): Array<{ name: string; category: string }> {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (fenced ? fenced[1] : text).trim();
  const parsed = JSON.parse(jsonText) as unknown;
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { places?: unknown }).places)
      ? (parsed as { places: unknown[] }).places
      : null;
  if (!list) throw new Error('claude response is not a places array');

  const seen = new Set<string>();
  const out: Array<{ name: string; category: string }> = [];
  for (const item of list) {
    let name = '';
    let category = 'tour';
    if (typeof item === 'string') {
      name = item.trim();
    } else if (item && typeof item === 'object' && 'name' in item) {
      name = String((item as { name: unknown }).name).trim();
      const cat = (item as { category?: unknown }).category;
      if (typeof cat === 'string' && cat.trim()) category = cat.trim();
    }
    if (name.length < 2 || name.length > 80) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, category });
    if (out.length >= MAX_PLACES) break;
  }
  return out;
}

async function extractPlacesWithClaude(
  sourceText: string,
  videoTitle: string,
  apiKey: string
): Promise<Array<{ name: string; category: string }>> {
  const prompt = `당신은 여행 영상에서 실제 방문·추천 장소명을 추출하는 어시스턴트입니다.
아래 유튜브 영상 텍스트(제목·설명·자막·댓글 일부)에서 **구체적인 장소명**과 **카테고리**를 뽑으세요.

category 허용값 (반드시 하나):
- food: 식당·맛집
- cafe: 카페·베이커리
- tour: 관광지·자연·명소·타워·섬·공원·해변
- stay: 호텔·숙소·게스트하우스
- culture: 박물관·미술관·궁·사찰·문화재
- shop: 마트·시장·쇼핑몰·백화점
- other: 위에 해당 없음

규칙:
- 상호·관광지·고유 장소명만. "한국", "제주", "서울" 같은 광역 지명은 제외(단 "성산일출봉", "광안리해수욕장"처럼 특정 명소는 포함)
- 스폰서 앱/일반 명사/인물명/해시태그 단독 제외
- 영상에서 실제로 언급된 것만. 추측하지 말 것
- 최대 ${MAX_PLACES}개
- 가능하면 영상에 쓰인 표기(한글/영문) 유지
- 애매하면 tour

영상 제목: ${videoTitle || '(없음)'}

텍스트:
${sourceText}

반드시 JSON만 응답하세요. 형식: {"places":[{"name":"장소1","category":"tour"}]}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`claude api failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = json.content?.find((b) => b.type === 'text')?.text ?? '';
  return parsePlacesJson(text);
}

/** Claude 없을 때 설명 줄 단위 휴리스틱 */
function heuristicPlaces(
  description: string,
  title: string
): Array<{ name: string; category: string }> {
  const lines = `${title}\n${description}`
    .split(/[\n,|•·]+/)
    .map((s) => s.replace(/^[\s\-*\d.)📍]+/, '').trim())
    .filter((s) => s.length >= 2 && s.length <= 40)
    .filter((s) => !/^https?:\/\//i.test(s))
    .filter((s) => !/#/.test(s) || s.replace(/#/g, '').trim().length >= 2);
  const seen = new Set<string>();
  const out: Array<{ name: string; category: string }> = [];
  for (const item of lines) {
    const cleaned = item.replace(/^#/, '').trim();
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name: cleaned, category: 'tour' });
    if (out.length >= MAX_PLACES) break;
  }
  return out;
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

  const youtubeKey = Deno.env.get('YOUTUBE_API_KEY')?.trim();
  if (!youtubeKey) {
    return new Response(JSON.stringify({ error: 'YOUTUBE_API_KEY not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const videoId = parseVideoId(body.url ?? '');
  if (!videoId) {
    return new Response(JSON.stringify({ error: '유효한 YouTube 영상 링크가 아닙니다.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const meta = await fetchVideoMeta(videoId, youtubeKey);
    if (!meta) {
      return new Response(JSON.stringify({ error: '영상을 찾을 수 없습니다.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sourcesUsed: string[] = ['title', 'description'];
    const parts: string[] = [
      `제목: ${meta.title}`,
      `설명:\n${meta.description}`,
    ];
    if (meta.tags.length > 0) {
      parts.push(`태그: ${meta.tags.join(', ')}`);
      sourcesUsed.push('tags');
    }

    const [captions, comments] = await Promise.all([
      fetchCaptionsText(videoId),
      fetchTopComments(videoId, youtubeKey),
    ]);
    if (captions) {
      parts.push(`자막:\n${captions}`);
      sourcesUsed.push('captions');
    }
    if (comments.length > 0) {
      parts.push(`댓글:\n${comments.map((c) => `- ${c}`).join('\n')}`);
      sourcesUsed.push('comments');
    }

    const sourceText = truncate(parts.join('\n\n'), MAX_SOURCE_CHARS);
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')?.trim();
    let places: Array<{ name: string; category: string }>;
    if (anthropicKey) {
      places = await extractPlacesWithClaude(sourceText, meta.title, anthropicKey);
    } else {
      places = heuristicPlaces(meta.description, meta.title);
      sourcesUsed.push('heuristic');
    }

    const payload: ExtractResponse = {
      videoId,
      title: meta.title || null,
      places,
      sourcesUsed,
    };
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('youtube-places-extract failed', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
