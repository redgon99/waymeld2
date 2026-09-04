-- =============================================
-- 관리자 함수 보안 강화 (Supabase security advisor 지적사항)
--
-- 1) audit_redact()에 search_path 고정이 빠져 있었다. 다른 함수에는 모두
--    넣었는데 이것만 누락 — SECURITY DEFINER는 아니라 위험도는 낮지만
--    검색 경로가 흔들릴 여지를 남길 이유가 없다.
--
-- 2) Postgres는 함수 생성 시 EXECUTE를 PUBLIC에 기본 부여한다. 그래서
--    관리자 전용 RPC들이 로그아웃 상태(anon)에서도 호출 가능했다.
--    내부에서 is_admin()으로 막고 있어 악용되진 않지만, 애초에 호출조차
--    못 하게 막는 편이 낫다.
--
--    ⚠️ is_admin()은 회수하면 안 된다. RLS 정책 본문에서 호출되므로
--    호출자(anon 포함)에게 EXECUTE가 없으면 정책 평가 자체가 실패한다.
--    log_admin_action()도 트리거 함수라 그대로 둔다.
-- =============================================

create or replace function public.audit_redact(j jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $fn$
  select coalesce(
    jsonb_object_agg(
      key,
      case
        when length(value::text) > 1000
          then to_jsonb('[생략됨 · ' || length(value::text) || ' bytes]'::text)
        else value
      end
    ),
    '{}'::jsonb
  )
  from jsonb_each(coalesce(j, '{}'::jsonb));
$fn$;

-- 관리자 전용 RPC: PUBLIC/anon 회수 후 authenticated에만 부여
do $do$
declare
  sig text;
  sigs text[] := array[
    'public.admin_user_rows(text, int, int)',
    'public.admin_share_stats()',
    'public.admin_plaza_listings(text, int, int)',
    'public.admin_report_target_states()',
    'public.admin_moderate_report(uuid)'
  ];
begin
  foreach sig in array sigs loop
    execute format('revoke all on function %s from public', sig);
    execute format('revoke all on function %s from anon', sig);
    execute format('grant execute on function %s to authenticated', sig);
  end loop;
end;
$do$;
