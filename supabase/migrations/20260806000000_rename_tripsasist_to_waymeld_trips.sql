-- =============================================
-- 레거시 테이블명 tripsasist → waymeld_trips
-- (public.trips 는 별도 스키마로 이미 존재)
-- =============================================

do $$
begin
  if to_regclass('public.tripsasist') is not null
     and to_regclass('public.waymeld_trips') is null then
    alter table public.tripsasist rename to waymeld_trips;
  end if;
end $$;

alter index if exists public.tripsasist_owner_idx rename to waymeld_trips_owner_idx;
alter index if exists public.tripsasist_slug_idx rename to waymeld_trips_slug_idx;
alter index if exists public.tripsasist_plaza_listed_idx rename to waymeld_trips_plaza_listed_idx;
alter index if exists public.tripsasist_plaza_locale_idx rename to waymeld_trips_plaza_locale_idx;

drop trigger if exists tripsasist_updated_at on public.waymeld_trips;
drop trigger if exists waymeld_trips_updated_at on public.waymeld_trips;
create trigger waymeld_trips_updated_at
  before update on public.waymeld_trips
  for each row execute procedure public.set_updated_at();

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'waymeld_trips'
      and policyname = 'tripsasist_admin_select'
  ) then
    alter policy "tripsasist_admin_select" on public.waymeld_trips
      rename to "waymeld_trips_admin_select";
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'tripsasist_pkey' and conrelid = 'public.waymeld_trips'::regclass
  ) then
    alter table public.waymeld_trips rename constraint tripsasist_pkey to waymeld_trips_pkey;
  end if;
  if exists (
    select 1 from pg_constraint
    where conname = 'tripsasist_slug_key' and conrelid = 'public.waymeld_trips'::regclass
  ) then
    alter table public.waymeld_trips rename constraint tripsasist_slug_key to waymeld_trips_slug_key;
  end if;
  if exists (
    select 1 from pg_constraint
    where conname = 'tripsasist_owner_id_fkey' and conrelid = 'public.waymeld_trips'::regclass
  ) then
    alter table public.waymeld_trips
      rename constraint tripsasist_owner_id_fkey to waymeld_trips_owner_id_fkey;
  end if;
end $$;
