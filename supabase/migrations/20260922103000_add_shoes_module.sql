-- Vitrini: módulo independente de Calçados
-- Marcas e modelos são sugestões editáveis por loja, não produtos da plataforma.

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_module_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_module_check CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados'));

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_module_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_module_check CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados'));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS shoe_brand_id uuid,
  ADD COLUMN IF NOT EXISTS shoe_model_id uuid,
  ADD COLUMN IF NOT EXISTS shoe_authenticity text NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS shoe_gender text,
  ADD COLUMN IF NOT EXISTS shoe_size text,
  ADD COLUMN IF NOT EXISTS shoe_color text;

CREATE TABLE IF NOT EXISTS public.shoe_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_suggested boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS public.shoe_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES public.shoe_brands(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_suggested boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, brand_id, name)
);

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_shoe_authenticity_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_shoe_authenticity_check CHECK (shoe_authenticity IN ('original', 'replica'));
ALTER TABLE public.products
  ADD CONSTRAINT products_shoe_brand_fk FOREIGN KEY (shoe_brand_id) REFERENCES public.shoe_brands(id) ON DELETE SET NULL;
ALTER TABLE public.products
  ADD CONSTRAINT products_shoe_model_fk FOREIGN KEY (shoe_model_id) REFERENCES public.shoe_models(id) ON DELETE SET NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shoe_brands, public.shoe_models TO authenticated;
GRANT SELECT ON public.shoe_brands, public.shoe_models TO anon;
ALTER TABLE public.shoe_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shoe_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owners manage shoe brands" ON public.shoe_brands;
CREATE POLICY "owners manage shoe brands" ON public.shoe_brands FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "public reads active shoe brands" ON public.shoe_brands;
CREATE POLICY "public reads active shoe brands" ON public.shoe_brands FOR SELECT TO anon
  USING (is_active AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active));
DROP POLICY IF EXISTS "owners manage shoe models" ON public.shoe_models;
CREATE POLICY "owners manage shoe models" ON public.shoe_models FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "public reads active shoe models" ON public.shoe_models;
CREATE POLICY "public reads active shoe models" ON public.shoe_models FOR SELECT TO anon
  USING (is_active AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active));

CREATE OR REPLACE FUNCTION public.enforce_module_product_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  current_plan text;
  active_count integer;
BEGIN
  SELECT plan INTO current_plan FROM public.stores WHERE id = NEW.store_id;
  IF current_plan <> 'pro' AND NEW.is_hidden = false AND NEW.module IN ('roupas_esportivas', 'roupas_treino', 'calcados') THEN
    SELECT count(*) INTO active_count FROM public.products
      WHERE store_id = NEW.store_id AND module = NEW.module AND is_hidden = false AND id <> NEW.id;
    IF active_count >= 5 THEN
      RAISE EXCEPTION 'Limite de 5 produtos ativos neste módulo no plano Básica.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_shoes_catalog(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  brand_id uuid;
  brand_name text;
  model_name text;
  brands text[] := ARRAY['Nike','adidas','Mizuno','New Balance','ASICS','Puma','Olympikus','Vans','Fila','Reebok','Converse','Onitsuka Tiger','Skechers','Under Armour','Salomon','Crocs','Jordan','Hoka','Asics Sportstyle','Outras'];
