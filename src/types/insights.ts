export type InsightSource = 'youtube' | 'naver_blog' | 'naver_kin' | 'reddit';

export type InsightCategory =
  | 'pain_point'
  | 'feature_request'
  | 'praise'
  | 'competitor_mention'
  | 'useful_tip'
  | 'other';

export type InsightSentiment = 'positive' | 'neutral' | 'negative';

export type InsightRunStatus = 'running' | 'success' | 'error';

export interface InsightKeyword {
  id: string;
  source: InsightSource;
  keyword: string;
  isActive: boolean;
  createdAt: string;
}

export interface InsightRawItem {
  id: string;
  source: InsightSource;
  externalId: string;
  title: string | null;
  content: string | null;
  author: string | null;
  url: string | null;
  sourceCreatedAt: string | null;
  collectedAt: string;
}

export interface InsightAnalysis {
  id: string;
  rawItemId: string;
  category: InsightCategory;
  sentiment: InsightSentiment | null;
  summary: string | null;
  mentionedServices: string[];
  modelUsed: string | null;
  analyzedAt: string;
}

export interface InsightItemWithAnalysis extends InsightRawItem {
  analysis: InsightAnalysis | null;
}

export interface InsightCollectionRun {
  id: string;
  source: InsightSource | 'analyze';
  startedAt: string;
  finishedAt: string | null;
  status: InsightRunStatus;
  itemsCollected: number;
  errorMessage: string | null;
}

export interface InsightCategoryCount {
  category: InsightCategory;
  count: number;
}
