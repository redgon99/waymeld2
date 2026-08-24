-- landing_promo: zh → zh-CN, zh-TW 추가
alter table public.landing_promo
  drop constraint if exists landing_promo_locale_check;

update public.landing_promo set locale = 'zh-CN' where locale = 'zh';

alter table public.landing_promo
  add constraint landing_promo_locale_check
  check (locale in ('ko', 'en', 'ja', 'zh-CN', 'zh-TW', 'es', 'fr', 'de', 'ru'));
