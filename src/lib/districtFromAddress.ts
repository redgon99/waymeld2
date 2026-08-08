/**
 * 한국 주소 문자열에서 구·시·군·읍·면 단위 District 라벨을 추출한다.
 * 예: "서울특별시 종로구 사직동 …" → "종로구"
 *     "제주특별자치도 서귀포시 성산읍 …" → "서귀포시 (성산읍)"
 */

const SIDO_RE =
  /^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|제주특별자치도|강원특별자치도|전북특별자치도|경기도|충청북도|충청남도|전라남도|경상북도|경상남도|강원도|전라북도)\s*/;

const SIGUNGU_RE =
  /([가-힣]+(?:시|군|구))(?:\s+([가-힣]+(?:구)))?(?:\s+([가-힣]+(?:읍|면)))?/;

/** 영문/간단 주소 폴백 — 첫 1~2 토큰 */
function fallbackDistrict(raw: string): string {
  const cleaned = raw.replace(/^대한민국\s*/, '').trim();
  if (!cleaned) return '';
  const parts = cleaned.split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  // "Mapo-gu (Hongdae)" 형태 유지
  return parts.slice(0, 2).join(' ');
}

export function districtFromAddress(
  address?: string | null,
  roadAddress?: string | null
): string {
  const raw = (roadAddress || address || '').trim();
  if (!raw) return '';

  const withoutSido = raw.replace(SIDO_RE, '');
  const m = withoutSido.match(SIGUNGU_RE);
  if (!m) return fallbackDistrict(raw);

  const cityOrGu = m[1];
  const nestedGu = m[2];
  const eupMyeon = m[3];

  // 성남시 분당구 → "성남시 분당구"
  if (nestedGu) {
    return eupMyeon ? `${cityOrGu} ${nestedGu} (${eupMyeon})` : `${cityOrGu} ${nestedGu}`;
  }
  // 서귀포시 성산읍 → "서귀포시 (성산읍)"
  if (eupMyeon) return `${cityOrGu} (${eupMyeon})`;
  return cityOrGu;
}
