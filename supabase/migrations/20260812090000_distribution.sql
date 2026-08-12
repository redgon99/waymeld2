-- =============================================
-- 배포관리: 가이드/인사이트 콘텐츠를 국가·SNS별로 게시 관리
-- (관리자가 검토 후 승인 → 게시하는 큐 방식)
-- =============================================

create table if not exists public.distribution_accounts (
  id uuid primary key default uuid_generate_v4(),
  platform text not null check (
    platform in ('x', 'reddit', 'youtube', 'tiktok', 'weibo', 'xiaohongshu')
  ),
  country text not null,
  label text not null,
  handle text,
  -- OAuth 토큰 등 플랫폼별 자격증명 (계정마다 다름). 관리자 전용 RLS로만 select 가능.
  credentials jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists distribution_accounts_platform_idx
  on public.distribution_accounts (platform, country);

alter table public.distribution_accounts enable row level security;

drop policy if exists "distribution_accounts_admin_all" on public.distribution_accounts;
create policy "distribution_accounts_admin_all" on public.distribution_accounts
  for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.distribution_posts (
  id uuid primary key default uuid_generate_v4(),
  platform text not null check (
    platform in ('x', 'reddit', 'youtube', 'tiktok', 'weibo', 'xiaohongshu')
  ),
  country text not null,
  locale text not null default 'ko',
  account_id uuid references public.distribution_accounts(id) on delete set null,
  source_guide_id uuid references public.guide_articles(id) on delete set null,
  title text,
  body text not null default '',
  media_urls text[] not null default '{}',
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'scheduled', 'posted', 'failed')),
  scheduled_at timestamptz,
  posted_at timestamptz,
  external_post_id text,
  external_url text,
  error_message text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists distribution_posts_status_idx
  on public.distribution_posts (status, created_at desc);

create index if not exists distribution_posts_platform_idx
  on public.distribution_posts (platform, country);

alter table public.distribution_posts enable row level security;

drop policy if exists "distribution_posts_admin_all" on public.distribution_posts;
create policy "distribution_posts_admin_all" on public.distribution_posts
  for all
  using (public.is_admin())
  with check (public.is_admin());
