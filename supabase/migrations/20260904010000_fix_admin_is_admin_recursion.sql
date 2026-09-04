-- =============================================
-- is_admin() ↔ admin_users RLS 상호 재귀 수정
--
-- 20260904000000에서 admin_users의 SELECT 정책이 is_admin()을 호출하도록
-- 바뀌었는데, is_admin()은 SECURITY DEFINER가 아니라 호출자 권한으로
-- admin_users를 읽는다. 그래서 정책 → is_admin() → admin_users 조회 →
-- 정책 → ... 로 순환해 "stack depth limit exceeded"(54001)가 난다.
--
-- 관리자가 1명이고 그 행이 본인 이메일일 때는 OR 첫 조건에서 단락돼
-- 우연히 동작한다. 하지만 두 번째 관리자를 추가하면 남의 행을 스캔할 때
-- 첫 조건이 거짓이라 is_admin()이 실행되고, 무필터로 전체를 조회하는
-- listAdminUserAccounts()가 깨진다 — 관리자 계정 관리 기능의 핵심 시나리오.
--
-- 저장소의 기존 해법(20260812000000의 is_trip_collaborator)과 동일하게
-- SECURITY DEFINER로 순환을 끊는다. 반환값은 호출자 JWT 이메일의 포함
-- 여부(boolean)뿐이라 데이터가 새지 않는다.
-- =============================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;
