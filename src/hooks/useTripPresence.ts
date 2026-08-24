import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { trackEvent } from '../lib/analytics';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  joinTripPresence,
  resolvePresenceIdentity,
  type PresenceViewer,
} from '../lib/tripPresence';

/**
 * 공유된 여행을 함께 보고 있는 사람 목록.
 * enabled가 false거나 Supabase 미설정이면 채널을 열지 않는다.
 */
export function useTripPresence(
  tripId: string | null | undefined,
  enabled: boolean,
): PresenceViewer[] {
  const { user } = useAuth();
  const { t } = useTranslation('planner');
  const [viewers, setViewers] = useState<PresenceViewer[]>([]);
  const guestLabel = t('presence.guest');
  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;
  const reportedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !tripId || !isSupabaseConfigured) {
      setViewers([]);
      return;
    }
    const me = resolvePresenceIdentity(
      userId ? { id: userId, email: userEmail } : null,
      guestLabel,
    );
    const leave = joinTripPresence(tripId, me, (next) => {
      setViewers(next);
      // 착수 게이트용 — 동시 조회는 여행당 한 번만 센다
      if (next.length >= 2 && !reportedRef.current.has(tripId)) {
        reportedRef.current.add(tripId);
        trackEvent('presence_multi_viewer', { viewers: next.length });
      }
    });
    return () => {
      leave();
      setViewers([]);
    };
  }, [tripId, enabled, userId, userEmail, guestLabel]);

  return viewers;
}
