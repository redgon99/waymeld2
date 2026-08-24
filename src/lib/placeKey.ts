/**
 * 장소 이름 → 매칭 키.
 *
 * insight 게시물에서 뽑은 장소명과 검색 결과 장소명은 표기가 제각각이라
 * (공백·중점·괄호·「본점」 같은 접미어) 정규화한 키로만 대조한다.
 * supabase/functions/_shared/placeKey.ts 와 규칙이 동일해야 한다.
 */

/** 지점·분점 표기처럼 같은 장소를 다르게 부르게 만드는 접미어 */
const TRAILING_NOISE = /(본점|직영점|지점|점포|store|branch)$/;

export function placeKey(name: string): string {
  const base = name
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '');
  return base.replace(TRAILING_NOISE, '');
}

/** 같은 장소를 가리킬 수 있는 후보 키들 (한국어 표기 + 로마자 표기 등) */
export function placeKeyCandidates(...names: Array<string | undefined | null>): string[] {
  const keys = names
    .filter((n): n is string => Boolean(n && n.trim()))
    .map(placeKey)
    .filter((k) => k.length >= 2);
  return [...new Set(keys)];
}
