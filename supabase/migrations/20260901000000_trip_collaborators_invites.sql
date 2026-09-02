-- 여행 공유 · 공동편집 Tier 1
--
-- 1) trip_collaborators RLS 버그 수정: 기존 owner_update 정책이
--    is_trip_collaborator()만 확인해서 role='viewer'도 update를 통과시켰다.
--    role='editor'만 통과하는 is_trip_editor()로 분리한다.
-- 2) trip_collaborators에 email 컬럼 추가 — 협업자 관리 UI가 auth.users를
--    직접 조회할 수 없으므로(RLS로 막혀 있음), 초대 수락 시점에 이메일을
--    복사해 둔다.
-- 3) 아직 가입 전인 이메일에 대한 보류 초대(trip_invites) 테이블 + 로그인 시
--    수락 처리하는 accept_trip_invites() RPC.

-- ── 1) editor 전용 헬퍼로 owner_update 재정의 ──────────────────────────

create or replace function public.is_trip_editor(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_collaborators tc
    where tc.trip_id = p_trip_id
      and tc.user_id = auth.uid()
      and tc.role = 'editor'
  );
$$;

revoke all on function public.is_trip_editor(uuid) from public;
grant execute on function public.is_trip_editor(uuid) to authenticated, anon;

drop policy if exists "owner_update" on public.waymeld_trips;
create policy "owner_update" on public.waymeld_trips
  for update
  using (
    auth.uid() = owner_id
    or public.is_trip_editor(id)
  )
  with check (
    auth.uid() = owner_id
    or public.is_trip_editor(id)
  );

-- select는 editor·viewer 둘 다 허용 유지 (is_trip_collaborator 그대로)

-- ── 2) trip_collaborators.email (표시용, denormalized) ────────────────

alter table public.trip_collaborators
  add column if not exists email text;

-- ── 3) trip_invites: 미가입 이메일용 보류 초대 ─────────────────────────

create table if not exists public.trip_invites (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.waymeld_trips(id) on delete cascade,
  email       text not null,
  role        text not null default 'editor',
  invited_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  accepted_at timestamptz
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'trip_invites_role_check'
      and conrelid = 'public.trip_invites'::regclass
  ) then
    alter table public.trip_invites
      add constraint trip_invites_role_check check (role in ('editor', 'viewer'));
  end if;
end
$$;

create index if not exists trip_invites_trip_idx on public.trip_invites (trip_id);
create index if not exists trip_invites_email_idx on public.trip_invites (lower(email));

alter table public.trip_invites enable row level security;

drop policy if exists "invite_owner_select" on public.trip_invites;
create policy "invite_owner_select" on public.trip_invites
  for select
  using (public.is_trip_owner(trip_id));

drop policy if exists "invite_owner_insert" on public.trip_invites;
create policy "invite_owner_insert" on public.trip_invites
  for insert
  with check (public.is_trip_owner(trip_id) and invited_by = auth.uid());

drop policy if exists "invite_owner_delete" on public.trip_invites;
create policy "invite_owner_delete" on public.trip_invites
  for delete
  using (public.is_trip_owner(trip_id));

-- ── 4) 로그인 시 호출: 내 이메일로 온 보류 초대를 협업자로 전환 ────────

create or replace function public.accept_trip_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_count integer := 0;
begin
  select email into v_email from auth.users where id = auth.uid();
  if v_email is null then
    return 0;
  end if;

  with pending as (
    select trip_id, role, invited_by
    from public.trip_invites
    where lower(email) = lower(v_email)
      and accepted_at is null
  ),
  inserted as (
    insert into public.trip_collaborators (trip_id, user_id, role, invited_by, email)
    select p.trip_id, auth.uid(), p.role, p.invited_by, v_email
    from pending p
    on conflict (trip_id, user_id) do update set role = excluded.role, email = excluded.email
    returning 1
  )
  select count(*) into v_count from inserted;

  update public.trip_invites
  set accepted_at = now()
  where lower(email) = lower(v_email) and accepted_at is null;

  return v_count;
end;
$$;

revoke all on function public.accept_trip_invites() from public;
grant execute on function public.accept_trip_invites() to authenticated;
