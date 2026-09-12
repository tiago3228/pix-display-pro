-- Vitrini — garantir o bucket usado por logos, banners e fotos de produtos.
-- O bucket é privado porque a aplicação entrega URLs assinadas temporárias.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'store-assets',
  'store-assets',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'application/pdf']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = excluded.allowed_mime_types;

-- Reforça as políticas esperadas para leitura pública por URL assinada
-- e upload separado por usuário autenticado.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'read store assets'
  ) THEN
    CREATE POLICY "read store assets"
      ON storage.objects FOR SELECT TO anon, authenticated
      USING (bucket_id = 'store-assets');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'upload own store assets'
  ) THEN
    CREATE POLICY "upload own store assets"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'store-assets'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
