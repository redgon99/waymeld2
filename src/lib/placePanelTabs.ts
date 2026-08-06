import { fetchKakaoPlaceJson } from './kakaoPlaceApi';
import { fetchPlacePhotos } from './placeStats';

export type PlacePanelTabId =
  | 'PHOTO'
  | 'SUMMARY'
  | 'PRODUCT'
  | 'REVIEW'
  | 'BOOKING'
  | 'SPECIAL'
  | 'NEWS'
  | 'BLOG'
  | 'RANKING'
  | 'HOME'
  | 'MAP'
  | 'INFO';

export interface PlacePanelTab {
  id: PlacePanelTabId;
  label: string;
}

export interface PlacePanelDetail {
  panel: Record<string, unknown> | null;
  tabs: PlacePanelTab[];
  photos: string[];
}

const TAB_LABELS: Record<PlacePanelTabId, string> = {
  PHOTO: '사진',
  SUMMARY: '요약',
  PRODUCT: '상품',
  REVIEW: '후기',
  BOOKING: '예약',
  SPECIAL: '기획전',
  NEWS: '소식',
  BLOG: '블로그',
  RANKING: '랭킹',
  HOME: '홈',
  MAP: '지도',
  INFO: '정보',
};

const RESTRICT_KEY: Partial<Record<PlacePanelTabId, string>> = {
  PHOTO: 'photo',
  BLOG: 'blog',
  REVIEW: 'review_read',
  RANKING: 'ranking',
};

export async function fetchPlacePanelDetail(
  placeId: string
): Promise<PlacePanelDetail> {
  const [panel, photos] = await Promise.all([
    fetchKakaoPlaceJson<Record<string, unknown>>(`/panel3/${placeId}`),
    fetchPlacePhotos(placeId),
  ]);

  return {
    panel,
    tabs: buildPlacePanelTabs(panel),
    photos,
  };
}

export function buildPlacePanelTabs(
  panel: Record<string, unknown> | null
): PlacePanelTab[] {
  const tags = Array.isArray(panel?.panel_tab_tags)
    ? (panel.panel_tab_tags as string[])
    : [];
  const restrict = panel?.restrict as
    | Record<string, { is_restrict?: boolean }>
    | undefined;

  const tabs: PlacePanelTab[] = [
    { id: 'PHOTO', label: '사진' },
    { id: 'SUMMARY', label: '요약' },
  ];

  for (const raw of tags) {
    const id = raw as PlacePanelTabId;
    if (id === 'PHOTO' || id === 'SUMMARY') continue;
    if (!TAB_LABELS[id]) continue;
    if (isTabRestricted(id, restrict)) continue;
    tabs.push({ id, label: getTabLabel(id, panel) });
  }

  return tabs;
}

function isTabRestricted(
  id: PlacePanelTabId,
  restrict?: Record<string, { is_restrict?: boolean }>
): boolean {
  const key = RESTRICT_KEY[id];
  if (!key || !restrict) return false;
  return restrict[key]?.is_restrict === true;
}

function getTabLabel(
  id: PlacePanelTabId,
  panel: Record<string, unknown> | null
): string {
  if (id === 'PRODUCT' && hasMenu(panel)) return '메뉴';
  return TAB_LABELS[id];
}

export function hasMenu(panel: Record<string, unknown> | null): boolean {
  const menu = panel?.menu as Record<string, unknown> | undefined;
  const menus = menu?.menus as Record<string, unknown> | undefined;
  const items = menus?.items;
  return Array.isArray(items) && items.length > 0;
}

export function getPanelSummary(
  panel: Record<string, unknown> | null
): Record<string, unknown> | undefined {
  return panel?.summary as Record<string, unknown> | undefined;
}
