-- =============================================
-- 신고 검수에서 직접 제재
--
-- 기존에는 신고 상태값만 바꿀 수 있었다. "조치 완료"로 표시해도 신고당한
-- 콘텐츠는 그대로 공개돼 있었고, 실제로 내리려면 다른 화면으로 가야 했다.
-- trip·plaza_listing 대상은 관리자 화면이 아예 없어 Supabase 대시보드로
-- 들어가야만 했다.
--
-- 관리자에게 waymeld_trips UPDATE 권한을 통째로 주는 대신(RLS는 컬럼 단위
-- 제한이 안 된다) SECURITY DEFINER RPC로 필요한 컬럼만 뒤집는다.
-- =============================================

-- ---------------------------------------------
-- 신고 대상의 현재 상태 — 버튼 활성/비활성과 "이미 조치됨" 표시용
-- ---------------------------------------------
create or replace function public.admin_report_target_states()
returns table (
  report_id uuid,
  target_exists boolean,
  is_active boolean,
  state_label text
)
language plpgsql
stable
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    raise exception '관리자만 조회할 수 있습니다.' using errcode = '42501';
  end if;

  return query
  select
    r.id,
    case r.target_type
      when 'trip' then t.id is not null
      when 'plaza_listing' then t.id is not null
      when 'guide' then g.id is not null
      else true
    end,
    case r.target_type
      when 'trip' then coalesce(t.is_public, false)
      when 'plaza_listing' then coalesce(t.listed_in_plaza, false)
      when 'guide' then coalesce(g.status, '') = 'published'
      else null
    end,
    case r.target_type
      when 'trip' then
        case when t.id is null then '삭제됨'
             when t.is_public then '공개중' else '비공개' end
      when 'plaza_listing' then
        case when t.id is null then '삭제됨'
             when t.listed_in_plaza then '마당 게시중' else '내려짐' end
      when 'guide' then
        case when g.id is null then '삭제됨'
             when g.status = 'published' then '게시중' else '게시중지' end
      else '제재 대상 아님'
    end
  from public.content_reports r
  -- target_id는 text다. 컬럼 쪽을 text로 캐스팅해야 잘못된 값이 들어와도
  -- uuid 파싱 에러가 나지 않는다.
  left join public.waymeld_trips t
    on r.target_type in ('trip', 'plaza_listing')
   and t.id::text = r.target_id
  left join public.guide_articles g
    on r.target_type = 'guide'
   and g.id::text = r.target_id;
end;
$fn$;

-- ---------------------------------------------
-- 제재 실행 — 대상 유형은 신고 행에서 읽는다(호출자가 불일치시킬 여지 제거)
-- ---------------------------------------------
create or replace function public.admin_moderate_report(p_report_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_type text;
  v_target text;
  v_before jsonb;
  v_after jsonb;
  v_changed text[];
  v_actor text;
begin
  if not public.is_admin() then
    raise exception '관리자만 실행할 수 있습니다.' using errcode = '42501';
  end if;

  select r.target_type, r.target_id into v_type, v_target
    from public.content_reports r where r.id = p_report_id;
  if v_type is null then
    raise exception '신고를 찾을 수 없습니다.' using errcode = 'P0002';
  end if;

  v_actor := nullif(lower(coalesce(auth.jwt() ->> 'email', '')), '');

  if v_type in ('trip', 'plaza_listing') then
    select jsonb_build_object('is_public', t.is_public, 'listed_in_plaza', t.listed_in_plaza)
      into v_before
      from public.waymeld_trips t where t.id::text = v_target;
    if v_before is null then
      raise exception '대상 여행이 이미 삭제되었습니다.' using errcode = 'P0002';
    end if;

    if v_type = 'trip' then
      -- 비공개로 되돌리면 공유마당에 남아 있으면 안 된다 — 함께 내린다.
      update public.waymeld_trips
         set is_public = false, listed_in_plaza = false
       where id::text = v_target;
    else
      -- 마당에서만 내린다. 소유자의 공유 링크는 살려둔다.
      update public.waymeld_trips
         set listed_in_plaza = false
       where id::text = v_target;
    end if;

    select jsonb_build_object('is_public', t.is_public, 'listed_in_plaza', t.listed_in_plaza)
      into v_after
      from public.waymeld_trips t where t.id::text = v_target;

    -- waymeld_trips에는 감사 트리거를 달지 않았다(자동저장 때문에 로그가
    -- 넘친다). 제재는 반드시 남아야 하므로 여기서만 직접 기록한다.
    select array_agg(k order by k) into v_changed
      from jsonb_object_keys(v_after) k
     where v_before -> k is distinct from v_after -> k;

    if v_changed is not null then
      insert into public.admin_audit_log (
        actor_email, actor_id, table_name, operation, row_id, changed_fields, before, after
      ) values (
        v_actor, auth.uid(), 'waymeld_trips', 'UPDATE', v_target, v_changed, v_before, v_after
      );
    end if;

  elsif v_type = 'guide' then
    select jsonb_build_object('status', g.status) into v_before
      from public.guide_articles g where g.id::text = v_target;
    if v_before is null then
      raise exception '대상 가이드가 이미 삭제되었습니다.' using errcode = 'P0002';
    end if;

    -- guide_articles는 감사 트리거가 이미 붙어 있어 자동 기록된다.
    update public.guide_articles set status = 'draft' where id::text = v_target;

    select jsonb_build_object('status', g.status) into v_after
      from public.guide_articles g where g.id::text = v_target;

  else
    raise exception '이 대상 유형(%)에는 제재 액션이 없습니다.', v_type
      using errcode = '22023';
  end if;

  -- 제재와 신고 처리를 한 트랜잭션으로 묶는다.
  update public.content_reports
     set status = 'resolved',
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_report_id;

  return jsonb_build_object('target_type', v_type, 'before', v_before, 'after', v_after);
end;
$fn$;

grant execute on function public.admin_report_target_states() to authenticated;
grant execute on function public.admin_moderate_report(uuid) to authenticated;
