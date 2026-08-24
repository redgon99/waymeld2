/**
 * 관리자 전용: 테마+일수 하나에 대해 지역·스팟을 1회 선정(한국어)한 뒤,
 * 같은 스팟 구성을 고정한 채 en/ja/zh/es/fr/de/ru 서술문을 추가로 생성해 scenario_catalog에
 * draft 행으로 저장한다. 플래너는 이 테이블만 읽으므로(카탈로그 전용) 언어별로
 * 다른 장소가 나오는 일이 없도록 select(장소 선정)와 narrate(서술문 작성)를 분리했다.
 */
import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/insightDb.ts';
import { requireAdminCaller } from '../_shared/adminAuth.ts';
import { fetchThemeRegionClusters, SCENARIO_THEME_QUERIES, type ScenarioTheme } from '../_shared/tourScenario.ts';
import { fetchStopTags } from '../_shared/tourTags.ts';
import { fetchOfficialAddress, type MultilingualLocale } from '../_shared/tourMultilingual.ts';
import {
  buildNarratePrompt,
  buildSelectPrompt,
  callClaude,
  candidatesPerRegionCap,
  diversifyBySourceKeyword,
  draftLooksKorean,
  LOCALE_LABELS,
  type FixedDay,
  type ScenarioDraft,
} from '../_shared/scenarioGen.ts';

