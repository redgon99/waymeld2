-- 랜딩 홍보 콘텐츠 (문구·동영상·이미지). 로케일당 1행.
create table if not exists public.landing_promo (
  locale text primary key check (locale in ('ko', 'en', 'ja', 'zh')),
  notice_text text not null default '',
  notice_enabled boolean not null default true,
  hero_eyebrow text not null default '',
  hero_title text not null default '',
  hero_subtitle text not null default '',
  hero_note text not null default '',
  copy_enabled boolean not null default true,
  video_kind text not null default 'youtube' check (video_kind in ('youtube', 'file')),
  youtube_url text not null default '',
  video_path text,
  video_enabled boolean not null default false,
  images jsonb not null default '[]'::jsonb,
  images_enabled boolean not null default true,
  is_published boolean not null default false,
  block_order jsonb not null default '["notice","copy","video","images"]'::jsonb,
  menu_tree jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.landing_promo enable row level security;

drop policy if exists "landing_promo_select_all" on public.landing_promo;
create policy "landing_promo_select_all" on public.landing_promo
  for select using (true);

drop policy if exists "landing_promo_admin_write" on public.landing_promo;
create policy "landing_promo_admin_write" on public.landing_promo
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists landing_promo_updated_at on public.landing_promo;
create trigger landing_promo_updated_at
  before update on public.landing_promo
  for each row execute procedure public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'landing-promo',
  'landing-promo',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "landing_promo_storage_select" on storage.objects;
create policy "landing_promo_storage_select" on storage.objects
  for select
  using (bucket_id = 'landing-promo');

drop policy if exists "landing_promo_storage_admin_insert" on storage.objects;
create policy "landing_promo_storage_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'landing-promo' and public.is_admin());

drop policy if exists "landing_promo_storage_admin_update" on storage.objects;
create policy "landing_promo_storage_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'landing-promo' and public.is_admin())
  with check (bucket_id = 'landing-promo' and public.is_admin());

drop policy if exists "landing_promo_storage_admin_delete" on storage.objects;
create policy "landing_promo_storage_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'landing-promo' and public.is_admin());
