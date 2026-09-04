-- =============================================
-- 통합 대시보드
--
-- 관리자 정보가 8개 페이지에 흩어져 있어 "지금 뭘 봐야 하는지" 알려면
-- 전부 눌러봐야 했다. 한 번의 호출로 전 영역 지표를 모은다.
--
-- 페이지마다 따로 조회하면 왕복이 8번이고 각 화면의 무거운 목록 쿼리까지
-- 딸려온다. 여기서는 카운트만 뽑는다.
-- =============================================

create or replace function public.admin_dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v jsonb;
begin
  if not public.is_admin() then
    raise exception '관리자만 조회할 수 있습니다.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'trips', (
      select jsonb_build_object(
        'total', count(*),
        'public', count(*) filter (where is_public),
        'listed', count(*) filter (where listed_in_plaza),
        'owners', count(distinct owner_id) filter (where owner_id is not null),
        'created_7d', count(*) filter (where created_at > now() - interval '7 days')
      ) from public.waymeld_trips
    ),
    'reports', (
      select jsonb_build_object(
        'open', count(*) filter (where status in ('open', 'reviewing')),
        'total', count(*)
      ) from public.content_reports
    ),
    'guides', (
      select jsonb_build_object(
        'published', count(*) filter (where status = 'published'),
        'draft', count(*) filter (where status <> 'published'),
        'total', count(*)
      ) from public.guide_articles
    ),
    'scenarios', (
      select jsonb_build_object(
        'published', count(*) filter (where status = 'published'),
        'draft', count(*) filter (where status = 'draft'),
        'themes_covered', count(distinct theme) filter (where status = 'published'),
        'regions_covered', count(distinct region) filter (where status = 'published')
      ) from public.scenario_catalog
    ),
    'insights', (
      select jsonb_build_object(
        'raw_items', (select count(*) from public.insight_raw_items),
        'keywords', (select count(*) from public.insight_keywords),
        'place_mentions', (select count(*) from public.insight_place_mentions),
        'last_run_at', (select max(started_at) from public.insight_collection_runs)
      )
    ),
    'distribution', (
      select jsonb_build_object(
        'accounts', (select count(*) from public.distribution_accounts),
        'posted', count(*) filter (where status = 'posted'),
        'failed', count(*) filter (where status = 'failed'),
        'draft', count(*) filter (where status = 'draft')
      ) from public.distribution_posts
    ),
    'notices', (
      select jsonb_build_object(
        'published', count(*) filter (where is_published),
        'total', count(*)
      ) from public.admin_notices
    ),
    'admins', (select count(*) from public.admin_users),
    'audit', (
      select jsonb_build_object(
        'total', count(*),
        'today', count(*) filter (where created_at > date_trunc('day', now()))
      ) from public.admin_audit_log
    )
  ) into v;

  return v;
end;
$fn$;

revoke all on function public.admin_dashboard_summary() from public;
revoke all on function public.admin_dashboard_summary() from anon;
grant execute on function public.admin_dashboard_summary() to authenticated;
