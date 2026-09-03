-- =============================================
-- 관리자 계정 관리: admin_users 테이블에 대한 조회/추가/삭제 정책 보강
-- 기존에는 본인 행만 SELECT 가능하고 INSERT/UPDATE/DELETE 정책이 전혀 없어
-- 관리자 콘솔에서 관리자를 추가/삭제할 방법이 없었다 (DB 직접 조작만 가능).
-- =============================================

drop policy if exists "admin_users_select_own" on public.admin_users;

drop policy if exists "admin_users_select_admin" on public.admin_users;
create policy "admin_users_select_admin" on public.admin_users
  for select using (
    lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    or public.is_admin()
  );

drop policy if exists "admin_users_admin_insert" on public.admin_users;
create policy "admin_users_admin_insert" on public.admin_users
  for insert with check (public.is_admin());

drop policy if exists "admin_users_admin_delete" on public.admin_users;
create policy "admin_users_admin_delete" on public.admin_users
  for delete using (public.is_admin());
