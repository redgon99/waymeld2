import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { tripsRepo, acceptPendingInvites } from '../lib/trips';
import { formatAuthError, isGoogleAuthEnabled } from '../lib/authErrors';
import { fetchUserProfile } from '../lib/profiles';
import { isCurrentUserAdmin } from '../lib/admin';
import { isMockMailUser, signInMockMailUser } from '../lib/mockMailUsers';
import type { PlanId } from '../lib/subscription';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  configured: boolean;
}

interface AuthContextValue extends AuthState {
  plan: PlanId;
  /** admin_users / VITE_ADMIN_EMAILS — 플랜 한도·유료 기능 제한 없음 */
  isAdmin: boolean;
  googleAuthEnabled: boolean;
  signInWithEmail: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  syncLocalTrips: () => Promise<number>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loginRedirectUrl(): string {
  return `${window.location.origin}/login`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: isSupabaseConfigured,
    configured: isSupabaseConfigured,
  });
  const migratedForUserRef = useRef<string | null>(null);
  const [plan, setPlan] = useState<PlanId>('free');
  const [isAdmin, setIsAdmin] = useState(false);

  const refreshProfile = useCallback(async () => {
    const userId = state.user?.id;
    if (!userId) {
      setPlan('free');
      setIsAdmin(false);
      return;
    }
    const profile = await fetchUserProfile(userId);
    setPlan(profile.plan);
  }, [state.user?.id]);

  const refreshAdmin = useCallback(async () => {
    if (!isSupabaseConfigured || !state.user?.id) {
      setIsAdmin(false);
      return;
    }
    try {
      const ok = await isCurrentUserAdmin();
      setIsAdmin(ok);
    } catch {
      setIsAdmin(false);
    }
  }, [state.user?.id]);

  const syncLocalTrips = useCallback(async () => {
    const userId = state.user?.id;
    if (!userId || !isSupabaseConfigured) return 0;
    if (migratedForUserRef.current === userId) return 0;
    const count = await tripsRepo.migrateLocalToUser(userId);
    migratedForUserRef.current = userId;
    return count;
  }, [state.user?.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const sb = getSupabase()!;
    sb.auth.getSession().then(({ data }) => {
      setState({
        user: data.session?.user ?? null,
        session: data.session,
        loading: false,
        configured: true,
      });
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      setState({
        user: session?.user ?? null,
        session,
        loading: false,
        configured: true,
      });
      if (event === 'SIGNED_OUT') {
        migratedForUserRef.current = null;
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!state.user?.id) return;
    void syncLocalTrips();
    void refreshProfile();
    void refreshAdmin();
    // 이 이메일로 온 여행 공동편집 초대가 있으면 로그인 시점에 자동 수락
    void acceptPendingInvites();
  }, [state.user?.id, syncLocalTrips, refreshProfile, refreshAdmin]);

  useEffect(() => {
    if (!state.user?.id) {
      setPlan('free');
      setIsAdmin(false);
    }
  }, [state.user?.id]);

  const signInWithEmail = useCallback(async (email: string) => {
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase 미설정');
    const trimmed = email.trim();
    if (isMockMailUser(trimmed)) {
      await signInMockMailUser(trimmed);
      return;
    }
    const { error } = await sb.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: loginRedirectUrl(),
      },
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!isGoogleAuthEnabled) {
      throw new Error(
        'Google 로그인이 비활성화되어 있습니다. Supabase에서 Google Provider를 켠 뒤 VITE_AUTH_GOOGLE_ENABLED=true 로 설정하세요.'
      );
    }
    const sb = getSupabase();
    if (!sb) throw new Error('Supabase 미설정');
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: loginRedirectUrl(),
        skipBrowserRedirect: true,
      },
    });
    if (error) throw new Error(formatAuthError(error));
    if (!data.url) throw new Error('Google 로그인 URL을 받지 못했습니다.');
    window.location.assign(data.url);
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signOut();
    migratedForUserRef.current = null;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      plan,
      isAdmin,
      googleAuthEnabled: isGoogleAuthEnabled,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      syncLocalTrips,
      refreshProfile,
    }),
    [
      state,
      plan,
      isAdmin,
      signInWithEmail,
      signInWithGoogle,
      signOut,
      syncLocalTrips,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
