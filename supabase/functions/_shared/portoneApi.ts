// 포트원(PortOne) V2 REST API 최소 래퍼.
//
// !! 배포 전 필수 확인 !!
// 아래 엔드포인트·헤더 형식은 문서 조사 시점(2026-08-27) 기준으로 작성했다.
// 실제 storeId/API Secret을 발급받은 뒤 반드시 아래 공식 문서로 재검증할 것:
//   - 인증 헤더 형식: https://developers.portone.io/api/rest-v2 (V2 API Secret, "Authorization: PortOne {API_SECRET}" 형식으로 알려져 있음)
//   - 결제 단건조회:   https://developers.portone.io/api/rest-v2/payment
//   - 빌링키 결제 요청: https://developers.portone.io/api/rest-v2/payment.billingKey
// 필드명 하나라도 다르면 조용히 실패하거나 잘못 과금될 수 있으므로, 반드시 포트원
// 테스트 스토어로 전체 플로우를 리허설한 뒤 프로덕션 키로 전환할 것.

const API_BASE = 'https://api.portone.io';

function apiSecret(): string {
  const v = Deno.env.get('PORTONE_API_SECRET');
  if (!v) throw new Error('PORTONE_API_SECRET not configured');
  return v;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `PortOne ${apiSecret()}`,
    'Content-Type': 'application/json',
  };
}

export interface PortOnePaymentInfo {
  status: string; // 예: 'PAID' — 정확한 값은 문서 재확인
  amountTotal: number;
  paymentId: string;
}

/** 클라이언트가 알려온 결제가 실제로 성공했는지 서버에서 재검증한다 (클라이언트 응답만으로 신뢰 금지) */
export async function verifyPayment(paymentId: string): Promise<PortOnePaymentInfo> {
  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error(`포트원 결제 조회 실패: ${res.status}`);
  }
  const data = await res.json();
  return {
    status: String(data.status ?? ''),
    amountTotal: Number(data.amount?.total ?? 0),
    paymentId,
  };
}

/** 저장된 빌링키로 정기결제(재청구)를 실행한다 */
export async function chargeWithBillingKey(params: {
  billingKey: string;
  paymentId: string;
  orderName: string;
  amountTotal: number;
  customerId: string;
}): Promise<PortOnePaymentInfo> {
  const res = await fetch(
    `${API_BASE}/payments/${encodeURIComponent(params.paymentId)}/billing-key`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        billingKey: params.billingKey,
        orderName: params.orderName,
        customer: { id: params.customerId },
        amount: { total: params.amountTotal },
        currency: 'KRW',
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`포트원 빌링키 결제 실패: ${res.status} ${text}`);
  }
  const data = await res.json();
  return {
    status: String(data.status ?? data.payment?.status ?? ''),
    amountTotal: Number(data.amount?.total ?? params.amountTotal),
    paymentId: params.paymentId,
  };
}
