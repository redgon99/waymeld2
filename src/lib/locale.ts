export type AppLocale = 'ko' | 'en' | 'ja' | 'zh';

export const SUPPORTED_LOCALES: AppLocale[] = ['ko', 'en', 'ja', 'zh'];

export const DEFAULT_LOCALE: AppLocale = 'ko';

export const LOCALE_STORAGE_KEY = 'tripasist:locale-v1';

export const LOCALE_LABELS: Record<AppLocale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
};

/** BCP 47 for Intl APIs */
export function localeToBcp47(locale: AppLocale): string {
  if (locale === 'zh') return 'zh-CN';
  return locale;
}

/** Google Maps / Places API language code */
export function googleMapsLanguage(locale: AppLocale): string {
  return localeToBcp47(locale);
}

export function normalizeLocale(input?: string | null): AppLocale {
  if (!input) return DEFAULT_LOCALE;
  const base = input.toLowerCase().split('-')[0];
  if (base === 'ko' || input.toLowerCase().startsWith('ko')) return 'ko';
  if (base === 'en') return 'en';
  if (base === 'ja') return 'ja';
  if (base === 'zh') return 'zh';
  return DEFAULT_LOCALE;
}

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  const langs = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const lang of langs) {
    const n = normalizeLocale(lang);
    if (SUPPORTED_LOCALES.includes(n)) return n;
  }
  return DEFAULT_LOCALE;
}

export function readStoredLocale(): AppLocale | null {
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (raw && SUPPORTED_LOCALES.includes(raw as AppLocale)) return raw as AppLocale;
  } catch {
    /* ignore */
  }
  return null;
}

export function writeStoredLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

export function resolveInitialLocale(): AppLocale {
  return readStoredLocale() ?? detectBrowserLocale();
}

/** URL path prefix e.g. /en/plaza → en */
export function localeFromPathname(pathname: string): AppLocale | null {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg && SUPPORTED_LOCALES.includes(seg as AppLocale)) return seg as AppLocale;
  return null;
}

export function stripLocalePrefix(pathname: string): string {
  const locale = localeFromPathname(pathname);
  if (!locale) return pathname || '/';
  const rest = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
  return rest.startsWith('/') ? rest : `/${rest}`;
}

export function pathWithLocale(path: string, locale: AppLocale): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE) return clean;
  if (clean === '/') return `/${locale}`;
  return `/${locale}${clean}`;
}
