alter table public.landing_promo
  add column if not exists menu_tree jsonb not null default '[]'::jsonb;
