/** 카카오 panel3 open_hours.headline 기준 영업 상태 */
export type BusinessOpenStatus = 'open' | 'scheduled' | 'closed' | 'offday';

export type PlaceOpeningStatus = BusinessOpenStatus | 'unknown';

export const OPEN_STATUS_LABEL: Record<BusinessOpenStatus, string> = {
  open: '영업중',
  scheduled: '영업예정',
  closed: '영업종료',
  offday: '휴무일',
};

export interface OpenHoursHeadline {
  code?: string;
  displayText: string;
  displayTextInfo?: string;
}

function isHolidayDay(combined: string): boolean {
  return /(휴무일|정기\s*휴무|휴무\s*일|매주\s*[^\s]{1,2}요일\s*휴무|오늘\s*휴무|금일\s*휴무)/i.test(
    combined
  );
}

const WEEKDAY_CHARS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 한국 시간 기준 요일 (0=일 … 6=토) */
function getKoreaWeekdayIndex(now = new Date()): number {
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return kst.getDay();
}

/** 문구에 적힌 요일 (0=일 … 6=토), 없으면 null */
function parseMentionedWeekdayIndex(text: string): number | null {
  const t = text.trim();
  if (!t) return null;

  const full = t.match(/(일|월|화|수|목|금|토)요일/);
  if (full) {
    const idx = WEEKDAY_CHARS.indexOf(full[1] as (typeof WEEKDAY_CHARS)[number]);
    return idx >= 0 ? idx : null;
  }

  const short =
    t.match(/(?:^|[\s,])(일|월|화|수|목|금|토)\s+\d{1,2}:\d{2}/) ??
    t.match(/(?:^|[\s,])(일|월|화|수|목|금|토)\s+.*오픈/);
  if (short) {
    const idx = WEEKDAY_CHARS.indexOf(short[1] as (typeof WEEKDAY_CHARS)[number]);
    return idx >= 0 ? idx : null;
  }

  return null;
}

/** 내일·모레·다른 요일 등 오늘이 아닌 날 오픈 */
function isNotTodayOpen(text: string, now = new Date()): boolean {
  const t = text.trim();
  if (!t) return false;

  if (/^(내일|모레|다음날|다다음날)\b/i.test(t)) return true;
  if (/내일\s*\d|모레\s*\d/i.test(t)) return true;

  const mentioned = parseMentionedWeekdayIndex(t);
  if (mentioned !== null && mentioned !== getKoreaWeekdayIndex(now)) {
    return true;
  }

  return false;
}

/** 검색 시점 기준 오늘 중 이후 영업 시작 */
function hasUpcomingOpenToday(
  displayText: string,
  displayTextInfo?: string,
  now = new Date()
): boolean {
  const info = (displayTextInfo ?? '').trim();
  const full = `${displayText} ${info}`.trim();

  if (info && isNotTodayOpen(info, now)) return false;
  if (isNotTodayOpen(full, now) && !/(오늘|금일)/i.test(full)) {
    return false;
  }

  if (/(오늘|금일).{0,24}오픈/i.test(full)) return true;
  if (/영업\s*전/i.test(full)) return true;
  if (/브레이크/i.test(full)) return true;
  if (/재오픈/i.test(full) && !/내일|모레/i.test(info) && !isNotTodayOpen(info, now)) {
    return true;
  }

  if (/\d{1,2}:\d{2}\s*오픈/i.test(full) && !/내일|모레/i.test(full)) {
    const mentioned = parseMentionedWeekdayIndex(full);
    if (mentioned === null) return true;
    return mentioned === getKoreaWeekdayIndex(now);
  }

  if (info && /오픈|영업\s*전|재오픈/i.test(info)) {
    if (isNotTodayOpen(info, now)) return false;
    return true;
  }

  if (/오픈\s*예정/i.test(full) && !/내일|모레/i.test(full) && !isNotTodayOpen(full, now)) {
    return true;
  }

  return false;
}

export function getBusinessOpenStatus(
  headline: OpenHoursHeadline | undefined,
  now = new Date()
): BusinessOpenStatus | null {
  if (!headline) return null;

  const { displayText, displayTextInfo, code } = headline;
  const combined = `${displayText} ${displayTextInfo ?? ''}`.trim();
  const upperCode = code?.toUpperCase();

  if (upperCode === 'OPEN') return 'open';

  if (/영업\s*중|영업중/i.test(combined) && !/마감|종료/.test(displayText)) {
    return 'open';
  }

  const upcomingToday = hasUpcomingOpenToday(displayText, displayTextInfo, now);

  if (upperCode === 'CLOSED') {
    if (upcomingToday) return 'scheduled';
    return isHolidayDay(combined) ? 'offday' : 'closed';
  }

  if (upcomingToday) return 'scheduled';

  if (/(휴무)/i.test(combined) && isHolidayDay(combined)) {
    return 'offday';
  }

  if (/마감|종료/.test(combined)) {
    return 'closed';
  }

  return null;
}

