import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/serviceClient.ts';

const MOCK_MAIL_RE = /^user([1-9]|[12][0-9]|30)@mail\.com$/i;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST만 지원합니다.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as { email?: unknown };
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!MOCK_MAIL_RE.test(email)) {
      throw new Error('목업 계정만 이메일 단독 로그인이 가능합니다.');
    }

    const n = Number(email.match(/^user(\d+)@mail\.com$/i)?.[1]);
    const uid = `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
    const sb = getServiceClient();
    const { data: found, error: foundError } = await sb.auth.admin.getUserById(uid);
    if (foundError || !found.user) throw new Error('목업 계정을 찾을 수 없습니다.');
    if ((found.user.email ?? '').toLowerCase() !== email) {
      throw new Error('목업 계정 이메일이 일치하지 않습니다.');
    }
    if (found.user.user_metadata?.mock !== true) {
      throw new Error('시험용 목업 계정이 아닙니다.');
    }

    const { data: link, error: linkError } = await sb.auth.admin.generateLink({
      type: 'magiclink',
      email,
    });
    if (linkError) throw linkError;
    const tokenHash = link.properties?.hashed_token;
    if (!tokenHash) throw new Error('로그인 토큰을 만들지 못했습니다.');

    return new Response(JSON.stringify({ token_hash: tokenHash }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
