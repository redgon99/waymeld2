import { pathWithLocale, type AppLocale } from './locale';

/** 마케팅 랜딩 */
export const LANDING_PATH = '/';

/** 여행 플래너 앱 (지도·핀업·동선) */
export const PLANNER_PATH = '/plan';

export const TERMS_PATH = '/terms';
export const PRIVACY_PATH = '/privacy';

export function plannerPath(locale: AppLocale): string {
  return pathWithLocale(PLANNER_PATH, locale);
}

export function termsPath(locale: AppLocale): string {
  return pathWithLocale(TERMS_PATH, locale);
}

export function privacyPath(locale: AppLocale): string {
  return pathWithLocale(PRIVACY_PATH, locale);
}

export function landingPath(locale: AppLocale): string {
  return pathWithLocale(LANDING_PATH, locale);
}
