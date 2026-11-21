-- Photos are public content, but they are served only through the first-party
-- /api/images/* proxy, which reads Storage with the service role. No client
-- role needs direct Storage access.
--
-- The public bucket flag was set to false on 2026-11-21; this migration records
-- both halves so a fresh project reproduces the same state.

update storage.buckets set public = false where id = 'photos';

drop policy if exists "Public can view photos in storage" on storage.objects;
drop policy if exists "Authenticated users can upload photos" on storage.objects;
drop policy if exists "Authenticated users can update their photos" on storage.objects;
drop policy if exists "Authenticated users can delete their photos" on storage.objects;
