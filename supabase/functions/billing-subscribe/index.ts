import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/serviceClient.ts';
import { getCallerUserId } from '../_shared/callerAuth.ts';
import { verifyPayment } from '../_shared/portoneApi.ts';

const PLUS_MONTHLY_PRICE_KRW = 4900; // src/lib/subscription.ts의 PLUS_MONTHLY_PRICE_KRW와 동기화 유지

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const userId = await getCallerUserId(req);
    const body = await req.json();
    const billingKey = String(body.billingKey ?? '');
    const paymentId = String(body.paymentId ?? '');
    if (!billingKey || !paymentId) {
      throw new Error('billingKey/paymentId가 필요합니다.');
    }

    // 클라이언트가 "결제 성공"이라고 알려온 것을 그대로 믿지 않고 서버에서 재검증한다
    const payment = await verifyPayment(paymentId);
    if (payment.status !== 'PAID' || payment.amountTotal !== PLUS_MONTHLY_PRICE_KRW) {
      throw new Error(`결제 검증 실패 (status=${payment.status}, amount=${payment.amountTotal})`);
    }

    const sb = getServiceClient();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { error: customerError } = await sb.from('billing_customers').upsert(
      {
        user_id: userId,
        provider: 'portone',
        billing_key: billingKey,
        updated_at: now.toISOString(),
      },
      { onConflict: 'user_id' }
    );
    if (customerError) throw customerError;

    const { error: profileError } = await sb
      .from('profiles')
      .update({
        plan: 'plus',
        subscription_status: 'active',
        subscription_expires_at: expiresAt.toISOString(),
      })
      .eq('id', userId);
    if (profileError) throw profileError;

    const { error: eventError } = await sb.from('billing_events').insert({
      user_id: userId,
      provider_event_id: `subscribe:${paymentId}`,
      type: 'payment_success',
      amount: PLUS_MONTHLY_PRICE_KRW,
      raw_payload: { paymentId, billingKey: '[redacted]' },
    });
    if (eventError && !String(eventError.message).includes('duplicate')) throw eventError;

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
