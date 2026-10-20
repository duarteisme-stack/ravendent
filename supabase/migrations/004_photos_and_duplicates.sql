-- =====================================================================
-- RavenDent migration 004. Run AFTER 001, 002, 003 (SQL Editor).
-- Adds: private patient photo storage, and duplicate-entry protection.
-- =====================================================================

-- 1. Patient photos: a private bucket, one folder per patient (folder name = their user id)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('patient-photos', 'patient-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "patient photos: owner manages own folder" on storage.objects;
create policy "patient photos: owner manages own folder" on storage.objects
  for all to authenticated
  using (bucket_id = 'patient-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'patient-photos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "patient photos: clinic staff can view" on storage.objects;
create policy "patient photos: clinic staff can view" on storage.objects
  for select to authenticated
  using (bucket_id = 'patient-photos' and public.has_role('admin', 'receptionist', 'dentist'));

-- 2. Duplicate protection. Each index is created only if the existing data allows it;
--    if you already have duplicates you will see a NOTICE: rename or remove them, then re-run this file.
do $$ begin
  create unique index if not exists dental_services_name_ci on dental_services (lower(name));
exception when unique_violation then
  raise notice 'Skipped dental_services_name_ci: two services share a name (ignoring capitals). Rename one and re-run.';
end $$;

do $$ begin
  create unique index if not exists dentists_name_ci on dentists (lower(display_name));
exception when unique_violation then
  raise notice 'Skipped dentists_name_ci: two doctors share a name (ignoring capitals). Rename one and re-run.';
end $$;

do $$ begin
  create unique index if not exists blocked_slots_no_dupes
    on blocked_slots (coalesce(dentist_id, '00000000-0000-0000-0000-000000000000'::uuid), starts_at, ends_at);
exception when unique_violation then
  raise notice 'Skipped blocked_slots_no_dupes: identical closures exist. Remove the repeats and re-run.';
end $$;

do $$ begin
  create unique index if not exists dentist_availability_no_dupes on dentist_availability (dentist_id, weekday, start_time, end_time);
exception when unique_violation then
  raise notice 'Skipped dentist_availability_no_dupes: identical working times exist. Remove the repeats and re-run.';
end $$;
