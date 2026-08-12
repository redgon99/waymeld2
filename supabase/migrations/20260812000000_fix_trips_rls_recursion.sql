-- waymeld_trips ↔ trip_collaborators RLS 상호 참조로 인한
-- "infinite recursion detected in policy" (42P17) 수정.
-- SECURITY DEFINER 헬퍼로 순환을 끊고, collaborator 조건의 trip_id = id 버그도 교정.

create or replace function public.is_trip_collaborator(p_trip_id uuid)
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
  );
$$;

create or replace function public.is_trip_owner(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.waymeld_trips t
    where t.id = p_trip_id
      and t.owner_id = auth.uid()
  );
$$;

revoke all on function public.is_trip_collaborator(uuid) from public;
revoke all on function public.is_trip_owner(uuid) from public;
grant execute on function public.is_trip_collaborator(uuid) to authenticated, anon;
grant execute on function public.is_trip_owner(uuid) to authenticated, anon;

drop policy if exists "owner_select" on public.waymeld_trips;
create policy "owner_select" on public.waymeld_trips
  for select
  using (
    auth.uid() = owner_id
    or public.is_trip_collaborator(id)
  );

drop policy if exists "owner_update" on public.waymeld_trips;
create policy "owner_update" on public.waymeld_trips
  for update
  using (
    auth.uid() = owner_id
    or public.is_trip_collaborator(id)
  )
  with check (
    auth.uid() = owner_id
    or public.is_trip_collaborator(id)
  );

drop policy if exists "collab_select" on public.trip_collaborators;
create policy "collab_select" on public.trip_collaborators
  for select
  using (
    auth.uid() = user_id
    or public.is_trip_owner(trip_id)
  );

drop policy if exists "collab_insert" on public.trip_collaborators;
create policy "collab_insert" on public.trip_collaborators
  for insert
  with check (public.is_trip_owner(trip_id));

drop policy if exists "collab_delete" on public.trip_collaborators;
create policy "collab_delete" on public.trip_collaborators
  for delete
  using (
    auth.uid() = user_id
    or public.is_trip_owner(trip_id)
  );
