CREATE POLICY "Teachers read own avatar"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'teacher-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers upload own avatar"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'teacher-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers update own avatar"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'teacher-avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'teacher-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers delete own avatar"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'teacher-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);