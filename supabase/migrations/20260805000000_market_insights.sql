-- =============================================
-- 관리자용 시장 인사이트 수집/분석
-- (한국여행 계획자·경험자의 니즈/불편함을 외부 플랫폼에서 수집·분석)
-- =============================================

create table if not exists public.insight_keywords (
  id uuid primary key default uuid_generate_v4(),
  source text not null check (source in ('youtube', 'naver_blog', 'naver_kin', 'reddit')),
  keyword text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (source, keyword)
);

alter table public.insight_keywords enable row level security;

drop policy if exists "insight_keywords_admin_all" on public.insight_keywords;
create policy "insight_keywords_admin_all" on public.insight_keywords
  for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.insight_raw_items (
  id uuid primary key default uuid_generate_v4(),
  source text not null check (source in ('youtube', 'naver_blog', 'naver_kin', 'reddit')),
  external_id text not null,
  title text,
  content text,
  author text,
  url text,
  source_created_at timestamptz,
  collected_at timestamptz not null default now(),
  raw_payload jsonb,
  unique (source, external_id)
);

create index if not exists insight_raw_items_source_idx
  on public.insight_raw_items (source, collected_at desc);

alter table public.insight_raw_items enable row level security;

drop policy if exists "insight_raw_items_admin_select" on public.insight_raw_items;
create policy "insight_raw_items_admin_select" on public.insight_raw_items
  for select using (public.is_admin());

create table if not exists public.insight_analysis (
  id uuid primary key default uuid_generate_v4(),
  raw_item_id uuid not null references public.insight_raw_items(id) on delete cascade,
  category text not null check (
    category in ('pain_point', 'feature_request', 'praise', 'competitor_mention', 'other')
  ),
  sentiment text check (sentiment in ('positive', 'neutral', 'negative')),
  summary text,
  mentioned_services text[],
  model_used text,
  analyzed_at timestamptz not null default now(),
  unique (raw_item_id)
);

create index if not exists insight_analysis_category_idx
  on public.insight_analysis (category);

alter table public.insight_analysis enable row level security;

drop policy if exists "insight_analysis_admin_select" on public.insight_analysis;
create policy "insight_analysis_admin_select" on public.insight_analysis
  for select using (public.is_admin());

create table if not exists public.insight_collection_runs (
  id uuid primary key default uuid_generate_v4(),
  source text not null check (source in ('youtube', 'naver_blog', 'naver_kin', 'reddit', 'analyze')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'error')),
  items_collected integer not null default 0,
  error_message text
);

create index if not exists insight_collection_runs_source_idx
  on public.insight_collection_runs (source, started_at desc);

alter table public.insight_collection_runs enable row level security;

drop policy if exists "insight_collection_runs_admin_select" on public.insight_collection_runs;
create policy "insight_collection_runs_admin_select" on public.insight_collection_runs
  for select using (public.is_admin());

-- 기본 시드 키워드 (관리자가 UI에서 추가/삭제 가능)
-- reddit 행은 검색어가 아니라 대상 서브레딧 이름으로 사용됨 (r/{keyword}/new 조회)
insert into public.insight_keywords (source, keyword) values
  ('youtube', 'Korea travel itinerary'),
  ('youtube', 'Seoul trip planning'),
  ('youtube', '한국여행 코스'),
  ('naver_blog', '한국여행 코스'),
  ('naver_blog', '서울 여행 계획'),
  ('naver_kin', '한국여행 추천'),
  ('reddit', 'koreatravel'),
  ('reddit', 'KoreaTravelAdvice'),
  ('reddit', 'Seoul')
on conflict (source, keyword) do nothing;
