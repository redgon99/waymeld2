import { corsHeaders } from '../_shared/cors.ts';

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const MIN_MINUTES = 10;
const MAX_MINUTES = 240;
const MAX_PLACES = 30;

const LOCALE_LABELS: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '简体中文',
};

function normalizeRequestLocale(raw: string): string {
  const s = raw.toLowerCase().trim();
  if (s.startsWith('ko')) return 'ko';
  if (s.startsWith('ja')) return 'ja';
  if (s.startsWith('zh')) return 'zh';
  return 'en';
}

interface PlaceInput {
  id: string;
  name: string;
  category?: string;
  categoryLabel?: string;
  address?: string;
}

interface Suggestion {
  id: string;
  minutes: number;
  reason: string;
}

function parseJson(text: string): { suggestions?: unknown } {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (fenced ? fenced[1] : text).trim();
  return JSON.parse(jsonText) as { suggestions?: unknown };
}

function buildPrompt(places: PlaceInput[], localeLabel: string): string {
  const listing = places
    .map(
      (p, i) =>
        `${i + 1}. id="${p.id}" name="${p.name}" category="${p.categoryLabel ?? p.category ?? ''}" address="${p.address ?? ''}"`
    )
    .join('\n');

  return `당신은 여행 일정의 장소별 체류시간을 추천하는 도우미입니다.
아래는 하루 동선에 포함된 장소 ${places.length}곳입니다. 각 장소마다 적절한 체류시간(분)을 추천하세요.

규칙:
- 장소의 성격(관광지/맛집/카페/숙소/쇼핑/문화시설 등)과 이름을 보고 개별적으로 판단하세요. 같은 카테고리라도 장소 규모·성격에 따라 다르게 추천할 수 있습니다(예: 대형 백화점 본점은 전통시장보다 더 길게, 숙소는 체크인/짐정리 기준으로 짧게).
- 오늘 하루 전체 장소 수(${places.length}곳)를 고려하세요. 장소가 많아 빡빡한 날이면 전체적으로 체류시간을 줄이고, 여유로운 날이면 조금 늘리세요.
- 체류시간은 ${MIN_MINUTES}~${MAX_MINUTES}분 사이로 추천하세요.
- reason은 이 장소에 이 시간을 추천하는 이유를 ${localeLabel}로 1문장 이내로 간결하게 작성하세요.

장소 목록:
${listing}

반드시 JSON만 응답하세요:
{"suggestions":[{"id":"...","minutes":60,"reason":"..."}]}`;
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

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')?.trim();
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let places: PlaceInput[] = [];
  let locale = 'en';
  try {
    const body = (await req.json()) as { places?: PlaceInput[]; locale?: string };
    places = Array.isArray(body.places)
      ? body.places.filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
      : [];
    locale = normalizeRequestLocale(body.locale ?? 'en');
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (places.length === 0) {
    return new Response(JSON.stringify({ error: 'places가 필요합니다.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 프롬프트 크기 보호 — 하루 동선에 이 이상 핀이 몰리는 경우는 드물지만 방어적으로 캡
  const capped = places.slice(0, MAX_PLACES);
  const localeLabel = LOCALE_LABELS[locale] ?? LOCALE_LABELS.en;
  const prompt = buildPrompt(capped, localeLabel);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        system: `Output language for the "reason" field: ${localeLabel} only. Return JSON only.`,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`claude api failed: ${res.status} ${await res.text()}`);
    }
    const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = json.content?.find((b) => b.type === 'text')?.text ?? '';
    const parsed = parseJson(text);
    const rawSuggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];

    const idSet = new Set(capped.map((p) => p.id));
    const suggestions: Suggestion[] = [];
    for (const raw of rawSuggestions) {
      const s = raw as Record<string, unknown>;
      const id = String(s.id ?? '');
      if (!idSet.has(id)) continue;
      const minutesRaw = Number(s.minutes);
      const minutes = Number.isFinite(minutesRaw)
        ? Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(minutesRaw)))
        : MIN_MINUTES;
      const reason = String(s.reason ?? '').trim().slice(0, 120);
      suggestions.push({ id, minutes, reason });
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('route-stay-suggest failed', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
