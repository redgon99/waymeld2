-- landing_promo.locale CHECK에 프랑스어·독일어·러시아어 추가
alter table public.landing_promo
  drop constraint if exists landing_promo_locale_check;

alter table public.landing_promo
  add constraint landing_promo_locale_check
  check (locale in ('ko', 'en', 'ja', 'zh', 'es', 'fr', 'de', 'ru'));
