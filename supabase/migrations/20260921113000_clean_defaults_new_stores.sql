-- Tema clean padrão para novas lojas.
-- Apenas altera DEFAULTs; lojas existentes preservam suas cores atuais.

ALTER TABLE public.stores
  ALTER COLUMN primary_color SET DEFAULT '#111827';

ALTER TABLE public.sports_settings
  ALTER COLUMN primary_color SET DEFAULT '#111827',
  ALTER COLUMN secondary_color SET DEFAULT '#64748b',
  ALTER COLUMN background_color SET DEFAULT '#ffffff',
  ALTER COLUMN text_color SET DEFAULT '#111827';

ALTER TABLE public.training_settings
  ALTER COLUMN primary_color SET DEFAULT '#111827',
  ALTER COLUMN secondary_color SET DEFAULT '#64748b';

COMMENT ON COLUMN public.stores.primary_color IS 'Cor principal da loja; novas lojas usam o tema clean #111827 por padrão.';
