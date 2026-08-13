ALTER TABLE public.program_sessions
  ADD COLUMN IF NOT EXISTS scale_image_url TEXT,
  ADD COLUMN IF NOT EXISTS scale_image_path TEXT;

CREATE POLICY "Teachers can upload program scales"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'program-scales' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers can update their program scales"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'program-scales' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Teachers can delete their program scales"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'program-scales' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Program scales are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'program-scales');