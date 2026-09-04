-- =============================================
-- 버전 이력 되돌리기
--
-- ②의 감사 로그가 이미 변경 전/후를 갖고 있으므로 별도 버전 테이블을 만들
-- 필요 없다. 감사 로그 항목 하나를 골라 그 시점으로 되돌린다.
--
-- ⚠️ 핵심 안전장치: audit_redact()는 1000바이트 넘는 값을 잘라낸다. 그 상태로
-- 복원하면 가이드 본문(body_md) 자리에 "[생략됨 · N bytes]" 같은 문자열이
-- 덮어써져 원본이 파괴된다. 그래서
--   (1) 잘림 마커를 문자열이 아니라 구조화된 jsonb 객체로 바꾸고
--       (사용자 텍스트와 절대 헷갈리지 않게)
--   (2) 복원 시 잘린 필드가 하나라도 있으면 거부한다.
-- =============================================

-- (1) 잘림 마커를 구조화 — 이후 기록부터 적용된다
create or replace function public.audit_redact(j jsonb)
returns jsonb
language sql
immutable
set search_path = public
as $fn$
  select coalesce(
    jsonb_object_agg(
      key,
      case
        when length(value::text) > 1000
          then jsonb_build_object('__audit_omitted_bytes__', length(value::text))
        else value
      end
    ),
    '{}'::jsonb
  )
  from jsonb_each(coalesce(j, '{}'::jsonb));
$fn$;

-- 잘린 필드 목록. 구조화 마커와, 이 마이그레이션 이전에 남은 문자열 마커를 모두 잡는다.
create or replace function public.audit_omitted_fields(j jsonb)
returns text[]
language sql
immutable
set search_path = public
as $fn$
  select coalesce(array_agg(e.key order by e.key), '{}')
  from jsonb_each(coalesce(j, '{}'::jsonb)) e
  where (jsonb_typeof(e.value) = 'object' and e.value ? '__audit_omitted_bytes__')
     or (jsonb_typeof(e.value) = 'string' and e.value #>> '{}' like '[생략됨 %')
$fn$;

-- (2) 되돌리기
create or replace function public.admin_restore_audit_entry(p_audit_id bigint)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_table text;
  v_op text;
  v_row_id text;
  v_before jsonb;
  v_omitted text[];
  v_set text;
  -- 내용 테이블만 허용한다. admin_users(권한 부여)·content_reports(신고 처리)
  -- 처럼 되돌리면 안 되는 것은 뺐다.
  v_allowed text[] := array['guide_articles', 'landing_promo', 'admin_notices', 'scenario_catalog'];
begin
  if not public.is_admin() then
    raise exception '관리자만 실행할 수 있습니다.' using errcode = '42501';
  end if;

  select table_name, operation, row_id, before
    into v_table, v_op, v_row_id, v_before
    from public.admin_audit_log where id = p_audit_id;

  if v_table is null then
    raise exception '해당 로그를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  if not (v_table = any(v_allowed)) then
    raise exception '% 은(는) 되돌리기를 지원하지 않습니다.', v_table using errcode = '22023';
  end if;

  if v_op = 'INSERT' then
    raise exception '추가는 되돌릴 수 없습니다. 해당 화면에서 삭제하세요.' using errcode = '22023';
  end if;

  if v_before is null or v_before = '{}'::jsonb then
    raise exception '이 로그에는 복원할 이전 값이 없습니다.' using errcode = '22023';
  end if;

  v_omitted := public.audit_omitted_fields(v_before);
  if array_length(v_omitted, 1) > 0 then
    raise exception '값이 커서 기록되지 않은 필드가 있어 되돌릴 수 없습니다: %',
      array_to_string(v_omitted, ', ') using errcode = '22023';
  end if;

  if v_op = 'UPDATE' then
    -- before에는 바뀐 컬럼만 들어 있다. jsonb_populate_record로 컬럼 타입에 맞게
    -- 캐스팅한 뒤 그 컬럼들만 되돌린다.
    select string_agg(format('%I = x.%I', k, k), ', ')
      into v_set from jsonb_object_keys(v_before) k;

    execute format(
      'update public.%I t set %s from jsonb_populate_record(null::public.%I, $1) x where t.id::text = $2',
      v_table, v_set, v_table
    ) using v_before, v_row_id;

  elsif v_op = 'DELETE' then
    execute format(
      'insert into public.%I select * from jsonb_populate_record(null::public.%I, $1)',
      v_table, v_table
    ) using v_before;
  end if;

  -- 되돌리기 자체도 대상 테이블의 감사 트리거가 잡으므로 별도 기록은 하지 않는다.
  return jsonb_build_object('table', v_table, 'operation', v_op, 'row_id', v_row_id, 'restored', v_before);
end;
$fn$;

revoke all on function public.admin_restore_audit_entry(bigint) from public;
revoke all on function public.admin_restore_audit_entry(bigint) from anon;
grant execute on function public.admin_restore_audit_entry(bigint) to authenticated;
