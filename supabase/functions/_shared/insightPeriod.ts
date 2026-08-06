/** 수집 대상 기간 — 클라이언트 body / Edge Function 공용 */

export interface CollectionPeriodInput {
  /** 최근 N일 (from만 설정). 0 또는 생략이면 전체(또는 from/to 사용) */
  periodDays?: number;
  /** YYYY-MM-DD */
  from?: string;
  /** YYYY-MM-DD */
  to?: string;
}

export interface CollectionPeriod {
  fromMs: number | null;
  toMs: number | null;
  label: string;
}

function startOfDayUtc(ymd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const ms = Date.parse(`${ymd}T00:00:00.000Z`);
  return Number.isNaN(ms) ? null : ms;
}

function endOfDayUtc(ymd: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const ms = Date.parse(`${ymd}T23:59:59.999Z`);
  return Number.isNaN(ms) ? null : ms;
}

export function parseCollectionPeriod(input: CollectionPeriodInput | null | undefined): CollectionPeriod {
  const fromYmd = input?.from?.trim() || '';
  const toYmd = input?.to?.trim() || '';
  const days = typeof input?.periodDays === 'number' ? input.periodDays : undefined;

  if (fromYmd || toYmd) {
    const fromMs = fromYmd ? startOfDayUtc(fromYmd) : null;
    const toMs = toYmd ? endOfDayUtc(toYmd) : null;
    const label =
      fromYmd && toYmd
        ? `${fromYmd} ~ ${toYmd}`
        : fromYmd
          ? `${fromYmd} 이후`
          : `${toYmd} 이전`;
    return { fromMs, toMs, label };
  }

  if (days != null && days > 0) {
    const toMs = Date.now();
    const fromMs = toMs - days * 24 * 60 * 60 * 1000;
    return { fromMs, toMs, label: `최근 ${days}일` };
  }

  return { fromMs: null, toMs: null, label: '전체 기간' };
}

export function periodHasFilter(period: CollectionPeriod): boolean {
  return period.fromMs != null || period.toMs != null;
}

/** 기간 필터가 있을 때 날짜 없는 항목은 제외 */
export function isWithinCollectionPeriod(
  isoOrMs: string | number | null | undefined,
  period: CollectionPeriod
): boolean {
  if (!periodHasFilter(period)) return true;
  if (isoOrMs == null || isoOrMs === '') return false;
  const ms = typeof isoOrMs === 'number' ? isoOrMs : Date.parse(isoOrMs);
  if (Number.isNaN(ms)) return false;
  if (period.fromMs != null && ms < period.fromMs) return false;
  if (period.toMs != null && ms > period.toMs) return false;
  return true;
}

export function toRfc3339(ms: number): string {
  return new Date(ms).toISOString();
}
