
CREATE TYPE public.app_role AS ENUM ('admin','seller');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text,
  whatsapp text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  seller_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Outros',
  whatsapp text NOT NULL DEFAULT '',
  instagram text,
  logo_url text,
  banner_url text,
  primary_color text NOT NULL DEFAULT '#7C3AED',
  welcome_message text NOT NULL DEFAULT '',
  pix_key_type text NOT NULL DEFAULT 'email',
  pix_key text NOT NULL DEFAULT '',
  plan text NOT NULL DEFAULT 'free',
  is_active boolean NOT NULL DEFAULT true,
  onboarding_done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT SELECT ON public.stores TO anon;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages store" ON public.stores FOR ALL TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "public reads active stores" ON public.stores FOR SELECT TO anon USING (is_active = true);
CREATE TRIGGER stores_updated BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT ON public.categories TO anon;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages categories" ON public.categories FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "public reads categories" ON public.categories FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  image_url text,
  price numeric(10,2) NOT NULL DEFAULT 0,
  sku text,
  stock int NOT NULL DEFAULT 0,
  track_stock boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  is_hidden boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  has_variants boolean NOT NULL DEFAULT false,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT ON public.products TO anon;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages products" ON public.products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "public reads visible products" ON public.products FOR SELECT TO anon
  USING (is_hidden = false AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active));
CREATE TRIGGER products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.product_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  position int NOT NULL DEFAULT 0
);
CREATE TABLE public.product_option_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  option_id uuid NOT NULL REFERENCES public.product_options(id) ON DELETE CASCADE,
  value text NOT NULL,
  position int NOT NULL DEFAULT 0
);
CREATE TABLE public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  label text NOT NULL,
  price numeric(10,2),
  stock int NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_options, public.product_option_values, public.product_variants TO authenticated;
GRANT SELECT ON public.product_options, public.product_option_values, public.product_variants TO anon;
GRANT ALL ON public.product_options, public.product_option_values, public.product_variants TO service_role;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages options" ON public.product_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND s.owner_id = auth.uid()));
CREATE POLICY "public reads options" ON public.product_options FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND p.is_hidden = false AND s.is_active));
CREATE POLICY "owner manages option values" ON public.product_option_values FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_options o JOIN public.products p ON p.id = o.product_id JOIN public.stores s ON s.id = p.store_id WHERE o.id = option_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_options o JOIN public.products p ON p.id = o.product_id JOIN public.stores s ON s.id = p.store_id WHERE o.id = option_id AND s.owner_id = auth.uid()));
CREATE POLICY "public reads option values" ON public.product_option_values FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.product_options o JOIN public.products p ON p.id = o.product_id JOIN public.stores s ON s.id = p.store_id WHERE o.id = option_id AND p.is_hidden = false AND s.is_active));
CREATE POLICY "owner manages variants" ON public.product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND s.owner_id = auth.uid()));
CREATE POLICY "public reads variants" ON public.product_variants FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND p.is_hidden = false AND s.is_active));

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  orders_count int NOT NULL DEFAULT 0,
  total_spent numeric(10,2) NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, whatsapp)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages customers" ON public.customers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE SEQUENCE public.order_number_seq START 1000;
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  number bigint NOT NULL DEFAULT nextval('public.order_number_seq'),
  customer_name text NOT NULL DEFAULT '',
  customer_whatsapp text NOT NULL DEFAULT '',
  note text,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'novo',
  payment_declared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE ON SEQUENCE public.order_number_seq TO service_role, authenticated;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages orders" ON public.orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  variant_label text,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  subtotal numeric(10,2) NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages order items" ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o JOIN public.stores s ON s.id = o.store_id WHERE o.id = order_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o JOIN public.stores s ON s.id = o.store_id WHERE o.id = order_id AND s.owner_id = auth.uid()));

CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free',
  status text NOT NULL DEFAULT 'active',
  provider text,
  provider_ref text,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads subscription" ON public.subscriptions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE TABLE public.store_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_events TO authenticated;
GRANT ALL ON public.store_events TO service_role;
ALTER TABLE public.store_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads events" ON public.store_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE INDEX ON public.products (store_id);
CREATE INDEX ON public.orders (store_id, created_at DESC);
CREATE INDEX ON public.order_items (order_id);