const MAX_REGIONS_OFFERED = 3;
const NARRATE_LOCALES = ['en', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru'] as const;

interface GroundedStop {
  placeId: string;
  contentId: string;
  contentTypeId: string;
  titleKo: string;
  address: string;
  lat: number;
  lng: number;
  thumbnailUrl?: string;
  sourceApi?: 'gocamping';
  petFriendly?: boolean;
  accessible?: boolean;
}
interface GroundedDay {
  day: number;
  dayTitleKo: string;
  stops: GroundedStop[];
}

interface LocaleContent {
  regionLabel: string;
  title: string;
  intro: string;
  days: Array<{
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
  }>;
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

  try {
    await requireAdminCaller(req);

    let theme: ScenarioTheme | '' = '';
    let days = 2;
    try {
      const body = (await req.json()) as { theme?: string; days?: number };
      theme = (body.theme ?? '') as ScenarioTheme;
      days = Math.min(Math.max(Math.round(Number(body.days ?? 2)), 1), 7);
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

    // 1) 지역/스팟 선정 — 한국어로 1회만 수행, 이후 언어는 이 결과에 고정된다.
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

    const selectPrompt = buildSelectPrompt(theme as ScenarioTheme, days, 'ko', LOCALE_LABELS.ko, topRegions);
    const selectDraft = await callClaude(selectPrompt, claudeApiKey, LOCALE_LABELS.ko);

    const chosenRegion =
      topRegions.find((r) => r.region === selectDraft.region) ??
      (topRegions.length === 1 ? topRegions[0] : undefined);
    if (!chosenRegion) {
      return new Response(
        JSON.stringify({
          error: 'AI가 제공된 지역 목록 밖의 지역을 선택했습니다.',
          offeredRegions: topRegions.map((r) => r.region),
          claudeRegion: selectDraft.region,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const candidateById = new Map(chosenRegion.candidates.map((c) => [c.contentId, c]));

    const usedIds = new Set<string>();
    const grounded: GroundedDay[] = [];
    for (const d of selectDraft.days) {
      const stops: GroundedStop[] = [];
      for (const s of d.stops ?? []) {
        const candidate = candidateById.get(s.contentId);
        if (!candidate || usedIds.has(s.contentId)) continue;
        usedIds.add(s.contentId);
        stops.push({
          placeId: `tour:${candidate.contentTypeId}:${candidate.contentId}`,
          contentId: candidate.contentId,
          contentTypeId: candidate.contentTypeId,
          titleKo: candidate.title,
          address: candidate.address,
          lat: candidate.lat,
          lng: candidate.lng,
          thumbnailUrl: candidate.thumbnailUrl,
          sourceApi: candidate.sourceApi,
        });
      }
      if (stops.length > 0) {
        grounded.push({ day: d.day, dayTitleKo: String(d.dayTitle ?? '').trim(), stops });
      }
    }
    if (grounded.length === 0) {
      return new Response(
        JSON.stringify({ error: 'AI가 선택한 스팟이 후보 목록과 일치하지 않아 시나리오를 만들지 못했습니다.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 확정된 스팟(언어 무관, 1회만)에 반려동물 동반가능/무장애 배지를 붙인다.
    const allStopIds = grounded.flatMap((d) => d.stops.map((s) => s.contentId));
    const stopTags = await fetchStopTags(allStopIds, tourApiKey);
    for (const d of grounded) {
      for (const s of d.stops) {
        const tags = stopTags.get(s.contentId);
        if (tags?.petFriendly) s.petFriendly = true;
        if (tags?.accessible) s.accessible = true;
      }
    }

    function localeContentFromDraft(draft: ScenarioDraft): LocaleContent {
      const noteById = new Map<string, { title: string; note: string }>();
      for (const d of draft.days) {
        for (const s of d.stops ?? []) {
          noteById.set(s.contentId, { title: String(s.title ?? '').trim(), note: String(s.note ?? '').trim() });
        }
      }
      const dayTitleById = new Map(draft.days.map((d) => [d.day, String(d.dayTitle ?? '').trim()]));
      return {
        regionLabel: String(draft.regionLabel ?? '').trim() || chosenRegion.region,
        title: draft.title,
        intro: draft.intro,
        days: grounded.map((d) => ({
          day: d.day,
          dayTitle: dayTitleById.get(d.day) || d.dayTitleKo,
          stops: d.stops.map((s) => {
            const narrated = noteById.get(s.contentId);
            return {
              placeId: s.placeId,
              contentId: s.contentId,
              contentTypeId: s.contentTypeId,
              title: narrated?.title || s.titleKo,
              titleKo: s.titleKo,
              address: s.address,
              lat: s.lat,
              lng: s.lng,
              thumbnailUrl: s.thumbnailUrl,
              sourceApi: s.sourceApi,
              petFriendly: s.petFriendly,
              accessible: s.accessible,
              note: narrated?.note || '',
            };
          }),
        })),
      };
    }

    /**
     * 확정된 좌표는 그대로 두고 주소 표시 텍스트만 해당 언어의 공식 TourAPI
     * 다국어서비스(EngService2 등)로 반경매칭해 승격한다. GoCamping처럼 접두사가
     * 붙은 스팟(gocamping:*)은 다국어 서비스 대상이 아니므로 건너뛴다. 매칭 실패시
     * 원문(한국어) 주소를 그대로 둔다 — 커버리지가 KorService2의 일부뿐이라 흔한 경우다.
     */
    async function overlayOfficialAddresses(localeContent: LocaleContent, locale: MultilingualLocale) {
      const stops = localeContent.days.flatMap((d) => d.stops);
      await Promise.all(
        stops.map(async (s) => {
          if (s.sourceApi) return;
          const match = await fetchOfficialAddress(locale, tourApiKey, s.titleKo, s.lat, s.lng);
          if (match) s.address = match.address;
        })
      );
    }

    const content: Record<string, LocaleContent> = {
      ko: localeContentFromDraft(selectDraft),
    };

    // 2) 확정된 스팟 구성을 고정한 채 다국어 서술문만 새로 생성 (그라운딩: contentId는 원본 스팟에서만 매핑)
    const fixedDays: FixedDay[] = grounded.map((d) => ({
      day: d.day,
      dayTitle: d.dayTitleKo,
      stops: d.stops.map((s) => ({ contentId: s.contentId, koreanTitle: s.titleKo, address: s.address })),
    }));

    for (const locale of NARRATE_LOCALES) {
      const localeLabel = LOCALE_LABELS[locale];
      const narratePrompt = buildNarratePrompt(theme as ScenarioTheme, locale, localeLabel, chosenRegion.region, fixedDays);
      let narrateDraft = await callClaude(narratePrompt, claudeApiKey, localeLabel);
      if (draftLooksKorean(narrateDraft)) {
        console.warn(`tour-scenario-catalog-generate: ${locale} narrative still Korean, retrying once`);
        narrateDraft = await callClaude(
          `${narratePrompt}\n\nRETRY: The previous JSON was in Korean. Rewrite every narrative field in ${localeLabel}.`,
          claudeApiKey,
          localeLabel
        );
      }
      content[locale] = localeContentFromDraft(narrateDraft);
      await overlayOfficialAddresses(content[locale], locale);
    }

    const { data: inserted, error: insertError } = await getServiceClient()
      .from('scenario_catalog')
      .insert({
        theme,
        days: grounded.length,
        region: chosenRegion.region,
        status: 'draft',
        content,
        candidate_region_count: chosenRegion.candidates.length,
      })
      .select('id, theme, days, region, status, content, candidate_region_count, created_at')
      .single();
    if (insertError) throw insertError;

    return new Response(JSON.stringify({ entry: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('tour-scenario-catalog-generate failed', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
