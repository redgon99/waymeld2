-- 공유 링크용 공개 플래그 + RLS 강화

alter table public.tripsasist
  add column if not exists is_public boolean not null default false;

drop policy if exists "public_slug_select" on public.tripsasist;
create policy "public_slug_select" on public.tripsasist
  for select using (is_public = true);
