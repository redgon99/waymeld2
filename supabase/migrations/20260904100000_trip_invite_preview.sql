-- =============================================
-- 초대 링크 미리보기
--
-- trip_invites의 SELECT 정책은 소유자 전용이라, 초대받은 사람은 정작 자기
-- 초대를 읽을 수 없다. 초대 링크(/plan?invite=<id>)로 들어온 사람에게
-- "누가, 어느 여행에, 어떤 이메일로 초대했는지"만 보여주기 위한 함수.
--
-- 아직 로그인하지 않은 사람도 봐야 하므로 anon에게도 실행을 허용한다.
-- 대신 노출 정보를 최소화한다:
--   - 여행 제목과 권한만 그대로
--   - 이메일은 마스킹 (본인이 어느 계정으로 로그인해야 하는지 알아볼 정도)
--   - 여행 내용(payload)·소유자 id 등은 일절 반환하지 않음
--
-- 링크만으로는 권한이 생기지 않는다. 실제 연결은 accept_trip_invites()가
-- 로그인한 계정의 이메일과 trip_invites.email이 일치할 때만 수행한다.
-- =============================================

create or replace function public.mask_email(p_email text)
returns text
language sql
immutable
set search_path = public
as $fn$
  select case
    when p_email is null or position('@' in p_email) = 0 then null
    else left(split_part(p_email, '@', 1), 3) || '***@' || split_part(p_email, '@', 2)
  end;
$fn$;

create or replace function public.get_trip_invite_preview(p_invite_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v jsonb;
begin
  select jsonb_build_object(
    'trip_title', coalesce(nullif(t.title, ''), '제목 없는 여행'),
    'role', i.role,
    'accepted', (i.accepted_at is not null),
    'invited_email', public.mask_email(i.email),
    'inviter_email', public.mask_email(u.email::text)
  )
  into v
  from public.trip_invites i
  join public.waymeld_trips t on t.id = i.trip_id
  left join auth.users u on u.id = i.invited_by
  where i.id = p_invite_id;

  -- 없는 초대면 null (취소됐거나 잘못된 링크)
  return v;
end;
$fn$;

revoke all on function public.get_trip_invite_preview(uuid) from public;
grant execute on function public.get_trip_invite_preview(uuid) to anon;
grant execute on function public.get_trip_invite_preview(uuid) to authenticated;