BEGIN
  FOREACH brand_name IN ARRAY brands LOOP
    INSERT INTO public.shoe_brands(store_id, name, is_suggested, position)
      VALUES (target_store_id, brand_name, true, array_position(brands, brand_name))
      ON CONFLICT (store_id, name) DO NOTHING;
  END LOOP;
  INSERT INTO public.categories(store_id, name, module, position)
  SELECT target_store_id, value, 'calcados', ordinality
  FROM unnest(ARRAY['Tênis','Botas','Sapatos','Sandálias','Femininos','Sapatilhas','Botas Femininas','Sociais','Chinelos','Infantil','Esportivos','Personalizados']) WITH ORDINALITY
  ON CONFLICT DO NOTHING;
  FOR brand_name, model_name IN
    SELECT * FROM (VALUES
      ('Nike','Air Force 1'),('Nike','Dunk Low'),('Nike','Air Max 90'),('Nike','Air Max 95'),('Nike','Air Max Dn'),('Nike','Vomero 5'),('Nike','P-6000'),('Nike','V2K Run'),('Nike','Cortez'),('Nike','Pegasus 41'),
      ('adidas','Samba OG'),('adidas','Gazelle'),('adidas','Gazelle Indoor'),('adidas','Campus 00s'),('adidas','Superstar'),('adidas','Handball Spezial'),('adidas','SL 72 OG'),('adidas','adidas Tokyo'),('adidas','Forum Low'),('adidas','Adizero SL'),
      ('Mizuno','Wave Prophecy 1'),('Mizuno','Wave Prophecy LS'),('Mizuno','Wave Rider'),('Mizuno','Wave Sky'),('Mizuno','Wave Creation'),
      ('New Balance','530'),('New Balance','550'),('New Balance','574'),('New Balance','327'),('New Balance','9060'),('New Balance','2002R'),
      ('ASICS','GEL-1130'),('ASICS','GEL-Kayano'),('ASICS','GEL-Nimbus'),('ASICS','GEL-Cumulus'),('ASICS','Novablast'),('ASICS','GT-2000'),
      ('Puma','Speedcat'),('Puma','Speedcat OG'),('Puma','Palermo'),('Puma','Suede'),('Puma','Suede XL'),('Puma','CA Pro'),('Puma','RS-X'),
      ('Olympikus','Corre 4'),('Olympikus','Corre Max'),('Olympikus','Corre Supra'),('Olympikus','Corre Turbo'),('Olympikus','Reverso'),
      ('Vans','Old Skool'),('Vans','Knu Skool'),('Vans','Authentic'),('Vans','Slip-On'),('Vans','Era'),('Vans','Sk8-Hi'),
      ('Fila','Disruptor'),('Fila','Racer Carbon'),('Fila','Float Maxxi'),('Fila','KR5'),('Fila','Recovery'),
      ('Reebok','Club C 85'),('Reebok','Classic Leather'),('Reebok','BB 4000'),('Reebok','Workout Plus'),('Reebok','Nano'),
      ('Converse','Chuck Taylor All Star'),('Converse','Chuck 70'),('Converse','Run Star Hike'),('Converse','Weapon'),('Converse','One Star'),
      ('Onitsuka Tiger','Mexico 66'),('Onitsuka Tiger','Mexico 66 SD'),('Onitsuka Tiger','Tokuten'),('Onitsuka Tiger','Serrano'),('Onitsuka Tiger','Tiger Corsair')
    ) AS catalog(brand, model)
  LOOP
    SELECT id INTO brand_id FROM public.shoe_brands WHERE store_id = target_store_id AND name = brand_name;
    INSERT INTO public.shoe_models(store_id, brand_id, name, is_suggested)
      VALUES (target_store_id, brand_id, model_name, true) ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_shoes_catalog(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seed_shoes_after_store()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN PERFORM public.seed_shoes_catalog(NEW.id); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS stores_seed_shoes ON public.stores;
CREATE TRIGGER stores_seed_shoes AFTER INSERT ON public.stores FOR EACH ROW EXECUTE FUNCTION public.seed_shoes_after_store();
DO $$ DECLARE store_row record; BEGIN FOR store_row IN SELECT id FROM public.stores LOOP PERFORM public.seed_shoes_catalog(store_row.id); END LOOP; END $$;
COMMENT ON COLUMN public.products.module IS 'Módulo explícito: roupas, roupas_esportivas, roupas_treino ou calcados.';
COMMENT ON COLUMN public.products.shoe_authenticity IS 'Declaração do vendedor: original ou replica. O Vitrini não autentica o produto.';

ALTER TABLE public.store_modules DROP CONSTRAINT IF EXISTS store_modules_module_check;
ALTER TABLE public.store_modules ADD CONSTRAINT store_modules_module_check CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados'));

CREATE OR REPLACE FUNCTION public.seed_store_modules(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.store_modules (store_id, module, name, sort_order)
  VALUES
    (target_store_id, 'roupas', 'Roupas', 10),
    (target_store_id, 'roupas_esportivas', 'Roupas Esportivas', 20),
    (target_store_id, 'roupas_treino', 'Roupas de Treino / Academia', 30),
    (target_store_id, 'calcados', 'Calçados', 40)
  ON CONFLICT (store_id, module) DO NOTHING;
  INSERT INTO public.training_settings (store_id) VALUES (target_store_id)
    ON CONFLICT (store_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_store_modules(uuid) TO authenticated, service_role;
DO $$ DECLARE store_row record; BEGIN FOR store_row IN SELECT id FROM public.stores LOOP PERFORM public.seed_store_modules(store_row.id); END LOOP; END $$;
