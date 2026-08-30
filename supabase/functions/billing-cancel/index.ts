import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/serviceClient.ts';
import { getCallerUserId } from '../_shared/callerAuth.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userId = await getCallerUserId(req);
    const sb = getServiceClient();

    // plan은 결제 주기가 끝날 때까지 유지한다 — 실제 free 전환은 billing-charge 크론이
    // subscription_expires_at 경과 + status='cancelled'인 계정을 스캔해 처리한다.
    const { error: profileError } = await sb
      .from('profiles')
      .update({ subscription_status: 'cancelled' })
      .eq('id', userId);
    if (profileError) throw profileError;

    const { error: eventError } = await sb.from('billing_events').insert({
      user_id: userId,
      provider_event_id: `cancel:${userId}:${Date.now()}`,
      type: 'cancelled',
      raw_payload: {},
    });
    if (eventError) throw eventError;

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
