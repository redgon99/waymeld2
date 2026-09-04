-- =============================================
-- 관리자 목록: 서버 집계 + 검색 + 페이지네이션
--
-- 기존 lib/admin.ts는 waymeld_trips 전량을 브라우저로 가져와 JS에서
-- 집계했다. 특히 fetchAdminShareStats()는 자료 개수를 세려고 payload
-- 컬럼까지 통째로 받아왔다 — 현재 19건에 297KB지만(최대 1건 151KB)
-- 1,000건이면 15MB, 10,000건이면 150MB를 매 조회마다 내려받는 구조다.
--
-- 집계를 DB로 내리고 검색·페이지네이션을 붙인다. 사용자 목록은 지금까지
-- owner_id(UUID)만 보여줘 검색이 무의미했으므로 auth.users의 이메일을
-- 함께 노출한다(관리자만 호출 가능).
--
-- 세 함수 모두 SECURITY DEFINER이므로 첫 줄에서 is_admin()을 직접 확인한다.
-- =============================================

-- ---------------------------------------------
-- 1) 사용자 목록 — 여행 수 집계 + 이메일/메모 검색 + 페이지네이션
-- ---------------------------------------------
create or replace function public.admin_user_rows(
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (
  user_id uuid,
  email text,
  trip_count bigint,
  first_trip_at timestamptz,
  last_updated_at timestamptz,
  is_verified boolean,
  memo text,
  verified_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception '관리자만 조회할 수 있습니다.' using errcode = '42501';
  end if;

  return query
  with agg as (
    select t.owner_id as uid,
           count(*)::bigint as cnt,
           min(t.created_at) as first_at,
           max(t.updated_at) as last_at
      from public.waymeld_trips t
     where t.owner_id is not null
     group by t.owner_id
  ),
  joined as (
    select a.uid,
           u.email::text as em,
           a.cnt,
           a.first_at,
           a.last_at,
           coalesce(v.is_verified, false) as verified,
           v.memo as note,
           v.verified_at as verified_ts
      from agg a
      left join auth.users u on u.id = a.uid
      left join public.admin_user_verifications v on v.user_id = a.uid
  ),
  filtered as (
    select * from joined j
     where v_search is null
        or j.em ilike '%' || v_search || '%'
        or j.note ilike '%' || v_search || '%'
        or j.uid::text ilike '%' || v_search || '%'
  )
  select f.uid, f.em, f.cnt, f.first_at, f.last_at,
         f.verified, f.note, f.verified_ts,
         count(*) over ()::bigint
    from filtered f
   order by f.last_at desc nulls last
   limit greatest(coalesce(p_limit, 50), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- ---------------------------------------------
-- 2) 공유자료 현황 — payload를 내려받지 않고 DB에서 센다
-- ---------------------------------------------
create or replace function public.admin_share_stats()
returns table (
  total_trips bigint,
  public_trips bigint,
  listed_trips bigint,
  total_materials bigint,
  total_imports bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception '관리자만 조회할 수 있습니다.' using errcode = '42501';
  end if;

  return query
  select
    count(*)::bigint,
    count(*) filter (where t.is_public)::bigint,
    count(*) filter (where t.listed_in_plaza)::bigint,
    coalesce(sum(
      case when jsonb_typeof(t.payload -> 'materials') = 'array'
           then jsonb_array_length(t.payload -> 'materials')
           else 0 end
    ), 0)::bigint,
    (select count(*) from public.share_plaza_imports)::bigint
  from public.waymeld_trips t;
end;
$$;

-- ---------------------------------------------
-- 3) 공유마당 등록 목록 — 최근 12건 고정이던 것을 검색·페이지네이션으로
-- ---------------------------------------------
create or replace function public.admin_plaza_listings(
  p_search text default null,
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid,
  title text,
  owner_id uuid,
  owner_email text,
  listed_at timestamptz,
  materials_count int,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if not public.is_admin() then
    raise exception '관리자만 조회할 수 있습니다.' using errcode = '42501';
  end if;

  return query
  with listed as (
    select t.id as tid,
           coalesce(nullif(t.title, ''), '제목 없음') as ttitle,
           t.owner_id as oid,
           u.email::text as oemail,
           t.plaza_listed_at as listed_ts,
           case when jsonb_typeof(t.payload -> 'materials') = 'array'
                then jsonb_array_length(t.payload -> 'materials')
                else 0 end as mcount
      from public.waymeld_trips t
      left join auth.users u on u.id = t.owner_id
     where t.listed_in_plaza
  ),
  filtered as (
    select * from listed l
     where v_search is null
        or l.ttitle ilike '%' || v_search || '%'
        or l.oemail ilike '%' || v_search || '%'
  )
  select f.tid, f.ttitle, f.oid, f.oemail, f.listed_ts, f.mcount,
         count(*) over ()::bigint
    from filtered f
   order by f.listed_ts desc nulls last
   limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_user_rows(text, int, int) to authenticated;
grant execute on function public.admin_share_stats() to authenticated;
grant execute on function public.admin_plaza_listings(text, int, int) to authenticated;
