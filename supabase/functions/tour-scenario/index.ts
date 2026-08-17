import { corsHeaders } from '../_shared/cors.ts';
import { fetchThemeRegionClusters, SCENARIO_THEME_QUERIES, type ScenarioTheme } from '../_shared/tourScenario.ts';
import { fetchStopTags } from '../_shared/tourTags.ts';
import {
  buildSelectPrompt,
  callClaude,
  candidatesPerRegionCap,
  diversifyBySourceKeyword,
  draftLooksKorean,
  LOCALE_LABELS,
  normalizeRequestLocale,
} from '../_shared/scenarioGen.ts';

const MAX_REGIONS_OFFERED = 3;

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
    days = Math.min(Math.max(Math.round(Number(body.days ?? 2)), 1), 7);
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
        candidates: diversifyBySourceKeyword(c.candidates, candidatesPerRegionCap(days)),
      }));

    if (topRegions.length === 0) {
      return new Response(
        JSON.stringify({ error: '이 테마에 대해 지역 클러스터를 형성할 만큼 후보 데이터가 없습니다.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = buildSelectPrompt(theme as ScenarioTheme, days, locale, localeLabel, topRegions);
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
        sourceApi?: 'gocamping';
        petFriendly?: boolean;
        accessible?: boolean;
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
          sourceApi: candidate.sourceApi,
          note: String(s.note ?? '').trim(),
        });
      }
      if (stops.length > 0) {
        days_.push({ day: d.day, dayTitle: String(d.dayTitle ?? '').trim(), stops });
      }
    }

    const stopTags = await fetchStopTags(
      days_.flatMap((d) => d.stops.map((s) => s.contentId)),
      tourApiKey
    );
    for (const d of days_) {
      for (const s of d.stops) {
        const tags = stopTags.get(s.contentId);
        if (tags?.petFriendly) s.petFriendly = true;
        if (tags?.accessible) s.accessible = true;
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
