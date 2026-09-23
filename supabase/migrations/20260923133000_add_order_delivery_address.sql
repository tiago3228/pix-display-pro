-- Endereço de entrega é solicitado somente quando o proprietário habilita a entrega no produto.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS delivery_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_cep text, ADD COLUMN IF NOT EXISTS delivery_address text,
  ADD COLUMN IF NOT EXISTS delivery_number text, ADD COLUMN IF NOT EXISTS delivery_complement text,
  ADD COLUMN IF NOT EXISTS delivery_neighborhood text, ADD COLUMN IF NOT EXISTS delivery_city text,
  ADD COLUMN IF NOT EXISTS delivery_state text;

-- Na Marmitaria, a entrega começa habilitada; o proprietário pode desativar por produto.
UPDATE public.products SET delivery_enabled = true WHERE module = 'marmitaria';
