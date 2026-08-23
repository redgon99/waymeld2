-- =============================================
-- 다국어 주소 오버레이 캐시: /info 페이지(펫동반/무장애/오디오가이드)가
-- 매 요청마다 TourAPI 다국어서비스(EngService2 등)를 다시 호출하지 않도록
-- (contentId, kind, locale) 단위로 결과를 캐싱한다. 원본 TourAPI 데이터
-- 갱신주기가 "일 1회"라 캐시도 그에 맞춰 오래 유지해도 된다.
-- 매칭 실패(no-match)도 캐싱해 반복 미스 조회를 막는다(official_address null).
-- Edge Function이 서비스롤로만 읽고 쓰며, 클라이언트는 직접 접근하지 않는다.
-- =============================================

create table if not exists public.tour_address_overlay_cache (
  content_id text not null,
  kind text not null check (kind in ('pet', 'with', 'odii')),
  locale text not null check (locale in ('en', 'ja', 'zh')),
  official_address text,
  matched_content_id text,
  matched_title text,
  distance_m int,
  fetched_at timestamptz not null default now(),
  primary key (content_id, kind, locale)
);

alter table public.tour_address_overlay_cache enable row level security;

drop policy if exists "tour_address_overlay_cache_admin_select" on public.tour_address_overlay_cache;
create policy "tour_address_overlay_cache_admin_select" on public.tour_address_overlay_cache
  for select using (public.is_admin());
