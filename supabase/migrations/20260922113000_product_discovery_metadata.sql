-- Transparência: preserva a origem dos dados importados para revisão/auditoria.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS discovery_source_name text,
  ADD COLUMN IF NOT EXISTS discovery_source_url text,
  ADD COLUMN IF NOT EXISTS discovery_imported_at timestamptz,
  ADD COLUMN IF NOT EXISTS discovery_imported_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.discovery_source_name IS 'Fonte declarada pelo provider de descoberta; não representa autorização de uso.';
COMMENT ON COLUMN public.products.discovery_source_url IS 'URL de origem encontrada na busca, quando disponível.';
COMMENT ON COLUMN public.products.discovery_imported_fields IS 'Campos importados como sugestão e revisados pelo vendedor.';
