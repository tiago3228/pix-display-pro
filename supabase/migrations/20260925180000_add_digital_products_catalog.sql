-- Catálogo global público de softwares e produtos digitais da plataforma.
-- O conteúdo é administrado pelo papel global admin, não por lojistas individuais.

CREATE TABLE IF NOT EXISTS public.digital_product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.digital_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  product_type text NOT NULL DEFAULT 'software'
    CHECK (product_type IN ('software', 'app', 'saas', 'course', 'service', 'digital_product', 'tool', 'other')),
  custom_type_label text,
  category_id uuid REFERENCES public.digital_product_categories(id) ON DELETE SET NULL,
  short_description text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  main_image_path text,
  logo_image_path text,
  gallery_image_paths text[] NOT NULL DEFAULT '{}',
  banner_image_path text,
  share_image_path text,
  url text NOT NULL CHECK (url ~* '^https?://'),
  contract_url text CHECK (contract_url IS NULL OR contract_url ~* '^https?://'),
  demo_url text CHECK (demo_url IS NULL OR demo_url ~* '^https?://'),
  support_url text CHECK (support_url IS NULL OR support_url ~* '^https?://'),
  cta_label text NOT NULL DEFAULT 'Conhecer software',
  contract_cta_label text NOT NULL DEFAULT 'Assinar',
  demo_cta_label text NOT NULL DEFAULT 'Ver demonstração',
  support_cta_label text NOT NULL DEFAULT 'Suporte',
  banner_title text,
  banner_subtitle text,
  primary_color text NOT NULL DEFAULT '#2563EB' CHECK (primary_color ~* '^#[0-9a-f]{6}$'),
  secondary_color text NOT NULL DEFAULT '#0F172A' CHECK (secondary_color ~* '^#[0-9a-f]{6}$'),
  background_color text NOT NULL DEFAULT '#FFFFFF' CHECK (background_color ~* '^#[0-9a-f]{6}$'),
  features text[] NOT NULL DEFAULT '{}',
  benefits text[] NOT NULL DEFAULT '{}',
  plans jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(plans) = 'array'),
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(faqs) = 'array'),
  video_url text CHECK (video_url IS NULL OR video_url ~* '^https?://'),
  seo_title text,
  seo_description text,
  card_clickable boolean NOT NULL DEFAULT true,
  open_new_tab boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  view_count bigint NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  click_count bigint NOT NULL DEFAULT 0 CHECK (click_count >= 0),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS digital_products_public_order_idx
  ON public.digital_products (is_active, is_featured DESC, sort_order, name);
CREATE INDEX IF NOT EXISTS digital_products_category_idx
  ON public.digital_products (category_id, is_active, sort_order);

GRANT SELECT ON public.digital_product_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.digital_product_categories TO authenticated;
GRANT SELECT ON public.digital_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.digital_products TO authenticated;
GRANT ALL ON public.digital_product_categories TO service_role;
GRANT ALL ON public.digital_products TO service_role;

ALTER TABLE public.digital_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public reads active digital product categories" ON public.digital_product_categories;
CREATE POLICY "public reads active digital product categories"
  ON public.digital_product_categories FOR SELECT TO anon, authenticated
  USING (is_active);
DROP POLICY IF EXISTS "admins manage digital product categories" ON public.digital_product_categories;
CREATE POLICY "admins manage digital product categories"
  ON public.digital_product_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "public reads active digital products" ON public.digital_products;
CREATE POLICY "public reads active digital products"
  ON public.digital_products FOR SELECT TO anon, authenticated
  USING (is_active);
DROP POLICY IF EXISTS "admins manage digital products" ON public.digital_products;
CREATE POLICY "admins manage digital products"
  ON public.digital_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS digital_product_categories_updated ON public.digital_product_categories;
CREATE TRIGGER digital_product_categories_updated
  BEFORE UPDATE ON public.digital_product_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS digital_products_updated ON public.digital_products;
CREATE TRIGGER digital_products_updated
  BEFORE UPDATE ON public.digital_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.digital_product_categories (name, slug, sort_order)
VALUES
  ('SaaS', 'saas', 10),
  ('Gestão', 'gestao', 20),
  ('Vendas', 'vendas', 30),
  ('Finanças', 'financas', 40),
  ('Marketing', 'marketing', 50),
  ('E-commerce', 'e-commerce', 60),
  ('Produtividade', 'produtividade', 70),
  ('Outros', 'outros', 80)
ON CONFLICT (slug) DO NOTHING;

-- Bucket separado para imagens promocionais do catálogo; as imagens das lojas continuam privadas.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'digital-product-assets',
  'digital-product-assets',
  true,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "public reads digital product assets" ON storage.objects;
CREATE POLICY "public reads digital product assets"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'digital-product-assets');

DROP POLICY IF EXISTS "admins manage digital product assets" ON storage.objects;
CREATE POLICY "admins manage digital product assets"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'digital-product-assets'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'digital-product-assets'
    AND public.has_role(auth.uid(), 'admin')
  );
