-- Trip materials private storage bucket
insert into storage.buckets (id, name, public, file_size_limit)
values ('trip-materials', 'trip-materials', false, 15728640)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- Path: {user_id}/{trip_id}/{material_id}/{filename}
-- First folder must match auth.uid()

drop policy if exists "trip_materials_select_own" on storage.objects;
create policy "trip_materials_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trip-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "trip_materials_insert_own" on storage.objects;
create policy "trip_materials_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trip-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "trip_materials_delete_own" on storage.objects;
create policy "trip_materials_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'trip-materials'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
