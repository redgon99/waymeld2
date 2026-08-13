import { corsHeaders } from '../_shared/cors.ts';
import {
  fetchThemeRegionClusters,
  SCENARIO_THEME_QUERIES,
  type ScenarioCandidate,
  type ScenarioTheme,
} from '../_shared/tourScenario.ts';

const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';
const MAX_REGIONS_OFFERED = 3;
const MAX_CANDIDATES_PER_REGION = 15;

/**
 * 지역별 후보를 단순히 앞에서부터 자르면 키워드 배열의 첫 항목(예: 허니문의
 * '리조트')이 나머지를 밀어내 숙박 시설로만 도배되는 문제가 있었다
 * (실측: 제주 3일 일정이 리조트 6개로만 구성됨). 키워드별로 라운드로빈으로
 * 섞어서 다양한 유형(숙박/전망대/자연 등)이 골고루 후보에 들어가게 한다.
 */
function diversifyBySourceKeyword(
  candidates: ScenarioCandidate[],
  cap: number
): ScenarioCandidate[] {
  const groups = new Map<string, ScenarioCandidate[]>();
  for (const c of candidates) {
    const list = groups.get(c.sourceKeyword);
    if (list) list.push(c);
    else groups.set(c.sourceKeyword, [c]);
  }
  const queues = Array.from(groups.values());
  const out: ScenarioCandidate[] = [];
  let i = 0;
  while (out.length < cap && queues.some((q) => q.length > 0)) {
    const q = queues[i % queues.length];
    if (q.length > 0) out.push(q.shift()!);
    i++;
  }
  return out;
}

const THEME_LABELS: Record<ScenarioTheme, Record<'ko' | 'en', string>> = {
  meditation: {
    ko: '명상관광 (사찰, 한옥스테이, 산사 등 정적이고 내면에 집중하는 여행)',
    en: 'meditation & temple stays (temples, hanok stays, quiet reflective travel)',
  },
  wellbeing: {
    ko: '웰빙관광 (온천, 찜질방, 힐링, 자연휴양림 등 몸과 마음의 회복에 초점)',
    en: 'wellness (hot springs, jjimjilbang, healing forests)',
  },
  shopping: {
    ko: '쇼핑관광 (아울렛, 백화점, 전통시장, 면세점 등)',
    en: 'shopping (outlets, department stores, traditional markets, duty-free)',
  },
  family: {
    ko: '대가족관광 (여러 세대가 함께 즐길 수 있는 키즈카페, 동물원, 과학관, 테마파크 등)',
    en: 'multi-generation family (kids cafes, zoos, science museums, theme parks)',
  },
  honeymoon: {
    ko: '허니문관광 (리조트, 오션뷰, 전망대, 스카이워크 등 로맨틱한 커플 여행)',
    en: 'honeymoon (resorts, ocean views, observatories, skywalks)',
  },
  night: {
    ko: '야간관광 (야시장, 야경 명소, 야간개장 등 밤에 즐기는 여행)',
    en: 'night tourism (night markets, night views, late-night attractions)',
  },
  hallyu: {
    ko: '한류관광 (드라마·영화 촬영지, 케이팝 관련 명소 등)',
    en: 'Hallyu / K-culture (drama filming locations, K-pop related spots)',
  },
  camping: {
    ko: '캠핑관광 (캠핑장, 글램핑, 오토캠핑 등 야외 숙영 여행)',
    en: 'camping (campgrounds, glamping, auto camping)',
  },
  walking: {
    ko: '걷기여행 (둘레길, 트레킹 코스, 올레길 등 도보 여행)',
    en: 'walking trails (dulle-gil, trekking courses, olle trails)',
  },
  marine: {
    ko: '해양관광 (해수욕장, 마리나, 요트 등 바다를 즐기는 여행)',
    en: 'marine & coast (beaches, marinas, yacht experiences)',
  },
};

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
  if (s.startsWith('en')) return 'en';
  return 'en';
}

interface StopDraft {
  contentId: string;
  note: string;
  title?: string;
}
interface DayDraft {
  day: number;
  dayTitle: string;
  stops: StopDraft[];
}
interface ScenarioDraft {
  region: string;
  regionLabel?: string;
  title: string;
  intro: string;
  days: DayDraft[];
}

