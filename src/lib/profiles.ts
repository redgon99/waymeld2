import { getSupabase, isSupabaseConfigured } from './supabase';
import type { PlanId } from './subscription';

export interface UserProfile {
  id: string;
  plan: PlanId;
  subscriptionStatus: string | null;
}

export async function fetchUserProfile(userId: string): Promise<UserProfile> {
  if (!isSupabaseConfigured) {
    return { id: userId, plan: 'free', subscriptionStatus: null };
  }
  const sb = getSupabase()!;
  const { data, error } = await sb
    .from('profiles')
    .select('id, plan, subscription_status')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) {
    return { id: userId, plan: 'free', subscriptionStatus: null };
  }

  const plan = (data.plan as PlanId) ?? 'free';
  return {
    id: data.id,
    plan: plan === 'plus' || plan === 'team' ? plan : 'free',
    subscriptionStatus: data.subscription_status ?? null,
  };
}
