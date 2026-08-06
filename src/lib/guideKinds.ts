/** 가이드 카드 종류 (공개 허브·관리자·AI 초안 공통) */
export const GUIDE_KINDS = [
  'course',
  'practical',
  'prepare',
  'food',
  'culture',
  'shopping',
  'safety',
] as const;

export type GuideKind = (typeof GUIDE_KINDS)[number];

export const DEFAULT_GUIDE_KIND: GuideKind = 'practical';

export const GUIDE_KIND_META: Record<
  GuideKind,
  { labelKo: string; descriptionKo: string; cta: 'auto_route' | 'setup' | 'planner' | 'plaza' }
> = {
  course: {
    labelKo: '추천 여행코스',
    descriptionKo: '지역·테마별 추천 동선. 플래너 자동 동선 짜기와 연동',
    cta: 'auto_route',
  },
  practical: {
    labelKo: '유용한 정보',
    descriptionKo: '교통카드·편의시설·공항 이동 등 실무 How-to',
    cta: 'planner',
  },
  prepare: {
    labelKo: '여행 준비',
    descriptionKo: '입국·환전·짐·체크리스트 등 출발 전 준비',
    cta: 'setup',
  },
  food: {
    labelKo: '맛집·카페',
    descriptionKo: '식사·카페·예약·줄서기 팁',
    cta: 'planner',
  },
  culture: {
    labelKo: '문화·에티켓',
    descriptionKo: '예절·관례·축제·계절 문화',
    cta: 'plaza',
  },
  shopping: {
    labelKo: '쇼핑·면세',
    descriptionKo: '시장·백화점·면세·환급',
    cta: 'planner',
  },
  safety: {
    labelKo: '안전·응급',
    descriptionKo: '비상연락·병원·분실·주의사항',
    cta: 'setup',
  },
};

export function isGuideKind(value: unknown): value is GuideKind {
  return typeof value === 'string' && (GUIDE_KINDS as readonly string[]).includes(value);
}

export function normalizeGuideKind(value: unknown): GuideKind {
  return isGuideKind(value) ? value : DEFAULT_GUIDE_KIND;
}
