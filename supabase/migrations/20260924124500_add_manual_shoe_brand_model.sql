-- Permite ao proprietário informar livremente marcas e modelos que não estejam
-- no catálogo sugerido de Calçados.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shoe_brand_manual text,
  ADD COLUMN IF NOT EXISTS shoe_model_manual text;
