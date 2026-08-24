-- 제품 계측 이벤트 적재
--
-- Tier 3 항목(실시간 공동편집·예약 제휴 API·엔진 고도화)은 "수요가 실제로 있는가"를
-- 확인한 뒤에 착수하기로 했다. 그 판단 근거를 남기기 위한 최소 테이블이다.
-- 개인 식별정보는 담지 않는다 — 이벤트 이름과 소수의 숫자·분류값만.

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  event text not null check (char_length(event) <= 64),
  props jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users(id) on delete set null,
  /* 로그인하지 않은 방문자를 세는 단위 (브라우저 저장소의 임의 값) */
  session_id text check (session_id is null or char_length(session_id) <= 64),
  locale text check (locale is null or char_length(locale) <= 12),
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_idx
  on public.analytics_events (event, created_at desc);

alter table public.analytics_events enable row level security;

drop policy if exists "analytics_events_insert_any" on public.analytics_events;
create policy "analytics_events_insert_any" on public.analytics_events
  for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "analytics_events_admin_select" on public.analytics_events;
create policy "analytics_events_admin_select" on public.analytics_events
  for select
  using (public.is_admin());

/* 게이트 판정용 집계 — 관리자만 실행 */
create or replace function public.analytics_event_counts(p_since timestamptz)
returns table (event text, total bigint, sessions bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.event,
    count(*)::bigint as total,
    count(distinct coalesce(e.user_id::text, e.session_id))::bigint as sessions
  from public.analytics_events e
  where e.created_at >= p_since
    and public.is_admin()
  group by e.event;
$$;

revoke all on function public.analytics_event_counts(timestamptz) from public;
grant execute on function public.analytics_event_counts(timestamptz) to authenticated;
