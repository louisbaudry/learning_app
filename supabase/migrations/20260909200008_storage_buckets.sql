-- Storage buckets. DATABASE_SCHEMA.md §6.
-- Path convention: {family_id}/{uuid}.webp — RLS on storage.objects checks
-- the family_id path prefix.

insert into storage.buckets (id, name, public) values ('question-images', 'question-images', false);
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false);

create policy question_images_family_write on storage.objects
for insert to authenticated with check (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1]::uuid in (select my_family_ids())
);

create policy question_images_family_update on storage.objects
for update to authenticated using (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1]::uuid in (select my_family_ids())
);

create policy question_images_family_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'question-images'
  and (storage.foldername(name))[1]::uuid in (select my_family_ids())
);

create policy question_images_read on storage.objects
for select to authenticated using (
  bucket_id = 'question-images'
  and (
    (storage.foldername(name))[1]::uuid in (select my_family_ids())
    or (storage.foldername(name))[1]::uuid = (select family_id from students where id = my_student_id())
  )
);

create policy avatars_family_write on storage.objects
for insert to authenticated with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1]::uuid in (select my_family_ids())
);

create policy avatars_family_update on storage.objects
for update to authenticated using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1]::uuid in (select my_family_ids())
);

create policy avatars_family_delete on storage.objects
for delete to authenticated using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1]::uuid in (select my_family_ids())
);

create policy avatars_read on storage.objects
for select to authenticated using (
  bucket_id = 'avatars'
  and (
    (storage.foldername(name))[1]::uuid in (select my_family_ids())
    or (storage.foldername(name))[1]::uuid = (select family_id from students where id = my_student_id())
  )
);
