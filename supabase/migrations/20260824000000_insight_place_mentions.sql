-- =============================================
-- 인사이트 → 장소 연결 (Social Travel Intelligence)
--
-- insight_analysis 는 게시물(raw_item) 단위라 개별 장소와 연결되지 않는다.
-- 게시물에서 언급된 장소를 추출해 정규화 키(place_key)로 모으고,
-- 장소 카드에서 바로 읽을 수 있는 공개 집계 테이블(place_reactions)을 따로 둔다.
-- 원문 인용은 관리자만 조회, 집계만 공개한다.
-- =============================================

create table if not exists public.insight_place_mentions (
  id uuid primary key default uuid_generate_v4(),
  analysis_id uuid not null references public.insight_analysis(id) on delete cascade,
  raw_item_id uuid not null references public.insight_raw_items(id) on delete cascade,
  -- 소문자·공백/문장부호 제거한 매칭 키 (클라이언트 placeKey()와 동일 규칙)
  place_key text not null,
  place_name text not null,
  -- 한국관광공사 contentId를 해석한 경우에만 채움
  place_content_id text,
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  aspect text check (
    aspect in ('crowd', 'price', 'access', 'food', 'view', 'service', 'facility', 'other')
  ),
  quote text,
  source_url text,
  created_at timestamptz not null default now(),
  unique (analysis_id, place_key)
);

create index if not exists insight_place_mentions_key_idx
  on public.insight_place_mentions (place_key);

create index if not exists insight_place_mentions_content_idx
  on public.insight_place_mentions (place_content_id)
  where place_content_id is not null;

alter table public.insight_place_mentions enable row level security;

drop policy if exists "insight_place_mentions_admin_select" on public.insight_place_mentions;
create policy "insight_place_mentions_admin_select" on public.insight_place_mentions
  for select using (public.is_admin());

-- ---------------------------------------------
-- 공개 집계 — 장소 카드 배지가 읽는 유일한 테이블
-- ---------------------------------------------
create table if not exists public.place_reactions (
  place_key text primary key,
  place_name text not null,
  place_content_id text,
  mention_count integer not null default 0,
  positive_count integer not null default 0,
  neutral_count integer not null default 0,
  negative_count integer not null default 0,
  top_aspects text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create index if not exists place_reactions_content_idx
  on public.place_reactions (place_content_id)
  where place_content_id is not null;

alter table public.place_reactions enable row level security;

drop policy if exists "place_reactions_public_select" on public.place_reactions;
create policy "place_reactions_public_select" on public.place_reactions
  for select using (true);

drop policy if exists "place_reactions_admin_all" on public.place_reactions;
create policy "place_reactions_admin_all" on public.place_reactions
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------
-- 특정 place_key들의 집계를 다시 계산 (Edge Function에서 rpc로 호출)
-- ---------------------------------------------
create or replace function public.refresh_place_reactions(keys text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  delete from public.place_reactions pr
  where pr.place_key = any(keys)
    and not exists (
      select 1 from public.insight_place_mentions m where m.place_key = pr.place_key
    );

  with agg as (
    select
      m.place_key,
      (array_agg(m.place_name order by m.created_at desc))[1] as place_name,
      (array_agg(m.place_content_id) filter (where m.place_content_id is not null))[1]
        as place_content_id,
      count(*)::int as mention_count,
      count(*) filter (where m.sentiment = 'positive')::int as positive_count,
      count(*) filter (where m.sentiment = 'neutral')::int as neutral_count,
      count(*) filter (where m.sentiment = 'negative')::int as negative_count,
      coalesce(
        array_agg(distinct m.aspect) filter (where m.aspect is not null and m.aspect <> 'other'),
        '{}'
      ) as top_aspects
    from public.insight_place_mentions m
    where m.place_key = any(keys)
    group by m.place_key
  )
  insert into public.place_reactions as pr (
    place_key, place_name, place_content_id, mention_count,
    positive_count, neutral_count, negative_count, top_aspects, updated_at
  )
  select
    agg.place_key, agg.place_name, agg.place_content_id, agg.mention_count,
    agg.positive_count, agg.neutral_count, agg.negative_count, agg.top_aspects, now()
  from agg
  on conflict (place_key) do update set
    place_name = excluded.place_name,
    place_content_id = coalesce(excluded.place_content_id, pr.place_content_id),
    mention_count = excluded.mention_count,
    positive_count = excluded.positive_count,
    neutral_count = excluded.neutral_count,
    negative_count = excluded.negative_count,
    top_aspects = excluded.top_aspects,
    updated_at = now();

  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.refresh_place_reactions(text[]) from public, anon, authenticated;

-- 수집/분석 run 로그에 매칭 단계 추가
alter table public.insight_collection_runs
  drop constraint if exists insight_collection_runs_source_check;

alter table public.insight_collection_runs
  add constraint insight_collection_runs_source_check
  check (source in ('youtube', 'naver_blog', 'naver_kin', 'reddit', 'analyze', 'place_match'));
