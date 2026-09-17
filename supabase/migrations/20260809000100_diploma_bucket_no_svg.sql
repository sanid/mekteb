-- Diploma assets: lock the public bucket to raster images.
--
-- `image/svg+xml` was allowed when the bucket was created. SVG is XML and can
-- embed a `<script>`; because `diploma-assets` is public, an admin-supplied
-- SVG with active content would execute in any browser that renders the
-- template (stored XSS). The original migration now lists raster formats only;
-- this update applies the same rule to buckets created before that change.
--
-- The upload path (`uploadDiplomaAsset` in
-- `admin/settings/diplomas/actions.ts`) enforces the same allowlist, so this
-- is defence in depth against a spoofed client Content-Type.

update storage.buckets
set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
where id = 'diploma-assets';
