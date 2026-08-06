-- useful_tip 카테고리 + guide_articles (여행 팁 카드)

-- 1) insight_analysis category 확장
alter table public.insight_analysis
  drop constraint if exists insight_analysis_category_check;

alter table public.insight_analysis
  add constraint insight_analysis_category_check
  check (
    category in (
      'pain_point',
      'feature_request',
      'praise',
      'competitor_mention',
      'useful_tip',
      'other'
    )
  );

-- 2) tip 계열 수집 키워드 시드
insert into public.insight_keywords (source, keyword) values
  ('youtube', 'Korea T-money'),
  ('youtube', '한국 교통카드'),
  ('youtube', 'Korea SIM tip'),
  ('naver_blog', '한국 교통카드 발급'),
  ('naver_blog', '한국 여행 eSIM'),
  ('naver_kin', '티머니 외국인'),
  ('reddit', 'koreatravel')
on conflict (source, keyword) do nothing;

-- 3) 가이드 아티클
create table if not exists public.guide_articles (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  body_md text not null default '',
  summary_en text,
  topic_tags text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  source_analysis_ids uuid[] not null default '{}',
  source_urls text[] not null default '{}',
  locale text not null default 'ko',
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guide_articles_status_published_idx
  on public.guide_articles (published_at desc nulls last)
  where status = 'published';

create index if not exists guide_articles_status_idx
  on public.guide_articles (status, updated_at desc);

alter table public.guide_articles enable row level security;

drop policy if exists "guide_articles_public_select" on public.guide_articles;
create policy "guide_articles_public_select" on public.guide_articles
  for select using (status = 'published');

drop policy if exists "guide_articles_admin_all" on public.guide_articles;
create policy "guide_articles_admin_all" on public.guide_articles
  for all
  using (public.is_admin())
  with check (public.is_admin());
