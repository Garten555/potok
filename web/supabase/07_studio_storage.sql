insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists media_public_read on storage.objects;
create policy media_public_read
on storage.objects
for select
to public
using (bucket_id = 'media');

drop policy if exists media_insert_own_folder on storage.objects;
create policy media_insert_own_folder
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'videos'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists media_update_own_folder on storage.objects;
create policy media_update_own_folder
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'videos'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'videos'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists media_delete_own_folder on storage.objects;
create policy media_delete_own_folder
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'videos'
  and (storage.foldername(name))[2] = auth.uid()::text
);
