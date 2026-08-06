/** 검색어를 쉼표·줄바꿈·세미콜론 기준으로 분리 (최대 5개) */
export function splitSearchQueries(text: string): string[] {
  const raw = text
    .split(/[\n,;|]+/)
    .map((s) => s.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter((s) => s.length >= 1);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
    if (out.length >= 5) break;
  }
  return out;
}
