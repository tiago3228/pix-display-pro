
CREATE POLICY "read store assets" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'store-assets');
CREATE POLICY "upload own store assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "update own store assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "delete own store assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
