-- 022 — Uploaded event files: only their owner and the event's studio
--
-- FOUND 11/11/2026 by the owner's read-only storage check. Production's
-- `event-files` bucket is private, but its seven hand-made policies on
-- storage.objects checked only `bucket_id = 'event-files'`:
--   read_anon             SELECT  anon           → anyone holding the public
--                                                   key (it ships in the live
--                                                   bundle) could list and
--                                                   download EVERY file
--   upload_anon           INSERT  anon           → anyone could upload, with
--                                                   no size or type limit
--   "Planners can delete their own files"  DELETE authenticated → any signed-in
--                                                   user could delete ANY file
--   read_authenticated, "Planners can read their own files",
--   upload_authenticated, "Planners can upload their own files"
--                                                 → "their own" in name only
-- At the time: 23 files, 31 kB, the newest from 7/22/2026.
--
-- THE RULE NOW. A file's path is <uploader uid>/<event id>/<category>/<ts>_<name>
-- (src/lib/storage.js buildPath). Then:
--   · read:   the uploader, or a member of the studio that owns the event
--   · upload: signed in, and only under your own uid
--   · delete: only your own files (account deletion runs server-side with the
--             service role, which RLS does not restrict)
--   · nothing for anon, and no UPDATE policy (uploads never overwrite: every
--     name carries a timestamp, and uploadFile no longer upserts)
-- The bucket also gets the limits the app already enforces in the browser
-- (validateFile: 10 MB; PDF, images, Word), so the server says the same thing.
--
-- Idempotent: drops by name with IF EXISTS, then creates. Safe to run twice.

drop policy if exists "read_anon" on storage.objects;
drop policy if exists "upload_anon" on storage.objects;
drop policy if exists "read_authenticated" on storage.objects;
drop policy if exists "upload_authenticated" on storage.objects;
drop policy if exists "Planners can read their own files" on storage.objects;
drop policy if exists "Planners can upload their own files" on storage.objects;
drop policy if exists "Planners can delete their own files" on storage.objects;
drop policy if exists "event_files: owner or studio read" on storage.objects;
drop policy if exists "event_files: owner upload" on storage.objects;
drop policy if exists "event_files: owner delete" on storage.objects;

create policy "event_files: owner or studio read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'event-files'
    and (
      split_part(name, '/', 1) = auth.uid()::text
      or exists (
        select 1 from public.events e
        where e.id = split_part(name, '/', 2)
          and public.is_studio_member(e.studio_id)
      )
    )
  );

create policy "event_files: owner upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'event-files'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "event_files: owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'event-files'
    and split_part(name, '/', 1) = auth.uid()::text
  );

update storage.buckets
   set public = false,
       file_size_limit = 10485760,
       allowed_mime_types = array[
         'application/pdf',
         'image/jpeg', 'image/png', 'image/webp', 'image/heic',
         'application/msword',
         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       ]
 where id = 'event-files';
