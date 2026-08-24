/**
 * 장소 이름 → 매칭 키. src/lib/placeKey.ts 와 규칙이 동일해야 한다.
 * (한쪽만 바꾸면 이미 저장된 place_key와 클라이언트 조회 키가 어긋난다)
 */

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
