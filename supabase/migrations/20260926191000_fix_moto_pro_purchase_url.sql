-- Corrige o endereço de compra do Moto PRO no catálogo do Vitrini.
-- A migration é idempotente e pode ser executada no SQL Editor do Lovable.

UPDATE public.digital_products
SET
  url = 'https://moto-pro-control.lovable.app',
  plans = (
    SELECT jsonb_agg(
      CASE
        WHEN jsonb_typeof(plan) = 'object'
          THEN plan || jsonb_build_object('url', 'https://moto-pro-control.lovable.app')
        ELSE plan
      END
    )
    FROM jsonb_array_elements(COALESCE(plans, '[]'::jsonb)) AS item(plan)
  ),
  updated_at = now()
WHERE slug = 'moto-pro';
