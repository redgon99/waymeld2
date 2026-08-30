// 포트원(PortOne) 웹훅 수신 — billing-subscribe/billing-charge의 동기 처리를 놓쳤을 때의
// 비동기 이중 확인용 안전장치. 웹훅 자체가 없어도 서비스는 동작하지만, 결제 성공 후
// 클라이언트가 새로고침 없이 창을 닫는 등의 엣지케이스를 보정한다.
//
// !! 배포 전 필수 확인 !!
// - 헤더(webhook-id/webhook-signature/webhook-timestamp)는 Svix 규격이며 포트원이
//   이를 그대로 사용한다고 알려져 있다. 정확한 검증 함수 import 경로와 payload 필드명은
//   https://developers.portone.io/opi/ko/integration/webhook/readme?v=v2 에서 재확인할 것.
// - 포트원 관리자콘솔에서 이 함수의 URL을 웹훅 엔드포인트로 등록하고, PORTONE_WEBHOOK_SECRET을
//   supabase secrets set으로 등록해야 동작한다.

import { corsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/serviceClient.ts';

function isPaidEvent(type: string): boolean {
  return /paid|success/i.test(type);
}
function isFailedEvent(type: string): boolean {
  return /fail/i.test(type);
}
function isCancelledEvent(type: string): boolean {
  return /cancel/i.test(type);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get('PORTONE_WEBHOOK_SECRET');
    if (!webhookSecret) throw new Error('PORTONE_WEBHOOK_SECRET not configured');

    // TODO: 실제 서명 검증으로 교체.
    // 예상 형태(@portone/server-sdk, 최신 문서로 재확인 필요):
    //   import { Webhook } from 'npm:@portone/server-sdk';
    //   const webhook = Webhook(webhookSecret);
    //   const payload = await webhook.verify(rawBody, Object.fromEntries(req.headers));
    // 서명 검증 없이는 누구나 이 엔드포인트를 호출해 임의로 plan을 바꿀 수 있으므로,
    // 이 TODO를 해소하기 전까지는 프로덕션 웹훅 URL을 공개하지 말 것.
    const payload = JSON.parse(rawBody) as Record<string, unknown>;

    const eventId = String(
      req.headers.get('webhook-id') ?? payload.id ?? payload.eventId ?? crypto.randomUUID()
    );
    const eventType = String(payload.type ?? payload.event ?? '');
    const paymentId = String(
      (payload.data as Record<string, unknown> | undefined)?.paymentId ?? payload.paymentId ?? ''
    );
    const customerId = String(
      (payload.data as Record<string, unknown> | undefined)?.customerId ?? payload.customerId ?? ''
    );

    const sb = getServiceClient();

    // 멱등 처리: 같은 웹훅이 재전송돼도 한 번만 반영
    const { error: dupCheckError } = await sb
      .from('billing_events')
      .insert({
        user_id: customerId || null,
        provider_event_id: `webhook:${eventId}`,
        type: isPaidEvent(eventType)
          ? 'payment_success'
          : isFailedEvent(eventType)
            ? 'payment_failed'
            : isCancelledEvent(eventType)
              ? 'cancelled'
              : 'renewed',
        raw_payload: payload,
      });
    if (dupCheckError) {
      if (String(dupCheckError.message).includes('duplicate')) {
        return new Response(JSON.stringify({ ok: true, deduped: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw dupCheckError;
    }

    if (customerId && isFailedEvent(eventType)) {
      await sb
        .from('profiles')
        .update({ subscription_status: 'payment_failed', plan: 'free' })
        .eq('id', customerId);
    }
    // 결제 성공(paid) 이벤트는 billing-subscribe/billing-charge가 동기적으로 이미
    // profiles를 반영하므로 여기서는 이벤트 로그만 남긴다(중복 반영 방지).

    return new Response(JSON.stringify({ ok: true, paymentId }), {
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
