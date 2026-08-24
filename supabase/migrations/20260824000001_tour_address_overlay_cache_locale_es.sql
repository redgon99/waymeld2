-- tour_address_overlay_cache.locale CHECK에 스페인어(es) 추가
alter table public.tour_address_overlay_cache
  drop constraint if exists tour_address_overlay_cache_locale_check;

alter table public.tour_address_overlay_cache
  add constraint tour_address_overlay_cache_locale_check
  check (locale in ('en', 'ja', 'zh', 'es'));
