-- trip_collaborators 정본 정의.
--
-- 20260812000000_fix_trips_rls_recursion.sql 이 이 테이블을 참조하지만
-- 정작 생성 구문이 저장소에 없어서 새 환경에서는 마이그레이션이 재현되지 않았다.
-- 이미 만들어진 환경도 그대로 통과하도록 전부 멱등하게 작성한다.
-- (RLS 정책은 순환 참조를 끊는 헬퍼가 필요하므로 다음 마이그레이션에서 정의된다.)

create table if not exists public.trip_collaborators (
  trip_id    uuid not null references public.waymeld_trips(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'editor',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

alter table public.trip_collaborators
  add column if not exists role text not null default 'editor';

alter table public.trip_collaborators
  add column if not exists invited_by uuid references auth.users(id) on delete set null;

alter table public.trip_collaborators
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'trip_collaborators_role_check'
      and conrelid = 'public.trip_collaborators'::regclass
  ) then
    alter table public.trip_collaborators
      add constraint trip_collaborators_role_check
      check (role in ('editor', 'viewer'));
  end if;
end
$$;

create index if not exists trip_collaborators_user_idx
  on public.trip_collaborators (user_id);

create index if not exists trip_collaborators_trip_idx
  on public.trip_collaborators (trip_id);

alter table public.trip_collaborators enable row level security;
