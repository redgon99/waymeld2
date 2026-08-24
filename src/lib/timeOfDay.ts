/** "HH:MM" ↔ 자정 기준 분(minute) 변환 */

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidHHMM(value: string | undefined | null): value is string {
  return typeof value === 'string' && HHMM.test(value);
}

export function parseHHMM(value: string): number {
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

export function formatHHMM(totalMinutes: number): string {
  const m = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}
