import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  resolveInitialLocale,
  writeStoredLocale,
  type AppLocale,
} from './locale';

import koCommon from '../locales/ko/common.json';
import koPlanner from '../locales/ko/planner.json';
import koShare from '../locales/ko/share.json';
import koAuth from '../locales/ko/auth.json';
import koBilling from '../locales/ko/billing.json';
import koLanding from '../locales/ko/landing.json';
import koGuides from '../locales/ko/guides.json';
import koKorInfo from '../locales/ko/korInfo.json';

import enCommon from '../locales/en/common.json';
import enPlanner from '../locales/en/planner.json';
import enShare from '../locales/en/share.json';
import enAuth from '../locales/en/auth.json';
import enBilling from '../locales/en/billing.json';
import enLanding from '../locales/en/landing.json';
import enGuides from '../locales/en/guides.json';
import enKorInfo from '../locales/en/korInfo.json';

import jaCommon from '../locales/ja/common.json';
import jaPlanner from '../locales/ja/planner.json';
import jaShare from '../locales/ja/share.json';
import jaAuth from '../locales/ja/auth.json';
import jaBilling from '../locales/ja/billing.json';
import jaLanding from '../locales/ja/landing.json';
import jaGuides from '../locales/ja/guides.json';
import jaKorInfo from '../locales/ja/korInfo.json';

import zhCommon from '../locales/zh/common.json';
import zhPlanner from '../locales/zh/planner.json';
import zhShare from '../locales/zh/share.json';
import zhAuth from '../locales/zh/auth.json';
import zhBilling from '../locales/zh/billing.json';
import zhLanding from '../locales/zh/landing.json';
import zhGuides from '../locales/zh/guides.json';
import zhKorInfo from '../locales/zh/korInfo.json';

const resources = {
  ko: {
    common: koCommon,
    planner: koPlanner,
    share: koShare,
    auth: koAuth,
    billing: koBilling,
    landing: koLanding,
    guides: koGuides,
    korInfo: koKorInfo,
  },
  en: {
    common: enCommon,
    planner: enPlanner,
    share: enShare,
    auth: enAuth,
    billing: enBilling,
    landing: enLanding,
    guides: enGuides,
    korInfo: enKorInfo,
  },
  ja: {
    common: jaCommon,
    planner: jaPlanner,
    share: jaShare,
    auth: jaAuth,
    billing: jaBilling,
    landing: jaLanding,
    guides: jaGuides,
    korInfo: jaKorInfo,
  },
  zh: {
    common: zhCommon,
    planner: zhPlanner,
    share: zhShare,
    auth: zhAuth,
    billing: zhBilling,
    landing: zhLanding,
    guides: zhGuides,
    korInfo: zhKorInfo,
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: ['ko', 'en', 'ja', 'zh'],
  defaultNS: 'common',
  ns: ['common', 'planner', 'share', 'auth', 'billing', 'landing', 'guides', 'korInfo'],
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export function setAppLocale(locale: AppLocale): void {
  const normalized = normalizeLocale(locale);
  writeStoredLocale(normalized);
  void i18n.changeLanguage(normalized);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized === 'zh' ? 'zh-CN' : normalized;
  }
}

i18n.on('languageChanged', (lng) => {
  const normalized = normalizeLocale(lng);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized === 'zh' ? 'zh-CN' : normalized;
  }
});

if (typeof document !== 'undefined') {
  const initial = resolveInitialLocale();
  document.documentElement.lang = initial === 'zh' ? 'zh-CN' : initial;
}

export default i18n;
