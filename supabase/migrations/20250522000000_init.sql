-- =============================================
-- WayMeld 2.0 초기 스키마
-- =============================================

create extension if not exists "uuid-ossp";

create table if not exists public.tripsasist (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  title         text not null default '새 여행',
  total_days    int  not null default 1,
  current_day   int  not null default 1,
  payload       jsonb not null default '{}'::jsonb,
  owner_id      uuid references auth.users(id) on delete cascade,
  is_public     boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists tripsasist_owner_idx on public.tripsasist(owner_id);
create index if not exists tripsasist_slug_idx on public.tripsasist(slug);

-- =============================================
-- RLS 정책: 소유자만 읽기/쓰기, 공유 slug는 익명 읽기 허용
-- =============================================

alter table public.tripsasist enable row level security;

drop policy if exists "owner_select" on public.tripsasist;
create policy "owner_select" on public.tripsasist
  for select using (auth.uid() = owner_id);

drop policy if exists "public_slug_select" on public.tripsasist;
create policy "public_slug_select" on public.tripsasist
  for select using (is_public = true);

drop policy if exists "owner_insert" on public.tripsasist;
create policy "owner_insert" on public.tripsasist
  for insert with check (auth.uid() = owner_id);

drop policy if exists "owner_update" on public.tripsasist;
create policy "owner_update" on public.tripsasist
  for update using (auth.uid() = owner_id);

drop policy if exists "owner_delete" on public.tripsasist;
create policy "owner_delete" on public.tripsasist
  for delete using (auth.uid() = owner_id);

-- =============================================
-- updated_at 자동 갱신
-- =============================================

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end
$$ language plpgsql;

drop trigger if exists tripsasist_updated_at on public.tripsasist;
create trigger tripsasist_updated_at
  before update on public.tripsasist
  for each row execute procedure public.set_updated_at();
