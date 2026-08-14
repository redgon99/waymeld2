-- =============================================
-- 시나리오 카탈로그: 관리자가 미리 생성해둔 AI 테마여행 시나리오
-- (플래너는 이 테이블만 조회 — 라이브 AI 호출 없이 즉시 응답, 비용 절감)
-- 생성 시점에 ko/en/ja/zh 4개 언어 내러티브를 함께 만들어 content jsonb에 저장한다.
-- =============================================

create table if not exists public.scenario_catalog (
  id uuid primary key default uuid_generate_v4(),
  theme text not null check (
    theme in (
      'meditation', 'wellbeing', 'shopping', 'family', 'honeymoon',
      'night', 'hallyu', 'camping', 'walking', 'marine'
    )
  ),
  days int not null check (days between 1 and 7),
  region text not null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  -- {"ko": {regionLabel, title, intro, days:[{day,dayTitle,stops:[...]}]}, "en": {...}, "ja": {...}, "zh": {...}}
  content jsonb not null default '{}'::jsonb,
  candidate_region_count int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scenario_catalog_public_idx
  on public.scenario_catalog (theme, days)
  where status = 'published';

create index if not exists scenario_catalog_status_idx
  on public.scenario_catalog (status, updated_at desc);

alter table public.scenario_catalog enable row level security;

drop policy if exists "scenario_catalog_public_select" on public.scenario_catalog;
create policy "scenario_catalog_public_select" on public.scenario_catalog
  for select using (status = 'published');

drop policy if exists "scenario_catalog_admin_all" on public.scenario_catalog;
create policy "scenario_catalog_admin_all" on public.scenario_catalog
  for all
  using (public.is_admin())
  with check (public.is_admin());
