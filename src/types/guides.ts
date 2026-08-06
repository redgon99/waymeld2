import type { GuideKind } from '../lib/guideKinds';
import { DEFAULT_GUIDE_KIND } from '../lib/guideKinds';

export type GuideStatus = 'draft' | 'published' | 'archived';

export type { GuideKind };

export interface GuideArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  bodyMd: string;
  summaryEn: string | null;
  kind: GuideKind;
  topicTags: string[];
  status: GuideStatus;
  sourceAnalysisIds: string[];
  sourceUrls: string[];
  locale: string;
  createdBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuideArticleInput {
  title: string;
  summary: string;
  bodyMd: string;
  summaryEn?: string | null;
  kind?: GuideKind;
  topicTags?: string[];
  sourceAnalysisIds?: string[];
  sourceUrls?: string[];
  locale?: string;
  slug?: string;
}

export { DEFAULT_GUIDE_KIND };
