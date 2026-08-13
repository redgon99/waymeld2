/**
 * 한국 주소 문자열에서 시도 단위 접두어를 뽑아낸다 (예: "제주특별자치도 제주시 ..." → "제주특별자치도").
 * Tour API의 시도 코드(areaCode)는 신뢰할 수 없어(항상 0건) 텍스트 매칭으로 지역을 좁힌다.
 */
export function regionPrefixOf(address: string | undefined | null): string | undefined {
  if (!address) return undefined;
  const first = address.trim().split(/\s+/)[0];
  return first || undefined;
}
