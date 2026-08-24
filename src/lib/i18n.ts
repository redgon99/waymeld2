import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  resolveInitialLocale,
  writeStoredLocale,
  localeToBcp47,
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

import zhCNCommon from '../locales/zh-CN/common.json';
import zhCNPlanner from '../locales/zh-CN/planner.json';
import zhCNShare from '../locales/zh-CN/share.json';
import zhCNAuth from '../locales/zh-CN/auth.json';
import zhCNBilling from '../locales/zh-CN/billing.json';
import zhCNLanding from '../locales/zh-CN/landing.json';
import zhCNGuides from '../locales/zh-CN/guides.json';
import zhCNKorInfo from '../locales/zh-CN/korInfo.json';

import zhTWCommon from '../locales/zh-TW/common.json';
import zhTWPlanner from '../locales/zh-TW/planner.json';
import zhTWShare from '../locales/zh-TW/share.json';
import zhTWAuth from '../locales/zh-TW/auth.json';
import zhTWBilling from '../locales/zh-TW/billing.json';
import zhTWLanding from '../locales/zh-TW/landing.json';
import zhTWGuides from '../locales/zh-TW/guides.json';
import zhTWKorInfo from '../locales/zh-TW/korInfo.json';

import esCommon from '../locales/es/common.json';
import esPlanner from '../locales/es/planner.json';
import esShare from '../locales/es/share.json';
import esAuth from '../locales/es/auth.json';
import esBilling from '../locales/es/billing.json';
import esLanding from '../locales/es/landing.json';
import esGuides from '../locales/es/guides.json';
import esKorInfo from '../locales/es/korInfo.json';

import frCommon from '../locales/fr/common.json';
import frPlanner from '../locales/fr/planner.json';
import frShare from '../locales/fr/share.json';
import frAuth from '../locales/fr/auth.json';
import frBilling from '../locales/fr/billing.json';
import frLanding from '../locales/fr/landing.json';
import frGuides from '../locales/fr/guides.json';
import frKorInfo from '../locales/fr/korInfo.json';

import deCommon from '../locales/de/common.json';
import dePlanner from '../locales/de/planner.json';
import deShare from '../locales/de/share.json';
import deAuth from '../locales/de/auth.json';
import deBilling from '../locales/de/billing.json';
import deLanding from '../locales/de/landing.json';
import deGuides from '../locales/de/guides.json';
import deKorInfo from '../locales/de/korInfo.json';

import ruCommon from '../locales/ru/common.json';
import ruPlanner from '../locales/ru/planner.json';
import ruShare from '../locales/ru/share.json';
import ruAuth from '../locales/ru/auth.json';
import ruBilling from '../locales/ru/billing.json';
import ruLanding from '../locales/ru/landing.json';
import ruGuides from '../locales/ru/guides.json';
import ruKorInfo from '../locales/ru/korInfo.json';

const zhCNBundle = {
  common: zhCNCommon,
  planner: zhCNPlanner,
  share: zhCNShare,
  auth: zhCNAuth,
  billing: zhCNBilling,
  landing: zhCNLanding,
  guides: zhCNGuides,
  korInfo: zhCNKorInfo,
};

const zhTWBundle = {
  common: zhTWCommon,
  planner: zhTWPlanner,
  share: zhTWShare,
  auth: zhTWAuth,
  billing: zhTWBilling,
  landing: zhTWLanding,
  guides: zhTWGuides,
  korInfo: zhTWKorInfo,
};

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
  'zh-CN': zhCNBundle,
  'zh-TW': zhTWBundle,
  // Legacy alias — normalizeLocale maps "zh" → zh-CN; keep bundle for safety
  zh: zhCNBundle,
  es: {
    common: esCommon,
    planner: esPlanner,
    share: esShare,
    auth: esAuth,
    billing: esBilling,
    landing: esLanding,
    guides: esGuides,
    korInfo: esKorInfo,
  },
  fr: {
    common: frCommon,
    planner: frPlanner,
    share: frShare,
    auth: frAuth,
    billing: frBilling,
    landing: frLanding,
    guides: frGuides,
    korInfo: frKorInfo,
  },
  de: {
    common: deCommon,
    planner: dePlanner,
    share: deShare,
    auth: deAuth,
    billing: deBilling,
    landing: deLanding,
    guides: deGuides,
    korInfo: deKorInfo,
  },
  ru: {
    common: ruCommon,
    planner: ruPlanner,
    share: ruShare,
    auth: ruAuth,
    billing: ruBilling,
    landing: ruLanding,
    guides: ruGuides,
    korInfo: ruKorInfo,
  },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: resolveInitialLocale(),
  fallbackLng: DEFAULT_LOCALE,
  supportedLngs: ['ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'zh', 'es', 'fr', 'de', 'ru'],
  nonExplicitSupportedLngs: false,
  defaultNS: 'common',
  ns: ['common', 'planner', 'share', 'auth', 'billing', 'landing', 'guides', 'korInfo'],
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

function applyDocumentLang(locale: AppLocale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = localeToBcp47(locale);
  }
}

export function setAppLocale(locale: AppLocale): void {
  const normalized = normalizeLocale(locale);
  writeStoredLocale(normalized);
  void i18n.changeLanguage(normalized);
  applyDocumentLang(normalized);
}

i18n.on('languageChanged', (lng) => {
  applyDocumentLang(normalizeLocale(lng));
});

if (typeof document !== 'undefined') {
  applyDocumentLang(resolveInitialLocale());
}

export default i18n;
