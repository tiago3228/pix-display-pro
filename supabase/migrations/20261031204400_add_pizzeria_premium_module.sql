-- Loja Premium Pizzaria: catálogo configurável e montagem de pizzas.
-- Execute esta migration no Supabase SQL Editor antes de ativar o módulo.

ALTER TABLE public.store_modules
  DROP CONSTRAINT IF EXISTS store_modules_module_check;
ALTER TABLE public.store_modules
  ADD CONSTRAINT store_modules_module_check
  CHECK (module IN ('roupas','roupas_esportivas','roupas_treino','calcados','cafeteria','marmitaria','joias','pizzaria'));

INSERT INTO public.premium_store_modules
  (name, slug, description, icon, status, sort_order, active, plan_required, route, featured, promotional_text)
VALUES
  ('Pizzaria', 'pizzaria', 'Monte pizzas de 1, 2 ou 4 sabores, escolha bordas, bebidas e molhos', '🍕', 'available', 80, true, 'pro', '/pizzaria', true, 'Sua pizzaria online com montagem de sabores')
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description, icon=EXCLUDED.icon,
  status=EXCLUDED.status, active=EXCLUDED.active, plan_required=EXCLUDED.plan_required,
  route=EXCLUDED.route, sort_order=EXCLUDED.sort_order, featured=EXCLUDED.featured,
  promotional_text=EXCLUDED.promotional_text;

CREATE TABLE IF NOT EXISTS public.pizzeria_settings (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  display_name text,
  address text NOT NULL DEFAULT '',
  whatsapp text,
  order_instructions text NOT NULL DEFAULT 'Pedido realizado pelo cardápio online.',
  allow_half_flavors boolean NOT NULL DEFAULT true,
  allow_quarter_flavors boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pizzeria_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  diameter_cm integer,
  max_flavors integer NOT NULL DEFAULT 1 CHECK (max_flavors IN (1,2,4)),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS public.pizzeria_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'Tradicionais',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (store_id, name)
);

CREATE TABLE IF NOT EXISTS public.pizzeria_flavor_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  size_id uuid NOT NULL REFERENCES public.pizzeria_sizes(id) ON DELETE CASCADE,
  flavor_id uuid NOT NULL REFERENCES public.pizzeria_flavors(id) ON DELETE CASCADE,
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  UNIQUE (size_id, flavor_id)
);

CREATE TABLE IF NOT EXISTS public.pizzeria_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  group_key text NOT NULL CHECK (group_key IN ('borda','bebida','molho','adicional')),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS pizzeria_sizes_store_idx ON public.pizzeria_sizes(store_id, sort_order);
CREATE INDEX IF NOT EXISTS pizzeria_flavors_store_idx ON public.pizzeria_flavors(store_id, sort_order);
CREATE INDEX IF NOT EXISTS pizzeria_addons_store_idx ON public.pizzeria_addons(store_id, group_key, sort_order);
CREATE INDEX IF NOT EXISTS pizzeria_flavor_prices_store_idx ON public.pizzeria_flavor_prices(store_id, size_id);

ALTER TABLE public.pizzeria_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizzeria_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizzeria_flavors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizzeria_flavor_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pizzeria_addons ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pizzeria_settings TO authenticated;
GRANT SELECT ON public.pizzeria_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pizzeria_sizes TO authenticated;
GRANT SELECT ON public.pizzeria_sizes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pizzeria_flavors TO authenticated;
GRANT SELECT ON public.pizzeria_flavors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pizzeria_flavor_prices TO authenticated;
GRANT SELECT ON public.pizzeria_flavor_prices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pizzeria_addons TO authenticated;
GRANT SELECT ON public.pizzeria_addons TO anon;
GRANT ALL ON public.pizzeria_settings, public.pizzeria_sizes, public.pizzeria_flavors, public.pizzeria_flavor_prices, public.pizzeria_addons TO service_role;

DROP POLICY IF EXISTS "owner manages pizzeria settings" ON public.pizzeria_settings;
CREATE POLICY "owner manages pizzeria settings" ON public.pizzeria_settings FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "public reads pizzeria settings" ON public.pizzeria_settings;
CREATE POLICY "public reads pizzeria settings" ON public.pizzeria_settings FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.stores s JOIN public.store_modules sm ON sm.store_id=s.id WHERE s.id=store_id AND s.is_active AND sm.module='pizzaria' AND sm.is_active AND public.store_has_pro_access(s.id)));

