alter table public.landing_promo
  add column if not exists is_published boolean not null default false;

alter table public.landing_promo
  add column if not exists block_order jsonb not null default '["notice","copy","video","images"]'::jsonb;
