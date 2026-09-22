-- Configurações específicas da Loja Premium de Roupas.
CREATE TABLE IF NOT EXISTS public.clothing_store_settings (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  sell_clothing boolean NOT NULL DEFAULT true,
  sell_accessories boolean NOT NULL DEFAULT false,
  sell_shoes boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.clothing_store_settings TO authenticated;
ALTER TABLE public.clothing_store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owners manage clothing settings" ON public.clothing_store_settings;
CREATE POLICY "owners manage clothing settings" ON public.clothing_store_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

INSERT INTO public.clothing_store_settings (store_id)
SELECT id FROM public.stores
ON CONFLICT (store_id) DO NOTHING;

INSERT INTO public.premium_store_modules (name, slug, description, icon, status, sort_order, active, plan_required, route, featured, promotional_text)
VALUES ('Roupas', 'roupas', 'Moda feminina, masculina, infantil, casual e social', '👕', 'available', 5, true, 'basic', '/roupas', true, 'Monte seu catálogo de moda')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon, route = EXCLUDED.route, active = EXCLUDED.active, status = EXCLUDED.status, sort_order = EXCLUDED.sort_order, featured = EXCLUDED.featured, promotional_text = EXCLUDED.promotional_text;