DROP POLICY IF EXISTS "owner manages pizzeria sizes" ON public.pizzeria_sizes;
CREATE POLICY "owner manages pizzeria sizes" ON public.pizzeria_sizes FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "public reads pizzeria sizes" ON public.pizzeria_sizes;
CREATE POLICY "public reads pizzeria sizes" ON public.pizzeria_sizes FOR SELECT TO anon
USING (is_active AND EXISTS (SELECT 1 FROM public.stores s JOIN public.store_modules sm ON sm.store_id=s.id WHERE s.id=store_id AND s.is_active AND sm.module='pizzaria' AND sm.is_active AND public.store_has_pro_access(s.id)));

DROP POLICY IF EXISTS "owner manages pizzeria flavors" ON public.pizzeria_flavors;
CREATE POLICY "owner manages pizzeria flavors" ON public.pizzeria_flavors FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "public reads pizzeria flavors" ON public.pizzeria_flavors;
CREATE POLICY "public reads pizzeria flavors" ON public.pizzeria_flavors FOR SELECT TO anon
USING (is_active AND EXISTS (SELECT 1 FROM public.stores s JOIN public.store_modules sm ON sm.store_id=s.id WHERE s.id=store_id AND s.is_active AND sm.module='pizzaria' AND sm.is_active AND public.store_has_pro_access(s.id)));

DROP POLICY IF EXISTS "owner manages pizzeria flavor prices" ON public.pizzeria_flavor_prices;
CREATE POLICY "owner manages pizzeria flavor prices" ON public.pizzeria_flavor_prices FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "public reads pizzeria flavor prices" ON public.pizzeria_flavor_prices;
CREATE POLICY "public reads pizzeria flavor prices" ON public.pizzeria_flavor_prices FOR SELECT TO anon
USING (EXISTS (SELECT 1 FROM public.stores s JOIN public.store_modules sm ON sm.store_id=s.id WHERE s.id=store_id AND s.is_active AND sm.module='pizzaria' AND sm.is_active AND public.store_has_pro_access(s.id)));

DROP POLICY IF EXISTS "owner manages pizzeria addons" ON public.pizzeria_addons;
CREATE POLICY "owner manages pizzeria addons" ON public.pizzeria_addons FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id=store_id AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "public reads pizzeria addons" ON public.pizzeria_addons;
CREATE POLICY "public reads pizzeria addons" ON public.pizzeria_addons FOR SELECT TO anon
USING (is_active AND EXISTS (SELECT 1 FROM public.stores s JOIN public.store_modules sm ON sm.store_id=s.id WHERE s.id=store_id AND s.is_active AND sm.module='pizzaria' AND sm.is_active AND public.store_has_pro_access(s.id)));

