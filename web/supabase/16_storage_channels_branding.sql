-- Аватар и шапка канала: путь channels/<auth.uid>/...
-- Ранее в 07_studio_storage.sql были только правила для videos/<auth.uid>/...

drop policy if exists media_insert_channels_folder on storage.objects;
create policy media_insert_channels_folder
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'channels'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists media_update_channels_folder on storage.objects;
create policy media_update_channels_folder
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'channels'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'channels'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists media_delete_channels_folder on storage.objects;
create policy media_delete_channels_folder
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (storage.foldername(name))[1] = 'channels'
  and (storage.foldername(name))[2] = auth.uid()::text
);