function parseScenarioJson(text: string): ScenarioDraft {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = (fenced ? fenced[1] : text).trim();
  const parsed = JSON.parse(jsonText) as ScenarioDraft;
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.days)) {
    throw new Error('claude response is not a valid scenario object');
  }
  return parsed;
}

function buildPrompt(
  theme: ScenarioTheme,
  days: number,
  locale: string,
  localeLabel: string,
  regions: Array<{ region: string; candidates: ScenarioCandidate[] }>
): string {
  const themeLabel = THEME_LABELS[theme][locale === 'ko' ? 'ko' : 'en'];
  const regionListing = regions
    .map((r) => {
      const items = r.candidates
        .map((c) => `  - contentId="${c.contentId}" koreanTitle="${c.title}" address="${c.address}"`)
        .join('\n');
      return `[region: ${r.region}] (${r.candidates.length} candidates)\n${items}`;
    })
    .join('\n\n');

  if (locale === 'ko') {
    return `당신은 여로담(WayMeld)의 여행 시나리오 작가입니다.
테마 "${themeLabel}"에 맞는 ${days}일 여행 시나리오를 한국어로 작성하세요.

절대 규칙:
- 아래 제공된 지역 후보 목록 중 정확히 하나의 지역만 선택하고, 모든 일정을 그 지역 안에서만 구성하세요.
- 각 날의 stops에는 반드시 목록에 있는 contentId만 사용하세요. 목록에 없는 장소를 새로 지어내면 안 됩니다.
- 하루에 2~4곳을 배치하고, 하루 흐름(오전→오후→저녁)이 자연스럽게 이어지도록 순서를 정하세요.
- 같은 contentId를 여러 날에 중복 배치하지 마세요.
- title, intro, dayTitle, regionLabel, 각 stop의 title·note는 모두 한국어로 작성하세요.
- stop.title은 여행자가 읽기 쉬운 장소명(공식 한글명 가능)입니다.

지역별 후보:
${regionListing}

반드시 JSON만 응답하세요:
{"region":"선택한 지역명(목록에 있는 이름 그대로)","regionLabel":"표시용 지역명","title":"여행 시나리오 제목","intro":"3~5문장 도입부","days":[{"day":1,"dayTitle":"1일차 소제목","stops":[{"contentId":"...","title":"장소명","note":"..."}]}]}`;
  }

  return `You are the travel-scenario writer for WayMeld, a Korea trip planner.
Write a ${days}-day itinerary for the theme "${themeLabel}".

LANGUAGE LOCK (critical):
- Write title, intro, dayTitle, regionLabel, every stop.title, and every stop.note entirely in ${localeLabel}.
- Do not write those fields in Korean. Korean appears only in the candidate list as koreanTitle for reference.
- stop.title must be a natural ${localeLabel} place name a traveler would recognize (common English/Japanese/Chinese name, not a letter-by-letter romanization unless that is the usual name).
- regionLabel is the traveler-facing region name in ${localeLabel} (e.g. Seoul, Jeju, Busan).
- notes: 1–2 useful sentences in ${localeLabel} explaining why this stop fits the theme and the day's flow.

Hard rules:
- Pick exactly one region from the list. Every stop must be in that region.
- Use only contentId values from the list. Never invent places.
- 2–4 stops per day, morning→afternoon→evening flow.
- Do not reuse the same contentId across days.

Candidates:
${regionListing}

Respond with JSON only:
{"region":"exact region key from the list","regionLabel":"region name in ${localeLabel}","title":"scenario title in ${localeLabel}","intro":"3-5 sentence intro in ${localeLabel}","days":[{"day":1,"dayTitle":"day subtitle in ${localeLabel}","stops":[{"contentId":"...","title":"place name in ${localeLabel}","note":"..."}]}]}`;
}

function hasHangul(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text);
}

function draftLooksKorean(draft: ScenarioDraft): boolean {
  return hasHangul(String(draft.title ?? '')) || hasHangul(String(draft.intro ?? ''));
}

