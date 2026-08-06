export type PlanId = 'free' | 'plus' | 'team';

export const FREE_MAX_TRIPS = 3;
export const FREE_DAILY_GOOGLE_SEARCHES = 40;

const SEARCH_COUNT_KEY = 'tripasist:google-search-count';
const SEARCH_COUNT_DATE_KEY = 'tripasist:google-search-date';

export function isPlusOrTeam(plan: PlanId): boolean {
  return plan === 'plus' || plan === 'team';
}

export function canCreateTrip(plan: PlanId, currentCount: number): boolean {
  if (isPlusOrTeam(plan)) return true;
  return currentCount < FREE_MAX_TRIPS;
}

export function canExportItinerary(plan: PlanId): boolean {
  return isPlusOrTeam(plan);
}

export function canUseCloudSync(plan: PlanId, isLoggedIn: boolean): boolean {
  if (!isLoggedIn) return false;
  return isPlusOrTeam(plan);
}

/** Free + Google 검색 일일 캡 */
export function canRunGoogleSearch(plan: PlanId): boolean {
  if (isPlusOrTeam(plan)) return true;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const storedDate = localStorage.getItem(SEARCH_COUNT_DATE_KEY);
    let count = Number(localStorage.getItem(SEARCH_COUNT_KEY) ?? '0');
    if (storedDate !== today) {
      count = 0;
      localStorage.setItem(SEARCH_COUNT_DATE_KEY, today);
      localStorage.setItem(SEARCH_COUNT_KEY, '0');
    }
    return count < FREE_DAILY_GOOGLE_SEARCHES;
  } catch {
    return true;
  }
}

export function recordGoogleSearch(plan: PlanId): void {
  if (isPlusOrTeam(plan)) return;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const storedDate = localStorage.getItem(SEARCH_COUNT_DATE_KEY);
    let count = Number(localStorage.getItem(SEARCH_COUNT_KEY) ?? '0');
    if (storedDate !== today) count = 0;
    count += 1;
    localStorage.setItem(SEARCH_COUNT_DATE_KEY, today);
    localStorage.setItem(SEARCH_COUNT_KEY, String(count));
  } catch {
    /* ignore */
  }
}

export function getPlusCheckoutUrl(): string | null {
  const url = import.meta.env.VITE_PLUS_CHECKOUT_URL;
  return url?.trim() || null;
}

export function getStripePortalUrl(): string | null {
  const url = import.meta.env.VITE_STRIPE_PORTAL_URL;
  return url?.trim() || null;
}
