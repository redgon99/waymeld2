-- 신고 접수 · 관리자 검수 큐
--
-- 공유마당 일정·가이드 카드처럼 이용자가 올린 내용을 누구나 신고할 수 있게 하고,
-- 관리자만 상태를 바꾸며 처리한다. 신고자는 자기 신고만 다시 볼 수 있다.

create table if not exists public.content_reports (
  id uuid primary key default uuid_generate_v4(),
  target_type text not null check (
    target_type in ('trip', 'plaza_listing', 'guide', 'place')
  ),
  target_id text not null,
  /* 원본이 지워져도 큐에서 무엇이었는지 알아볼 수 있게 남기는 표시용 이름 */
  target_label text,
  target_url text,
  reason text not null check (
    reason in ('spam', 'inappropriate', 'wrong_info', 'copyright', 'other')
  ),
  detail text,
  reporter_id uuid references auth.users(id) on delete set null,
  reporter_locale text,
  status text not null default 'open' check (
    status in ('open', 'reviewing', 'resolved', 'rejected')
  ),
  admin_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_reports_queue_idx
  on public.content_reports (status, created_at desc);

create index if not exists content_reports_target_idx
  on public.content_reports (target_type, target_id);

/* 같은 사람이 같은 대상을 중복 신고해 큐를 채우지 않도록 */
create unique index if not exists content_reports_open_dedupe_idx
  on public.content_reports (target_type, target_id, reporter_id)
  where status in ('open', 'reviewing') and reporter_id is not null;

alter table public.content_reports enable row level security;

drop policy if exists "content_reports_insert_any" on public.content_reports;
create policy "content_reports_insert_any" on public.content_reports
  for insert
  with check (reporter_id is null or reporter_id = auth.uid());

drop policy if exists "content_reports_select_own_or_admin" on public.content_reports;
create policy "content_reports_select_own_or_admin" on public.content_reports
  for select
  using (
    (reporter_id is not null and reporter_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "content_reports_admin_update" on public.content_reports;
create policy "content_reports_admin_update" on public.content_reports
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "content_reports_admin_delete" on public.content_reports;
create policy "content_reports_admin_delete" on public.content_reports
  for delete
  using (public.is_admin());

drop trigger if exists content_reports_updated_at on public.content_reports;
create trigger content_reports_updated_at
  before update on public.content_reports
  for each row execute procedure public.set_updated_at();
