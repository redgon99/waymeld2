-- =============================================
-- 관리자 감사 로그 (누가·언제·무엇을 바꿨는지)
--
-- 호출부마다 로깅 코드를 넣는 방식은 관리자 변경 지점이 9개 테이블에
-- 흩어져 있어(admin.ts / adminInsights.ts / contentReports.ts /
-- distribution.ts / guides.ts / landingPromo.ts / scenarioCatalog.ts)
-- 새 기능을 추가할 때 빠뜨리기 쉽다. DB 트리거로 붙이면 어느 경로로
-- 들어온 변경이든(앱·대시보드·엣지함수) 빠짐없이 기록된다.
--
-- 로그는 append-only다: SELECT 정책만 두고 UPDATE/DELETE 정책을 만들지
-- 않아, 관리자라도 자기 흔적을 지울 수 없다.
-- =============================================

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  -- 서비스 롤(엣지 함수·크론)로 들어온 변경은 JWT가 없어 null로 남는다 (UI에서 "시스템"으로 표기)
  actor_email text,
  actor_id uuid,
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  row_id text,
  -- UPDATE에서 실제로 값이 달라진 컬럼만 (updated_at 제외)
  changed_fields text[],
  -- UPDATE면 바뀐 컬럼만, INSERT/DELETE면 행 전체
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_log_created_idx
  on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_table_idx
  on public.admin_audit_log (table_name, created_at desc);
create index if not exists admin_audit_log_actor_idx
  on public.admin_audit_log (actor_email, created_at desc);

alter table public.admin_audit_log enable row level security;

drop policy if exists "admin_audit_log_admin_select" on public.admin_audit_log;
create policy "admin_audit_log_admin_select" on public.admin_audit_log
  for select using (public.is_admin());
-- INSERT는 아래 SECURITY DEFINER 트리거만 수행한다. UPDATE/DELETE 정책은
-- 일부러 만들지 않는다(누구도 로그를 고치거나 지울 수 없음).

-- ---------------------------------------------
-- 큰 값은 크기만 남기고 잘라낸다.
-- scenario_catalog.content(9개 언어 서술문)나 waymeld_trips.payload처럼
-- 수십~수백 KB인 컬럼을 그대로 담으면 감사 로그가 원본 데이터를 통째로
-- 복제하게 된다. 컬럼명을 하드코딩하지 않고 길이로만 판단한다.
-- ---------------------------------------------
create or replace function public.audit_redact(j jsonb)
returns jsonb
language sql
immutable
as $$
  select coalesce(
    jsonb_object_agg(
      key,
      case
        when length(value::text) > 1000
          then to_jsonb('[생략됨 · ' || length(value::text) || ' bytes]'::text)
        else value
      end
    ),
    '{}'::jsonb
  )
  from jsonb_each(coalesce(j, '{}'::jsonb));
$$;

-- ---------------------------------------------
-- 트리거 본체
-- ---------------------------------------------
create or replace function public.log_admin_action()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before_full jsonb;
  v_after_full  jsonb;
  v_before jsonb;
  v_after  jsonb;
  v_changed text[];
  v_row_id text;
begin
  if TG_OP = 'INSERT' then
    v_after_full := to_jsonb(NEW);
    v_before := null;
    v_after := public.audit_redact(v_after_full);

  elsif TG_OP = 'DELETE' then
    v_before_full := to_jsonb(OLD);
    v_before := public.audit_redact(v_before_full);
    v_after := null;

  else -- UPDATE
    v_before_full := to_jsonb(OLD);
    v_after_full := to_jsonb(NEW);

    -- updated_at은 거의 모든 쓰기에서 바뀌므로 변경 판단에서 제외한다.
    -- 이것만 바뀐 UPDATE는 실질 변경이 없는 것으로 보고 기록하지 않는다.
    select array_agg(e.key order by e.key)
      into v_changed
      from jsonb_each(v_after_full) e
     where e.key <> 'updated_at'
       and v_before_full -> e.key is distinct from e.value;

    if v_changed is null then
      return NEW;
    end if;

    select public.audit_redact(jsonb_object_agg(k, v_before_full -> k)) into v_before
      from unnest(v_changed) k;
    select public.audit_redact(jsonb_object_agg(k, v_after_full -> k)) into v_after
      from unnest(v_changed) k;
  end if;

  v_row_id := coalesce(v_after_full ->> 'id', v_before_full ->> 'id');

  insert into public.admin_audit_log (
    actor_email, actor_id, table_name, operation, row_id, changed_fields, before, after
  ) values (
    nullif(lower(coalesce(auth.jwt() ->> 'email', '')), ''),
    auth.uid(),
    TG_TABLE_NAME,
    TG_OP,
    v_row_id,
    v_changed,
    v_before,
    v_after
  );

  if TG_OP = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

-- ---------------------------------------------
-- 감사 대상 테이블에 트리거 부착
--
-- content_reports는 일반 사용자가 신고를 INSERT하므로 관리자 조치인
-- UPDATE/DELETE만 건다. insight_raw_items·distribution_posts처럼
-- 수집·발행 파이프라인이 대량으로 쓰는 테이블은 제외했다(로그 홍수 방지).
-- ---------------------------------------------
do $$
declare
  t text;
  audited text[] := array[
    'admin_users',               -- 관리자 권한 부여/회수 (가장 민감)
    'admin_notices',             -- 공지
    'admin_user_verifications',  -- 사용자 검증·메모
    'guide_articles',            -- 가이드 카드
    'scenario_catalog',          -- 시나리오 게시/게시중지/삭제
    'landing_promo',             -- 랜딩페이지
    'distribution_accounts',     -- 배포 계정 자격증명
    'insight_keywords'           -- 수집 키워드
  ];
begin
  foreach t in array audited loop
    if to_regclass('public.' || t) is null then
      raise notice 'skip: public.% 없음', t;
      continue;
    end if;
    execute format('drop trigger if exists %I on public.%I', 'audit_' || t, t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.log_admin_action()',
      'audit_' || t, t
    );
  end loop;

  -- 신고는 사용자가 만들고 관리자가 처리한다 — 처리 행위만 남긴다.
  if to_regclass('public.content_reports') is not null then
    drop trigger if exists audit_content_reports on public.content_reports;
    create trigger audit_content_reports
      after update or delete on public.content_reports
      for each row execute function public.log_admin_action();
  end if;
end;
$$;