CREATE OR REPLACE FUNCTION public.seed_pizzeria_catalog(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE size_baby uuid; size_small uuid; size_medium uuid; size_large uuid; size_giant uuid;
BEGIN
  INSERT INTO public.pizzeria_settings(store_id, display_name)
  SELECT target_store_id, s.name FROM public.stores s WHERE s.id=target_store_id
  ON CONFLICT (store_id) DO NOTHING;

  INSERT INTO public.pizzeria_sizes(store_id,name,diameter_cm,max_flavors,sort_order)
  VALUES
    (target_store_id,'Brotinho',20,1,10),
    (target_store_id,'Pequena',25,1,20),
    (target_store_id,'Média',30,2,30),
    (target_store_id,'Grande',35,2,40),
    (target_store_id,'Gigante',40,4,50)
  ON CONFLICT (store_id,name) DO NOTHING;

  SELECT id INTO size_baby FROM public.pizzeria_sizes WHERE store_id=target_store_id AND name='Brotinho';
  SELECT id INTO size_small FROM public.pizzeria_sizes WHERE store_id=target_store_id AND name='Pequena';
  SELECT id INTO size_medium FROM public.pizzeria_sizes WHERE store_id=target_store_id AND name='Média';
  SELECT id INTO size_large FROM public.pizzeria_sizes WHERE store_id=target_store_id AND name='Grande';
  SELECT id INTO size_giant FROM public.pizzeria_sizes WHERE store_id=target_store_id AND name='Gigante';

  INSERT INTO public.pizzeria_flavors(store_id,name,description,category,sort_order)
  SELECT target_store_id, f.name, f.description, f.category, f.position
  FROM (VALUES
    ('Muçarela','Molho de tomate, muçarela e orégano','Tradicionais',10),
    ('Calabresa','Calabresa fatiada, cebola e muçarela','Tradicionais',20),
    ('Marguerita','Muçarela, tomate, manjericão e parmesão','Tradicionais',30),
    ('Portuguesa','Presunto, ovos, cebola, ervilha e muçarela','Tradicionais',40),
    ('Frango com Catupiry','Frango desfiado e requeijão cremoso','Tradicionais',50),
    ('Quatro Queijos','Muçarela, provolone, parmesão e gorgonzola','Especiais',60),
    ('Bacon','Bacon crocante e muçarela','Tradicionais',70),
    ('Pepperoni','Pepperoni e muçarela','Especiais',80),
    ('Napolitana','Muçarela, tomate, parmesão e alho','Tradicionais',90),
    ('Milho com Bacon','Milho, bacon e muçarela','Tradicionais',100),
    ('Atum','Atum, cebola e muçarela','Tradicionais',110),
    ('Lombo Canadense','Lombo canadense e muçarela','Especiais',120),
    ('Carne Seca','Carne seca desfiada e cebola','Especiais',130),
    ('Baiana','Calabresa moída, pimenta e cebola','Especiais',140),
    ('Moda da Casa','Combinação especial da casa','Especiais',150),
    ('Alho e Óleo','Alho dourado, azeite e muçarela','Tradicionais',160),
    ('Palmito','Palmito, ervilha e muçarela','Tradicionais',170),
    ('Brócolis','Brócolis, bacon e muçarela','Tradicionais',180),
    ('Rúcula com Tomate Seco','Rúcula e tomate seco','Especiais',190),
    ('Filé com Cheddar','Filé em tiras e cheddar','Especiais',200),
    ('Camarão','Camarão temperado e requeijão','Especiais',210),
    ('Strogonoff de Frango','Frango ao molho cremoso','Especiais',220),
    ('Cheddar com Bacon','Cheddar cremoso e bacon','Especiais',230),
    ('Dois Queijos','Muçarela e requeijão','Tradicionais',240),
    ('Banana com Canela','Banana, açúcar e canela','Doces',250),
    ('Chocolate','Chocolate ao leite','Doces',260),
    ('Chocolate com Morango','Chocolate e morangos','Doces',270),
    ('Romeu e Julieta','Goiabada e queijo','Doces',280),
    ('Prestígio','Chocolate e coco','Doces',290),
    ('Sensação','Chocolate e morango','Doces',300)
  ) AS f(name,description,category,position)
  ON CONFLICT (store_id,name) DO NOTHING;

  INSERT INTO public.pizzeria_flavor_prices(store_id,size_id,flavor_id,price)
  SELECT target_store_id, sz.id, fl.id,
    CASE sz.name WHEN 'Brotinho' THEN 22 WHEN 'Pequena' THEN 30 WHEN 'Média' THEN 39 WHEN 'Grande' THEN 49 ELSE 59 END
  FROM public.pizzeria_sizes sz CROSS JOIN public.pizzeria_flavors fl
  WHERE sz.store_id=target_store_id AND fl.store_id=target_store_id
  ON CONFLICT (size_id,flavor_id) DO NOTHING;

  INSERT INTO public.pizzeria_addons(store_id,group_key,name,description,price,sort_order)
  SELECT target_store_id, a.group_key, a.name, a.description, a.price, a.position
  FROM (VALUES
    ('borda','Catupiry','Borda recheada',10,10),
    ('borda','Cheddar','Borda recheada',10,20),
    ('borda','Chocolate','Borda doce',12,30),
    ('borda','Cream cheese','Borda recheada',12,40),
    ('borda','Sem borda','',0,50),
    ('bebida','Coca-Cola 2L','Refrigerante',14,10),
    ('bebida','Guaraná 2L','Refrigerante',12,20),
    ('bebida','Coca-Cola lata 350ml','Refrigerante',6,30),
    ('bebida','Guaraná lata 350ml','Refrigerante',5,40),
    ('bebida','Água mineral 500ml','Sem gás',3,50),
    ('bebida','Suco de laranja 1L','Suco',12,60),
    ('molho','Ketchup','Sachê',0,10),
    ('molho','Maionese','Sachê',0,20),
    ('molho','Barbecue','Molho especial',3,30),
    ('molho','Alho','Molho especial',3,40),
    ('molho','Pimenta','Molho especial',2,50),
    ('adicional','Bacon extra','Adicional de cobertura',5,10),
    ('adicional','Catupiry extra','Adicional de cobertura',5,20),
    ('adicional','Cheddar extra','Adicional de cobertura',5,30)
  ) AS a(group_key,name,description,price,position)
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.pizzeria_addons x
    WHERE x.store_id=target_store_id
      AND x.group_key=a.group_key
      AND x.name=a.name
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_pizzeria_catalog(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seed_pizzeria_after_activation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.module='pizzaria' AND NEW.is_active THEN
    PERFORM public.seed_pizzeria_catalog(NEW.store_id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS seed_pizzeria_after_activation ON public.store_modules;
CREATE TRIGGER seed_pizzeria_after_activation AFTER INSERT OR UPDATE ON public.store_modules
FOR EACH ROW EXECUTE FUNCTION public.seed_pizzeria_after_activation();

INSERT INTO public.store_modules(store_id,module,name,is_active,is_primary,sort_order)
SELECT s.id,'pizzaria','Pizzaria',false,false,80 FROM public.stores s
ON CONFLICT (store_id,module) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_premium_module_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.module IN ('roupas_esportivas','roupas_treino','calcados','cafeteria','marmitaria','joias','pizzaria')
    AND NEW.is_active=true AND NOT public.store_has_pro_access(NEW.store_id) THEN
    RAISE EXCEPTION 'Lojas Premium são exclusivas do plano PRO.' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_premium_module_plan ON public.store_modules;
CREATE TRIGGER enforce_premium_module_plan
  BEFORE INSERT OR UPDATE OF is_active ON public.store_modules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_module_plan();

CREATE OR REPLACE FUNCTION public.default_store_module(store_category text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT CASE
    WHEN lower(coalesce(store_category,'')) LIKE '%pizzar%' THEN 'pizzaria'
    WHEN lower(coalesce(store_category,'')) LIKE '%joia%' OR lower(coalesce(store_category,'')) LIKE '%semijoia%'
      OR lower(coalesce(store_category,'')) LIKE '%bijuteria%' OR lower(coalesce(store_category,'')) LIKE '%acessório%'
      OR lower(coalesce(store_category,'')) LIKE '%acessorio%' THEN 'joias'
    WHEN lower(coalesce(store_category,'')) LIKE '%marmit%' THEN 'marmitaria'
    WHEN lower(coalesce(store_category,'')) LIKE '%cafeteria%' OR lower(coalesce(store_category,'')) LIKE '%aliment%'
      OR lower(coalesce(store_category,'')) LIKE '%doces%' OR lower(coalesce(store_category,'')) LIKE '%padaria%'
      OR lower(coalesce(store_category,'')) LIKE '%confeitaria%' THEN 'cafeteria'
    WHEN lower(coalesce(store_category,'')) LIKE '%calçado%' OR lower(coalesce(store_category,'')) LIKE '%calcado%' THEN 'calcados'
    WHEN lower(coalesce(store_category,'')) LIKE '%treino%' OR lower(coalesce(store_category,'')) LIKE '%academia%' THEN 'roupas_treino'
    WHEN lower(coalesce(store_category,'')) LIKE '%esport%' THEN 'roupas_esportivas'
    ELSE 'roupas'
  END;
$$;

-- Inclui o módulo nas lojas criadas daqui em diante sem ativá-lo automaticamente.
CREATE OR REPLACE FUNCTION public.seed_store_modules(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.store_modules(store_id,module,name,is_active,sort_order)
  SELECT target_store_id, seed.module, seed.name,
    (seed.module='roupas' OR
      (seed.module='joias' AND public.default_store_module(store_row.category)='joias' AND public.store_has_pro_access(target_store_id)) OR
      (seed.module NOT IN ('joias','roupas') AND public.store_has_pro_access(target_store_id))),
    seed.sort_order
  FROM public.stores store_row
  CROSS JOIN (VALUES
    ('roupas','Roupas',10),('roupas_esportivas','Roupas Esportivas',20),
    ('roupas_treino','Roupas de Treino',30),('calcados','Calçados',40),
    ('cafeteria','Cafeteria',50),('marmitaria','Marmitaria',60),
    ('joias','Joias e Semijoias',70),('pizzaria','Pizzaria',80)
  ) seed(module,name,sort_order)
  WHERE store_row.id=target_store_id
  ON CONFLICT(store_id,module) DO NOTHING;
  INSERT INTO public.training_settings(store_id) VALUES(target_store_id) ON CONFLICT(store_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_store_modules(uuid) TO authenticated, service_role;

-- Se a pizzaria já for o nicho principal e houver acesso PRO, ativa o módulo e semeia o catálogo.
UPDATE public.store_modules sm SET is_active=true
FROM public.stores s
WHERE sm.store_id=s.id AND sm.module='pizzaria'
  AND public.default_store_module(s.category)='pizzaria'
  AND public.store_has_pro_access(s.id);

COMMENT ON TABLE public.pizzeria_flavors IS 'Sabores cadastrados pela pizzaria; o seed inicial é editável pelo proprietário.';
COMMENT ON TABLE public.pizzeria_flavor_prices IS 'Preço de cada sabor por tamanho; o maior preço entre os sabores selecionados define o preço da pizza.';
COMMENT ON TABLE public.pizzeria_addons IS 'Bordas, bebidas, molhos e adicionais configuráveis da pizzaria.';
