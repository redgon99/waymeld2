-- tour_address_overlay_cache.locale CHECK에 프랑스어·독일어·러시아어 추가
alter table public.tour_address_overlay_cache
  drop constraint if exists tour_address_overlay_cache_locale_check;

alter table public.tour_address_overlay_cache
  add constraint tour_address_overlay_cache_locale_check
  check (locale in ('en', 'ja', 'zh', 'es', 'fr', 'de', 'ru'));
