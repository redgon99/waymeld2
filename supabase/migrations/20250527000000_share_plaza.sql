-- 공유마당: tripsasist plaza 컬럼 + 끌어오기 이력

alter table public.tripsasist
  add column if not exists listed_in_plaza boolean not null default false,
  add column if not exists plaza_display_name text,
  add column if not exists plaza_contact_email text,
  add column if not exists plaza_center_lat double precision,
  add column if not exists plaza_center_lng double precision,
  add column if not exists plaza_listed_at timestamptz;

create index if not exists tripsasist_plaza_listed_idx
  on public.tripsasist (plaza_listed_at desc nulls last)
  where listed_in_plaza = true;

-- 마당 목록 조회 (공개·마당 등록 여행)
drop policy if exists "plaza_list_select" on public.tripsasist;
create policy "plaza_list_select" on public.tripsasist
  for select using (listed_in_plaza = true and is_public = true);

-- 끌어오기 이력
create table if not exists public.share_plaza_imports (
  id uuid primary key default uuid_generate_v4(),
  source_trip_id uuid not null references public.tripsasist(id) on delete cascade,
  importer_id uuid not null references auth.users(id) on delete cascade,
  cloned_trip_id uuid references public.tripsasist(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_trip_id, importer_id)
);

create index if not exists share_plaza_imports_importer_idx
  on public.share_plaza_imports (importer_id);

alter table public.share_plaza_imports enable row level security;

drop policy if exists "import_select_own" on public.share_plaza_imports;
create policy "import_select_own" on public.share_plaza_imports
  for select using (auth.uid() = importer_id);

drop policy if exists "import_insert_own" on public.share_plaza_imports;
create policy "import_insert_own" on public.share_plaza_imports
  for insert with check (auth.uid() = importer_id);
