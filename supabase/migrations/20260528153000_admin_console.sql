-- =============================================
-- 관리자 콘솔: 사용자 확인 / 공유자료 현황 / 공지사항
-- =============================================

create table if not exists public.admin_users (
  id uuid primary key default uuid_generate_v4(),
  email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_own" on public.admin_users;
create policy "admin_users_select_own" on public.admin_users
  for select using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')));

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.admin_users au
    where lower(au.email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;

create table if not exists public.admin_user_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_verified boolean not null default false,
  memo text,
  verified_at timestamptz,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.admin_user_verifications enable row level security;

drop policy if exists "admin_user_verifications_admin_all" on public.admin_user_verifications;
create policy "admin_user_verifications_admin_all" on public.admin_user_verifications
  for all
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.admin_notices (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  is_published boolean not null default true,
  pinned boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_notices_published_idx
  on public.admin_notices (is_published, pinned desc, updated_at desc);

alter table public.admin_notices enable row level security;

drop policy if exists "admin_notices_select_published_or_admin" on public.admin_notices;
create policy "admin_notices_select_published_or_admin" on public.admin_notices
  for select using (is_published = true or public.is_admin());

drop policy if exists "admin_notices_admin_write" on public.admin_notices;
create policy "admin_notices_admin_write" on public.admin_notices
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tripsasist_admin_select" on public.tripsasist;
create policy "tripsasist_admin_select" on public.tripsasist
  for select using (public.is_admin());

drop policy if exists "share_plaza_imports_admin_select" on public.share_plaza_imports;
create policy "share_plaza_imports_admin_select" on public.share_plaza_imports
  for select using (public.is_admin());

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end
$$ language plpgsql;

drop trigger if exists admin_notices_updated_at on public.admin_notices;
create trigger admin_notices_updated_at
  before update on public.admin_notices
  for each row execute procedure public.set_updated_at();
