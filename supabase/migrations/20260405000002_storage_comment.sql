-- Storage buckets are created programmatically via lib/supabase/setup-buckets.ts
-- using the service role client (Supabase SQL cannot create buckets directly).
--
-- Bucket conventions:
--   photos     — 10 MB max, image/jpeg + image/png + image/webp + image/heic, private
--   documents  — 25 MB max, pdf/docx/xlsx/images, private
--
-- Storage path convention: {project_id}/{task_or_stage_id}/{filename}
COMMENT ON SCHEMA public IS 'App schema. Storage buckets (photos, documents) are created via setup-buckets.ts.';