/** panel3 응답 → Place.openingStatus / isOpenNow */
export function parseOpeningFromPanel3(
  panel: Record<string, unknown> | null | undefined
): {
  openingStatus: PlaceOpeningStatus;
  isOpenNow?: boolean;
  closesAt?: number;
  opensAt?: number;
} {
  if (!panel) return { openingStatus: 'unknown' };

  const summary = panel.summary as Record<string, unknown> | undefined;
  const raw = (panel.open_hours ?? summary?.open_hours) as
    | Record<string, unknown>
    | undefined;
  const headline = raw?.headline as Record<string, unknown> | undefined;
  if (!headline?.display_text) return { openingStatus: 'unknown' };

  const parsed: OpenHoursHeadline = {
    code: typeof headline.code === 'string' ? headline.code : undefined,
    displayText: String(headline.display_text),
    displayTextInfo:
      headline.display_text_info != null
        ? String(headline.display_text_info)
        : undefined,
  };

  const status = getBusinessOpenStatus(parsed);
  if (status === 'open') {
    const closesAt = parseClosingAtMs(parsed, headline);
    return {
      openingStatus: 'open',
      isOpenNow: true,
      ...(closesAt != null ? { closesAt } : {}),
    };
  }
  if (status === 'scheduled') {
    const opensAt = parseOpeningAtMs(parsed, headline);
    return {
      openingStatus: 'scheduled',
      isOpenNow: false,
      ...(opensAt != null ? { opensAt } : {}),
    };
  }
  if (status === 'closed' || status === 'offday') {
    return { openingStatus: status, isOpenNow: false };
  }
  return { openingStatus: 'unknown' };
}

const MS_HOUR = 60 * 60 * 1000;

/** 종료까지 1시간 미만 → 1초, 2시간~1시간 → 3초, 그 외 깜빡임 없음 */
export function getOpenStatusBlinkInterval(
  remainingMs: number
): 1000 | 3000 | null {
  if (remainingMs <= 0 || remainingMs >= 2 * MS_HOUR) return null;
  if (remainingMs < MS_HOUR) return 1000;
  return 3000;
}

/** 오픈까지 1시간 미만 → 1초 깜빡임 */
export function getScheduledStatusBlinkInterval(
  remainingMs: number
): 1000 | null {
  if (remainingMs <= 0 || remainingMs >= MS_HOUR) return null;
  return 1000;
}

interface KstParts {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
}

function getKstParts(now = new Date()): KstParts {
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  return {
    year: kst.getFullYear(),
    month: kst.getMonth(),
    day: kst.getDate(),
    hours: kst.getHours(),
    minutes: kst.getMinutes(),
  };
}

function kstDateTimeToMs(
  parts: KstParts,
  hour: number,
  minute: number,
  dayOffset = 0
): number {
  const d = new Date(parts.year, parts.month, parts.day);
  d.setDate(d.getDate() + dayOffset);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return new Date(
    `${y}-${pad(m)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00+09:00`
  ).getTime();
}

function pickNumericTimeMs(
  raw: Record<string, unknown> | undefined,
  keys: string[]
): number | null {
  if (!raw) return null;
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === 'number' && v > 1e12) return v;
    if (typeof v === 'number' && v > 1e9) return v * 1000;
    if (typeof v === 'string' && /^\d+$/.test(v)) {
      const n = Number(v);
      return n > 1e12 ? n : n * 1000;
    }
  }
  return null;
}

function pickNumericClosingMs(
  raw: Record<string, unknown> | undefined
): number | null {
  return pickNumericTimeMs(raw, [
    'close_time',
    'end_time',
    'closing_time',
    'operate_end_time',
    'closeTime',
    'endTime',
  ]);
}

function pickNumericOpeningMs(
  raw: Record<string, unknown> | undefined
): number | null {
  return pickNumericTimeMs(raw, [
    'open_time',
    'start_time',
    'opening_time',
    'operate_start_time',
    'openTime',
    'startTime',
  ]);
}

function parseHourMinute(h: string, m: string): { hour: number; minute: number } | null {
  const hour = Number(h);
  const minute = Number(m);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 24 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }
  if (hour === 24 && minute === 0) return { hour: 23, minute: 59 };
  if (hour === 24) return null;
  return { hour, minute };
}

