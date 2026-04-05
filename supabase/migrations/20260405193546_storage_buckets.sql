-- ============================================================
-- Storage Buckets: photos and documents
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'photos',
    'photos',
    false,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  ),
  (
    'documents',
    'documents',
    false,
    26214400,
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage RLS Policies
-- ============================================================

-- Photos bucket
CREATE POLICY "Users can upload photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own photos" ON storage.objects
  FOR SELECT USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own photos" ON storage.objects
  FOR DELETE USING (bucket_id = 'photos' AND auth.uid() IS NOT NULL);

-- Documents bucket
CREATE POLICY "Users can upload documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete own documents" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND auth.uid() IS NOT NULL);
