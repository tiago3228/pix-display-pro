-- Vitrini: encomendas opcionais por produto, sem alterar o fluxo de pedidos.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS order_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_unit_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS order_min_quantity integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS order_max_quantity integer,
  ADD COLUMN IF NOT EXISTS order_lead_time text,
  ADD COLUMN IF NOT EXISTS order_notes text,
  ADD COLUMN IF NOT EXISTS order_progressive_pricing boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.product_order_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  min_quantity integer NOT NULL CHECK (min_quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, min_quantity)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_order_tiers TO authenticated;
GRANT SELECT ON public.product_order_tiers TO anon;
GRANT ALL ON public.product_order_tiers TO service_role;
ALTER TABLE public.product_order_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner manages product order tiers" ON public.product_order_tiers;
CREATE POLICY "owner manages product order tiers" ON public.product_order_tiers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "public reads order tiers" ON public.product_order_tiers;
CREATE POLICY "public reads order tiers" ON public.product_order_tiers FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND p.is_hidden = false AND s.is_active AND p.order_enabled));

CREATE SEQUENCE IF NOT EXISTS public.encomenda_number_seq START 1000;
CREATE TABLE IF NOT EXISTS public.encomendas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  number bigint NOT NULL DEFAULT nextval('public.encomenda_number_seq'),
  customer_name text NOT NULL DEFAULT '',
  customer_whatsapp text NOT NULL DEFAULT '',
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price > 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  regular_unit_price numeric(10,2) NOT NULL CHECK (regular_unit_price > 0),
  discount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  customer_note text,
  owner_note text,
  lead_time text,
  status text NOT NULL DEFAULT 'aguardando_confirmacao' CHECK (status IN ('aguardando_confirmacao','confirmada','em_producao','pronta','entregue','cancelada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.encomendas TO authenticated;
GRANT ALL ON public.encomendas TO service_role;
ALTER TABLE public.encomendas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owner manages encomendas" ON public.encomendas;
CREATE POLICY "owner manages encomendas" ON public.encomendas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
DROP TRIGGER IF EXISTS encomendas_updated ON public.encomendas;
CREATE TRIGGER encomendas_updated BEFORE UPDATE ON public.encomendas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX IF NOT EXISTS product_order_tiers_product_idx ON public.product_order_tiers(product_id, min_quantity);
CREATE INDEX IF NOT EXISTS encomendas_store_created_idx ON public.encomendas(store_id, created_at DESC);

UPDATE public.products SET order_min_quantity = 1 WHERE order_min_quantity IS NULL OR order_min_quantity < 1;
