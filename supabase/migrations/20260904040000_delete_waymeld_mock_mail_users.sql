-- 시험용 user1@mail.com ~ user30@mail.com 및 목업 여행 일괄 삭제.
-- 관리자(is_admin)만 호출할 수 있습니다.

create or replace function public.delete_waymeld_mock_mail_users()
returns table (deleted_trips int, deleted_users int)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_trips int := 0;
  v_users int := 0;
begin
  if not public.is_admin() then
    raise exception '관리자만 실행할 수 있습니다.' using errcode = '42501';
  end if;

  delete from public.waymeld_trips
   where slug like 'mock-mail-user-%'
      or owner_id in (
           select id from auth.users
            where email ~ '^user([1-9]|[12][0-9]|30)@mail\.com$'
              and coalesce((raw_user_meta_data->>'mock')::boolean, false)
         );
  get diagnostics v_trips = row_count;

  delete from auth.users
   where email ~ '^user([1-9]|[12][0-9]|30)@mail\.com$'
     and coalesce((raw_user_meta_data->>'mock')::boolean, false);
  get diagnostics v_users = row_count;

  return query select v_trips, v_users;
end;
$$;

revoke all on function public.delete_waymeld_mock_mail_users() from public;
grant execute on function public.delete_waymeld_mock_mail_users() to authenticated;
