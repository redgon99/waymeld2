import { corsHeaders } from '../_shared/cors.ts';
import { fetchThemeRegionClusters, SCENARIO_THEME_QUERIES, type ScenarioTheme } from '../_shared/tourScenario.ts';

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

  let theme: ScenarioTheme | '' = '';
  try {
    const body = (await req.json()) as { theme?: string };
    theme = (body.theme ?? '') as ScenarioTheme;
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

  try {
    const { regionClusters, rawCountsByQuery } = await fetchThemeRegionClusters(
      theme as ScenarioTheme,
      serviceKey
    );
    const totalCandidates = regionClusters.reduce((sum, c) => sum + c.count, 0);
    return new Response(
      JSON.stringify({
        theme,
        rawCountsByQuery,
        totalCandidates,
        regionClusters: regionClusters
          .slice(0, 8)
          .map((c) => ({ ...c, candidates: c.candidates.slice(0, 15) })),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('tour-scenario-candidates failed', e);
    return new Response(JSON.stringify({ error: 'Proxy fetch failed' }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
