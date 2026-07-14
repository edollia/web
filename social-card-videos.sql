-- Run this once in the Supabase SQL editor for the main doll.gg project.
-- Public reads are intentional: these files are decorative public-site videos.
-- Upload, replacement, and deletion stay restricted to the dashboard admin UID.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'social-card-videos',
  'social-card-videos',
  true,
  20971520,
  array['video/mp4', 'video/webm']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "doll admin uploads social card videos" on storage.objects;
create policy "doll admin uploads social card videos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'social-card-videos'
  and (select auth.uid()) = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3'::uuid
);

drop policy if exists "doll admin updates social card videos" on storage.objects;
create policy "doll admin updates social card videos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'social-card-videos'
  and (select auth.uid()) = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3'::uuid
)
with check (
  bucket_id = 'social-card-videos'
  and (select auth.uid()) = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3'::uuid
);

drop policy if exists "doll admin deletes social card videos" on storage.objects;
create policy "doll admin deletes social card videos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'social-card-videos'
  and (select auth.uid()) = '1b12f04e-c1a9-42c5-bd3a-04b6186245c3'::uuid
);
