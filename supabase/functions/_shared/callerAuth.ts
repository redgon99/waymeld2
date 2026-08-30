import { createClient } from 'npm:@supabase/supabase-js@2';

/** 호출자의 Authorization JWT를 검증해 user id를 반환한다 (클라이언트가 body로 보낸 userId는 신뢰하지 않는다) */
export async function getCallerUserId(req: Request): Promise<string> {
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
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) throw new Error('인증에 실패했습니다.');
  return data.user.id;
}
