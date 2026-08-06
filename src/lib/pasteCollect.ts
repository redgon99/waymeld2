/** 붙여넣기 텍스트에서 장소 후보 추출 (줄·쉼표·불릿 분리) */
export function extractPlaceCandidates(text: string): string[] {
  const raw = text
    .split(/[\n,;|•·]+/)
    .map((s) => s.replace(/^[\s\-*\d.)]+/, '').trim())
    .filter((s) => s.length >= 2 && s.length <= 80);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of raw) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out.slice(0, 20);
}