async function callClaude(prompt: string, apiKey: string, localeLabel: string): Promise<ScenarioDraft> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      system: `Output language: ${localeLabel} only for narrative JSON fields (title, intro, dayTitle, regionLabel, stop.title, stop.note). Return JSON only.`,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`claude api failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = json.content?.find((b) => b.type === 'text')?.text ?? '';
  return parseScenarioJson(text);
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

  const tourApiKey = Deno.env.get('TOUR_API_KEY')?.trim();
  const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY')?.trim();
  if (!tourApiKey || !claudeApiKey) {
    return new Response(
      JSON.stringify({ error: 'TOUR_API_KEY 또는 ANTHROPIC_API_KEY가 설정되지 않았습니다.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let theme: ScenarioTheme | '' = '';
  let days = 2;
  let locale = 'en';
  try {
    const body = (await req.json()) as { theme?: string; days?: number; locale?: string };
    theme = (body.theme ?? '') as ScenarioTheme;
    days = Math.min(Math.max(Math.round(Number(body.days ?? 2)), 1), 5);
    locale = normalizeRequestLocale(body.locale ?? 'en');
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!SCENARIO_THEME_QUERIES[theme as ScenarioTheme]) {
    return new Response(JSON.stringify({ error: '유효한 theme이 필요합니다.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const localeLabel = LOCALE_LABELS[locale] ?? LOCALE_LABELS.en;

  try {
    const { regionClusters } = await fetchThemeRegionClusters(theme as ScenarioTheme, tourApiKey);
    const topRegions = regionClusters
      .filter((c) => c.count >= 2)
      .slice(0, MAX_REGIONS_OFFERED)
      .map((c) => ({
        region: c.region,
        candidates: diversifyBySourceKeyword(c.candidates, MAX_CANDIDATES_PER_REGION),
      }));

    if (topRegions.length === 0) {
      return new Response(
        JSON.stringify({ error: '이 테마에 대해 지역 클러스터를 형성할 만큼 후보 데이터가 없습니다.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = buildPrompt(theme as ScenarioTheme, days, locale, localeLabel, topRegions);
    let draft = await callClaude(prompt, claudeApiKey, localeLabel);
    if (locale !== 'ko' && draftLooksKorean(draft)) {
      console.warn('tour-scenario: narrative still Korean, retrying once');
      draft = await callClaude(
        `${prompt}\n\nRETRY: The previous JSON was in Korean. Rewrite every narrative field in ${localeLabel}. Keep "region" as the exact list key. stop.title and stop.note must be ${localeLabel}.`,
        claudeApiKey,
        localeLabel
      );
    }

    const chosenRegion =
      topRegions.find((r) => r.region === draft.region) ??
      (topRegions.length === 1 ? topRegions[0] : undefined);
    if (!chosenRegion) {
      return new Response(
        JSON.stringify({
          error: 'AI가 제공된 지역 목록 밖의 지역을 선택했습니다.',
          offeredRegions: topRegions.map((r) => r.region),
          claudeRegion: draft.region,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const candidateById = new Map(chosenRegion.candidates.map((c) => [c.contentId, c]));

    const usedIds = new Set<string>();
    const droppedStops: string[] = [];
    const days_: Array<{
      day: number;
      dayTitle: string;
      stops: Array<{
        placeId: string;
        contentId: string;
        contentTypeId: string;
        title: string;
        titleKo: string;
        address: string;
        lat: number;
        lng: number;
        thumbnailUrl?: string;
        note: string;
      }>;
    }> = [];

    for (const d of draft.days) {
      const stops = [];
      for (const s of d.stops ?? []) {
        const candidate = candidateById.get(s.contentId);
        if (!candidate || usedIds.has(s.contentId)) {
          droppedStops.push(s.contentId);
          continue;
        }
        usedIds.add(s.contentId);
        const localizedTitle = String(s.title ?? '').trim();
        stops.push({
          placeId: `tour:${candidate.contentTypeId}:${candidate.contentId}`,
          contentId: candidate.contentId,
          contentTypeId: candidate.contentTypeId,
          title: localizedTitle || candidate.title,
          titleKo: candidate.title,
          address: candidate.address,
          lat: candidate.lat,
          lng: candidate.lng,
          thumbnailUrl: candidate.thumbnailUrl,
          note: String(s.note ?? '').trim(),
        });
      }
      if (stops.length > 0) {
        days_.push({ day: d.day, dayTitle: String(d.dayTitle ?? '').trim(), stops });
      }
    }

    return new Response(
      JSON.stringify({
        theme,
        region: chosenRegion.region,
        regionLabel: String(draft.regionLabel ?? '').trim() || chosenRegion.region,
        title: draft.title,
        intro: draft.intro,
        days: days_,
        offeredRegions: topRegions.map((r) => ({ region: r.region, candidateCount: r.candidates.length })),
        droppedStopContentIds: droppedStops,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('tour-scenario failed', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
