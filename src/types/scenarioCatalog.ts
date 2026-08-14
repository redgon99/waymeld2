import type { ScenarioDay } from '../lib/tourScenario';

export type ScenarioCatalogStatus = 'draft' | 'published' | 'archived';

export interface ScenarioCatalogLocaleContent {
  regionLabel: string;
  title: string;
  intro: string;
  days: ScenarioDay[];
}

export interface ScenarioCatalogEntry {
  id: string;
  theme: string;
  days: number;
  region: string;
  status: ScenarioCatalogStatus;
  content: Partial<Record<string, ScenarioCatalogLocaleContent>>;
  candidateRegionCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
