/**
 * Tripasist → WayMeld 로컬 스토리지 키 이전.
 * 앱 기동 시 한 번 호출해 기존 사용자 데이터·세션을 유지한다.
 */
const KEY_PAIRS: Array<[next: string, legacy: string]> = [
  ['waymeld-auth', 'tripasist-auth'],
  ['waymeld:locale-v1', 'tripasist:locale-v1'],
  ['waymeld:korea-setup:v1', 'tripasist:korea-setup:v1'],
  ['waymeld:onboarding-v1', 'tripasist:onboarding-v1'],
  ['waymeld:share-onboarding-v1', 'tripasist:share-onboarding-v1'],
  ['waymeld:plaza-nav-unlocked-v1', 'tripasist:plaza-nav-unlocked-v1'],
  ['waymeld:map-provider-choice-v1', 'tripasist:map-provider-choice-v1'],
  ['waymeld:materials-view-v1', 'tripasist:materials-view-v1'],
  ['waymeld:pwa-install-dismissed-v1', 'tripasist:pwa-install-dismissed-v1'],
  ['waymeld:google-search-count', 'tripasist:google-search-count'],
  ['waymeld:google-search-date', 'tripasist:google-search-date'],
  ['waymeld:insight-collect-period', 'tripasist:insight-collect-period'],
  ['waymeld:trips-store:v2', 'tripasist:trips-store:v2'],
  ['waymeld:plaza-imported-ids', 'tripasist:plaza-imported-ids'],
];

export function migrateLegacyStorageKeys(): void {
  if (typeof localStorage === 'undefined') return;
  for (const [next, legacy] of KEY_PAIRS) {
    try {
      if (localStorage.getItem(next) == null) {
        const prev = localStorage.getItem(legacy);
        if (prev != null) localStorage.setItem(next, prev);
      }
      localStorage.removeItem(legacy);
    } catch {
      /* private mode 등 */
    }
  }
}
