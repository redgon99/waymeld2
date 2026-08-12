export type DistributionPlatform = 'x' | 'reddit' | 'youtube' | 'tiktok' | 'weibo' | 'xiaohongshu';

export type DistributionPostStatus = 'draft' | 'approved' | 'scheduled' | 'posted' | 'failed';

export interface DistributionAccount {
  id: string;
  platform: DistributionPlatform;
  country: string;
  label: string;
  handle: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface DistributionAccountInput {
  platform: DistributionPlatform;
  country: string;
  label: string;
  handle?: string;
  /** 플랫폼별 OAuth 토큰 등 (예: X는 accessToken/accessTokenSecret) */
  credentials?: Record<string, string>;
}

export interface DistributionPost {
  id: string;
  platform: DistributionPlatform;
  country: string;
  locale: string;
  accountId: string | null;
  sourceGuideId: string | null;
  title: string | null;
  body: string;
  mediaUrls: string[];
  status: DistributionPostStatus;
  scheduledAt: string | null;
  postedAt: string | null;
  externalPostId: string | null;
  externalUrl: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}
