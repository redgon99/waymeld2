/** 검색어를 쉼표·줄바꿈·세미콜론·불릿 기준으로 분리 (붙여넣기 목록 포함, 최대 20개) */
export function splitSearchQueries(text: string): string[] {
  const raw = text
    .split(/[\n,;|•·]+/)
    .map((s) => s.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter((s) => s.length >= 1 && s.length <= 80);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
    if (out.length >= 20) break;
  }
  return out;
}

/** 여러 줄·목록 붙여넣기인지 (검색창 통합 추출용) */
export function looksLikePastedPlaceList(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (/[\n]/.test(t)) return true;
  if ((t.match(/[,;|•·]/g) ?? []).length >= 2) return true;
  return false;
}
