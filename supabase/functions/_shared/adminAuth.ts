import { createClient } from 'npm:@supabase/supabase-js@2';

/** 호출자의 Authorization JWT를 그대로 사용해 is_admin()을 검증 (service role 우회 방지) */
export async function requireAdminCaller(req: Request): Promise<void> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) throw new Error('로그인이 필요합니다.');
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) {
    throw new Error('SUPABASE_URL/SUPABASE_ANON_KEY not configured');
  }
  const sb = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await sb.rpc('is_admin');
  if (error) throw error;
  if (!data) throw new Error('관리자 권한이 필요합니다.');
}
