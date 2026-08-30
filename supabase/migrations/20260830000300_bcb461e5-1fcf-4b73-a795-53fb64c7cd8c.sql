-- Vendas manuais lançadas pelo administrador (faturamento da plataforma)
CREATE TABLE public.platform_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  description text,
  amount numeric NOT NULL CHECK (amount >= 0),
  method text NOT NULL DEFAULT 'pix',
  sold_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_sales TO authenticated;
GRANT ALL ON public.platform_sales TO service_role;
ALTER TABLE public.platform_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage platform sales" ON public.platform_sales
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX platform_sales_sold_at_idx ON public.platform_sales(sold_at DESC);
CREATE TRIGGER platform_sales_updated BEFORE UPDATE ON public.platform_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Vendas manuais do lojista
CREATE TABLE public.manual_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  description text,
  customer_name text,
  amount numeric NOT NULL CHECK (amount >= 0),
  method text NOT NULL DEFAULT 'pix',
  sold_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_sales TO authenticated;
GRANT ALL ON public.manual_sales TO service_role;
ALTER TABLE public.manual_sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners manage own manual sales" ON public.manual_sales
  FOR ALL TO authenticated
  USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()))
  WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));
CREATE INDEX manual_sales_store_sold_at_idx ON public.manual_sales(store_id, sold_at DESC);
CREATE TRIGGER manual_sales_updated BEFORE UPDATE ON public.manual_sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Preço da assinatura PRO (linha única)
CREATE TABLE public.plan_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan text NOT NULL UNIQUE DEFAULT 'pro',
  base_price numeric NOT NULL DEFAULT 9.9 CHECK (base_price >= 0),
  promo_price numeric CHECK (promo_price >= 0),
  promo_label text,
  promo_starts_at timestamptz,
  promo_ends_at timestamptz,
  promo_active boolean NOT NULL DEFAULT false,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plan_pricing TO anon;
GRANT SELECT, INSERT, UPDATE ON public.plan_pricing TO authenticated;
GRANT ALL ON public.plan_pricing TO service_role;
ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads plan pricing" ON public.plan_pricing
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins insert plan pricing" ON public.plan_pricing
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update plan pricing" ON public.plan_pricing
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER plan_pricing_updated BEFORE UPDATE ON public.plan_pricing
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.plan_pricing (plan, base_price) VALUES ('pro', 9.9);

-- Banner da página pública (linha única)
CREATE TABLE public.landing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL UNIQUE DEFAULT true,
  badge text,
  title text,
  subtitle text,
  cta_label text,
  cta_href text,
  image_url text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.landing_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.landing_settings TO authenticated;
GRANT ALL ON public.landing_settings TO service_role;
ALTER TABLE public.landing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads landing settings" ON public.landing_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins insert landing settings" ON public.landing_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update landing settings" ON public.landing_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER landing_settings_updated BEFORE UPDATE ON public.landing_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
INSERT INTO public.landing_settings (singleton) VALUES (true);