DROP POLICY IF EXISTS "read store assets" ON storage.objects;

CREATE POLICY "read public store assets"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] <> 'receipts'
);

CREATE POLICY "owners read own store assets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

REVOKE EXECUTE ON FUNCTION public.mark_overdue_installments() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_subscription_grace() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_store(text) TO anon, authenticated;