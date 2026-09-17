-- Lesson-resources bucket: apply a strict MIME allowlist.
--
-- The bucket predates the allowlist work and was created in the dashboard
-- *without* `allowed_mime_types` restrictions beyond an `application/octet-stream`
-- catch-all, which admits anything the client claims. Lesson resources are
-- downloaded by students and parents, so a stored `text/html` (or worse, SVG
-- with a script) object is a real exposure even though the app serves these
-- as signed-URL downloads.
--
-- This migration creates the bucket with the allowlist if it is missing
-- (fresh installs — it should always have lived in migrations) and otherwise
-- overwrites the existing bucket's list. The upload paths
-- (`uploadLessonResource` in `admin/lessons/[id]/actions.ts` and the
-- `/api/v1/admin/lessons/[id]/resources` route) enforce the identical set, so
-- the storage backend remains the final backstop against a spoofed
-- Content-Type.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-resources',
  'lesson-resources',
  false,
  52428800, -- 50 MB
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.apple.pages',
    'application/vnd.apple.keynote',
    'application/vnd.apple.numbers',
    'image/png', 'image/jpeg', 'image/webp', 'image/gif',
    'text/plain', 'text/markdown', 'text/csv',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/ogg',
    'video/mp4', 'video/webm', 'video/quicktime',
    'application/zip'
  ]
) on conflict (id) do nothing;

update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.apple.pages',
  'application/vnd.apple.keynote',
  'application/vnd.apple.numbers',
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'text/plain', 'text/markdown', 'text/csv',
  'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/wav', 'audio/ogg',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/zip'
]
where id = 'lesson-resources';
