-- =============================================
-- 전역 검색
--
-- ③에서 사용자·공유마당 목록에 검색을 붙였지만 각 화면 안에서만 찾을 수
-- 있다. "이 이메일이 누구지", "이 제목이 어느 화면에 있지"를 알려면 여전히
-- 화면을 하나씩 돌아야 한다. 한 번의 호출로 전 영역을 훑는다.
--
-- 영역마다 스키마가 달라 결과를 (kind, id, title, subtitle, status, url)로
-- 정규화해서 돌려준다.
-- =============================================

create or replace function public.admin_global_search(
  p_query text,
  p_limit int default 10
)
returns table (
  kind text,
  id text,
  title text,
  subtitle text,
  status text,
  url text
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  v_q text := nullif(btrim(coalesce(p_query, '')), '');
  v_like text;
  v_lim int := greatest(coalesce(p_limit, 10), 1);
begin
  if not public.is_admin() then
    raise exception '관리자만 조회할 수 있습니다.' using errcode = '42501';
  end if;
  if v_q is null then
    return;
  end if;
  v_like := '%' || v_q || '%';

  return query
  -- 사용자: 이메일 또는 관리 메모
  (select 'user'::text,
          u.id::text,
          u.email::text,
          coalesce(v.memo, '여행 ' || (select count(*) from public.waymeld_trips t where t.owner_id = u.id)::text || '건'),
          case when coalesce(v.is_verified, false) then '확인됨' else '미확인' end,
          '/admin?q=' || u.email
     from auth.users u
     left join public.admin_user_verifications v on v.user_id = u.id
    where u.email ilike v_like or v.memo ilike v_like
    order by u.email
    limit v_lim)

  union all
  -- 여행: 제목. 공개된 것은 공유 페이지로 바로 갈 수 있다.
  (select 'trip'::text,
          t.id::text,
          coalesce(nullif(t.title, ''), '제목 없음'),
          coalesce(u.email::text, '소유자 없음'),
          case when t.listed_in_plaza then '마당 게시중'
               when t.is_public then '공개'
               else '비공개' end,
          case when t.is_public and t.slug is not null then '/trip/' || t.slug else null end
     from public.waymeld_trips t
     left join auth.users u on u.id = t.owner_id
    where t.title ilike v_like
    order by t.updated_at desc
    limit v_lim)

  union all
  -- 가이드
  (select 'guide'::text,
          g.id::text,
          g.title,
          coalesce(g.summary, g.slug),
          g.status,
          '/admin/guides'
     from public.guide_articles g
    where g.title ilike v_like or g.summary ilike v_like or g.slug ilike v_like
    order by g.updated_at desc
    limit v_lim)

  union all
  -- 시나리오: 한국어 제목/지역/테마
  (select 'scenario'::text,
          s.id::text,
          coalesce(s.content -> 'ko' ->> 'title', s.theme || ' ' || s.days::text || '일'),
          s.region || ' · ' || s.days::text || '일',
          s.status,
          '/admin/scenarios'
     from public.scenario_catalog s
    where coalesce(s.content -> 'ko' ->> 'title', '') ilike v_like
       or s.region ilike v_like
       or s.theme ilike v_like
    order by s.updated_at desc
    limit v_lim)

  union all
  -- 공지
  (select 'notice'::text,
          n.id::text,
          n.title,
          left(coalesce(n.body, ''), 80),
          case when n.is_published then '게시중' else '비공개' end,
          '/admin'
     from public.admin_notices n
    where n.title ilike v_like or n.body ilike v_like
    order by n.updated_at desc
    limit v_lim);
end;
$fn$;

revoke all on function public.admin_global_search(text, int) from public;
revoke all on function public.admin_global_search(text, int) from anon;
grant execute on function public.admin_global_search(text, int) to authenticated;
