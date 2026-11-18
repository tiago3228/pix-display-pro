-- Tempo estimado de execução para serviços, especialmente no módulo de informática.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS service_estimated_time text;

COMMENT ON COLUMN public.products.service_estimated_time IS
  'Tempo estimado de execução do serviço, editável pelo lojista.';
