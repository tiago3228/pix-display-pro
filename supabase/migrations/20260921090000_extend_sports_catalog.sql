-- Extensão do catálogo esportivo PRO: coleções, lançamentos, ofertas e filtros opcionais.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sports_product_type text,
  ADD COLUMN IF NOT EXISTS sports_audience text,
  ADD COLUMN IF NOT EXISTS sports_is_retro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sports_is_new_release boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sports_is_customized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sports_offer_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sports_original_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS sports_offer_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS sports_offer_percent integer,
  ADD COLUMN IF NOT EXISTS sports_sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.sports_settings
  ADD COLUMN IF NOT EXISTS show_new_releases boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_offers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_collections boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_clubs boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_selections boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_retro boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_customized boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_featured boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS blocks_order jsonb NOT NULL DEFAULT '["featured","new_releases","offers","collections","clubs","selections","retro","customized"]'::jsonb;

CREATE TABLE IF NOT EXISTS public.sports_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  banner_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.sports_collection_products (
  collection_id uuid NOT NULL REFERENCES public.sports_collections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, product_id)
);
CREATE INDEX IF NOT EXISTS sports_collections_store_idx ON public.sports_collections(store_id, sort_order);
CREATE INDEX IF NOT EXISTS sports_collection_products_product_idx ON public.sports_collection_products(product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sports_collections, public.sports_collection_products TO authenticated;
GRANT SELECT ON public.sports_collections, public.sports_collection_products TO anon;
GRANT ALL ON public.sports_collections, public.sports_collection_products TO service_role;
ALTER TABLE public.sports_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sports_collection_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owners manage sports collections on pro" ON public.sports_collections;
CREATE POLICY "owners manage sports collections on pro" ON public.sports_collections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND s.plan = 'pro'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND s.plan = 'pro'));
DROP POLICY IF EXISTS "public reads active sports collections" ON public.sports_collections;
CREATE POLICY "public reads active sports collections" ON public.sports_collections FOR SELECT TO anon
  USING (is_active AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active AND s.plan = 'pro'));
DROP POLICY IF EXISTS "owners manage sports collection products on pro" ON public.sports_collection_products;
CREATE POLICY "owners manage sports collection products on pro" ON public.sports_collection_products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sports_collections c JOIN public.stores s ON s.id = c.store_id WHERE c.id = collection_id AND s.owner_id = auth.uid() AND s.plan = 'pro'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sports_collections c JOIN public.stores s ON s.id = c.store_id WHERE c.id = collection_id AND s.owner_id = auth.uid() AND s.plan = 'pro'));
DROP POLICY IF EXISTS "public reads sports collection products" ON public.sports_collection_products;
CREATE POLICY "public reads sports collection products" ON public.sports_collection_products FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.sports_collections c JOIN public.stores s ON s.id = c.store_id WHERE c.id = collection_id AND c.is_active AND s.is_active AND s.plan = 'pro'));

-- A classificação esportiva é uma extensão do produto existente. O RLS de products já protege os campos.
CREATE OR REPLACE FUNCTION public.sports_collection_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS sports_collections_updated ON public.sports_collections;
CREATE TRIGGER sports_collections_updated BEFORE UPDATE ON public.sports_collections FOR EACH ROW EXECUTE FUNCTION public.sports_collection_updated_at();
COMMENT ON COLUMN public.products.sports_offer_price IS 'Preço promocional opcional da oferta esportiva.';
COMMENT ON COLUMN public.products.sports_is_customized IS 'Reservado para futura personalização de nome e número pelo cliente.';
