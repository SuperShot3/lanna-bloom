-- Public catalog images bucket (product/bouquet/partner portraits, homepage hero).
-- Uploads: server-side via service role only (see lib/catalogWrite.ts, Phase 2+).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'catalog',
  'catalog',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Public read: bucket is public=true (anonymous GET via public URL).
-- No INSERT/UPDATE/DELETE policies for anon or authenticated — uploads use service role.
