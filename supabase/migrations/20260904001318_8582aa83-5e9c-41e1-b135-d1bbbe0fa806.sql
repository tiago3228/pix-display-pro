CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX product_images_product_idx ON public.product_images(product_id, position);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_images TO authenticated;
GRANT SELECT ON public.product_images TO anon;
GRANT ALL ON public.product_images TO service_role;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages product images" ON public.product_images FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = product_images.store_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = product_images.store_id AND s.owner_id = auth.uid()));
CREATE POLICY "public reads product images" ON public.product_images FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_images.product_id AND p.is_hidden = false AND s.is_active));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS original_price numeric,
  ADD COLUMN IF NOT EXISTS created_via text NOT NULL DEFAULT 'manual';

CREATE TABLE public.ai_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan text NOT NULL DEFAULT 'free',
  pages integer NOT NULL DEFAULT 0,
  products_found integer NOT NULL DEFAULT 0,
  products_created integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'processing',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_import_jobs_store_idx ON public.ai_import_jobs(store_id, created_at DESC);
GRANT SELECT ON public.ai_import_jobs TO authenticated;
GRANT ALL ON public.ai_import_jobs TO service_role;
ALTER TABLE public.ai_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads ai imports" ON public.ai_import_jobs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = ai_import_jobs.store_id AND s.owner_id = auth.uid()));
CREATE TRIGGER ai_import_jobs_updated BEFORE UPDATE ON public.ai_import_jobs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.ai_page_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  job_id uuid REFERENCES public.ai_import_jobs(id) ON DELETE SET NULL,
  period text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_page_usage_store_period_idx ON public.ai_page_usage(store_id, period);
GRANT SELECT ON public.ai_page_usage TO authenticated;
GRANT ALL ON public.ai_page_usage TO service_role;
ALTER TABLE public.ai_page_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads ai usage" ON public.ai_page_usage FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = ai_page_usage.store_id AND s.owner_id = auth.uid()));