/** 문구에서 오늘(또는 익일) 마감 시각 추출 */
function extractClosingTimeFromText(text: string): {
  hour: number;
  minute: number;
  nextDay: boolean;
} | null {
  const t = text.trim();
  if (!t) return null;

  const explicitNextDay =
    /익일\s*(\d{1,2}):(\d{2})/i.exec(t) ??
    /(\d{1,2}):(\d{2}).{0,12}익일/i.exec(t);
  if (explicitNextDay) {
    const parsed = parseHourMinute(explicitNextDay[1], explicitNextDay[2]);
    if (parsed) return { ...parsed, nextDay: true };
  }

  const withKeyword =
    /(\d{1,2}):(\d{2})\s*(?:까지|마감|종료|영업\s*종료)/gi;
  let match = withKeyword.exec(t);
  if (match) {
    const parsed = parseHourMinute(match[1], match[2]);
    if (parsed) return { ...parsed, nextDay: false };
  }

  const keywordFirst =
    /(?:마감|종료|영업\s*종료)\s*(\d{1,2}):(\d{2})/i.exec(t);
  if (keywordFirst) {
    const parsed = parseHourMinute(keywordFirst[1], keywordFirst[2]);
    if (parsed) return { ...parsed, nextDay: false };
  }

  const range = /(\d{1,2}):(\d{2})\s*[~\-–]\s*(\d{1,2}):(\d{2})/i.exec(t);
  if (range) {
    const start = parseHourMinute(range[1], range[2]);
    const end = parseHourMinute(range[3], range[4]);
    if (end) {
      const overnight =
        start != null && end.hour * 60 + end.minute <= start.hour * 60 + start.minute;
      return { ...end, nextDay: overnight };
    }
  }

  return null;
}

/** 문구에서 다음 영업 시작 시각 추출 */
function extractOpeningTimeFromText(text: string): {
  hour: number;
  minute: number;
  nextDay: boolean;
} | null {
  const t = text.trim();
  if (!t) return null;

  const tomorrow =
    /(?:내일|모레)\s*(\d{1,2}):(\d{2})/i.exec(t) ??
    /(\d{1,2}):(\d{2}).{0,12}(?:내일|모레)/i.exec(t);
  if (tomorrow) {
    const parsed = parseHourMinute(tomorrow[1], tomorrow[2]);
    if (parsed) return { ...parsed, nextDay: true };
  }

  const openPatterns = [
    /(\d{1,2}):(\d{2})\s*(?:오픈|OPEN)/gi,
    /(?:오픈|재오픈|영업\s*시작)\s*(\d{1,2}):(\d{2})/gi,
    /(\d{1,2}):(\d{2})\s*재오픈/gi,
    /(\d{1,2}):(\d{2})\s*오픈\s*예정/gi,
  ];

  for (const pattern of openPatterns) {
    const match = pattern.exec(t);
    if (match) {
      const parsed = parseHourMinute(match[1], match[2]);
      if (parsed) return { ...parsed, nextDay: false };
    }
  }

  return null;
}

function futureKstTimeToMs(
  extracted: { hour: number; minute: number; nextDay: boolean },
  now: Date
): number {
  const parts = getKstParts(now);
  const nowMins = parts.hours * 60 + parts.minutes;
  const targetMins = extracted.hour * 60 + extracted.minute;

  let dayOffset = extracted.nextDay ? 1 : 0;
  if (!extracted.nextDay && targetMins <= nowMins) {
    dayOffset = 1;
  }

  return kstDateTimeToMs(parts, extracted.hour, extracted.minute, dayOffset);
}

export function parseClosingAtMs(
  headline: OpenHoursHeadline,
  rawHeadline?: Record<string, unknown>,
  now = new Date()
): number | null {
  const fromRaw = pickNumericClosingMs(rawHeadline);
  if (fromRaw != null) return fromRaw;

  const combined = `${headline.displayText} ${headline.displayTextInfo ?? ''}`.trim();
  const extracted = extractClosingTimeFromText(combined);
  if (!extracted) return null;

  return futureKstTimeToMs(extracted, now);
}

export function parseOpeningAtMs(
  headline: OpenHoursHeadline,
  rawHeadline?: Record<string, unknown>,
  now = new Date()
): number | null {
  const fromRaw = pickNumericOpeningMs(rawHeadline);
  if (fromRaw != null && fromRaw > now.getTime()) return fromRaw;

  const combined = `${headline.displayText} ${headline.displayTextInfo ?? ''}`.trim();
  const extracted = extractOpeningTimeFromText(combined);
  if (!extracted) return null;

  return futureKstTimeToMs(extracted, now);
}
