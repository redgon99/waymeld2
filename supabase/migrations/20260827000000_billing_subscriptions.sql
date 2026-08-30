-- 구독 결제 인프라 (포트원 경유 토스페이먼츠)
-- 참고: docs/Waymeld_수익화_실행계획_2026-08-27.md §1.2

-- 빌링키 보관 — 카드번호 자체는 저장하지 않고 포트원이 발급한 토큰만 저장한다
create table if not exists public.billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'portone',
  billing_key text not null,
  card_last4 text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.billing_customers enable row level security;
-- 클라이언트 접근 정책을 만들지 않는다 — Edge Function의 서비스 롤 키만 이 테이블을 다룬다

drop trigger if exists billing_customers_updated_at on public.billing_customers;
create trigger billing_customers_updated_at
  before update on public.billing_customers
  for each row execute procedure public.set_updated_at();

-- 결제 이벤트 로그 — 웹훅 중복 처리 방지(idempotency) + 감사 추적
create table if not exists public.billing_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider_event_id text unique,
  type text not null check (type in ('payment_success', 'payment_failed', 'cancelled', 'renewed')),
  amount integer,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.billing_events enable row level security;
-- 클라이언트 접근 정책을 만들지 않는다 — Edge Function의 서비스 롤 키만 이 테이블을 다룬다

create index if not exists billing_events_user_id_idx on public.billing_events (user_id);

-- profiles.plan / subscription_status / subscription_expires_at 보호
-- 지금까지 profiles_update_own 정책이 행 전체 수정을 허용하고 있어,
-- 로그인 사용자가 클라이언트에서 자기 plan을 'plus'로 직접 바꿔치기할 수 있는 구멍이었다.
-- 이 세 컬럼은 반드시 서비스 롤(Edge Function)에서만 바뀌도록 트리거로 막는다.
create or replace function public.protect_profile_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    new.plan := old.plan;
    new.subscription_status := old.subscription_status;
    new.subscription_expires_at := old.subscription_expires_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_billing_columns on public.profiles;
create trigger profiles_protect_billing_columns
  before update on public.profiles
  for each row execute procedure public.protect_profile_billing_columns();
