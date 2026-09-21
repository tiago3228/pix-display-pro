-- Vitrini PRO: ecossistema configurável de roupas esportivas.
-- Os dados permanecem após downgrade; as políticas de escrita exigem plano PRO.

CREATE TABLE IF NOT EXISTS public.sports_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.sports_nodes(id) ON DELETE SET NULL,
  node_type text NOT NULL DEFAULT 'category' CHECK (node_type IN ('sport','category','subcategory','country','championship','club','selection','custom')),
  name text NOT NULL,
  short_name text,
  slug text,
  description text NOT NULL DEFAULT '',
  logo_url text,
  banner_url text,
  primary_color text,
  secondary_color text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, id, parent_id)
);

CREATE INDEX IF NOT EXISTS sports_nodes_store_idx ON public.sports_nodes(store_id, parent_id, sort_order);
CREATE INDEX IF NOT EXISTS sports_nodes_type_idx ON public.sports_nodes(store_id, node_type, is_active);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sports_nodes TO authenticated;
GRANT SELECT ON public.sports_nodes TO anon;
GRANT ALL ON public.sports_nodes TO service_role;
ALTER TABLE public.sports_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners manage sports nodes on pro" ON public.sports_nodes;
CREATE POLICY "owners manage sports nodes on pro" ON public.sports_nodes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND s.plan = 'pro'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND s.plan = 'pro'));
DROP POLICY IF EXISTS "public reads active sports nodes" ON public.sports_nodes;
CREATE POLICY "public reads active sports nodes" ON public.sports_nodes FOR SELECT TO anon
  USING (is_active AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active AND s.plan = 'pro'));

CREATE TABLE IF NOT EXISTS public.sports_settings (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  name text NOT NULL DEFAULT 'Roupas Esportivas',
  description text NOT NULL DEFAULT 'Futebol, clubes, seleções e muito mais.',
  primary_node_id uuid REFERENCES public.sports_nodes(id) ON DELETE SET NULL,
  logo_url text,
  banner_url text,
  primary_color text NOT NULL DEFAULT '#14532d',
  secondary_color text NOT NULL DEFAULT '#facc15',
  background_color text NOT NULL DEFAULT '#f7fee7',
  text_color text NOT NULL DEFAULT '#172015',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sports_settings TO authenticated;
GRANT SELECT ON public.sports_settings TO anon;
GRANT ALL ON public.sports_settings TO service_role;
ALTER TABLE public.sports_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners manage sports settings on pro" ON public.sports_settings;
CREATE POLICY "owners manage sports settings on pro" ON public.sports_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND s.plan = 'pro'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND s.plan = 'pro'));
DROP POLICY IF EXISTS "public reads active sports settings" ON public.sports_settings;
CREATE POLICY "public reads active sports settings" ON public.sports_settings FOR SELECT TO anon
  USING (enabled AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active AND s.plan = 'pro'));

CREATE TABLE IF NOT EXISTS public.product_sports (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  node_id uuid NOT NULL REFERENCES public.sports_nodes(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, node_id)
);
CREATE INDEX IF NOT EXISTS product_sports_node_idx ON public.product_sports(node_id, product_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_sports TO authenticated;
GRANT SELECT ON public.product_sports TO anon;
GRANT ALL ON public.product_sports TO service_role;
ALTER TABLE public.product_sports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners manage product sports on pro" ON public.product_sports;
CREATE POLICY "owners manage product sports on pro" ON public.product_sports FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND s.owner_id = auth.uid() AND s.plan = 'pro'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND s.owner_id = auth.uid() AND s.plan = 'pro'
  ));
DROP POLICY IF EXISTS "public reads visible product sports" ON public.product_sports;
CREATE POLICY "public reads visible product sports" ON public.product_sports FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND p.is_hidden = false AND s.is_active AND s.plan = 'pro'
  ));

CREATE OR REPLACE FUNCTION public.seed_sports_for_store(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  football_id uuid;
  national_id uuid;
  international_id uuid;
  selections_id uuid;
BEGIN
  INSERT INTO public.sports_settings (store_id) VALUES (target_store_id)
    ON CONFLICT (store_id) DO NOTHING;

  SELECT id INTO football_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id IS NULL AND name = 'Futebol' LIMIT 1;
  IF football_id IS NULL THEN
    INSERT INTO public.sports_nodes (store_id, node_type, name, short_name, sort_order)
      VALUES (target_store_id, 'sport', 'Futebol', 'Futebol', 10) RETURNING id INTO football_id;

    INSERT INTO public.sports_nodes (store_id, parent_id, node_type, name, sort_order)
      VALUES
        (target_store_id, football_id, 'category', 'Nacional', 10),
        (target_store_id, football_id, 'category', 'Internacional', 20),
        (target_store_id, football_id, 'selection', 'Seleções', 30),
        (target_store_id, football_id, 'custom', 'Personalizados', 40);
  END IF;

  SELECT id INTO national_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id = football_id AND name = 'Nacional' LIMIT 1;
  IF national_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sports_nodes WHERE store_id = target_store_id AND parent_id = national_id
  ) THEN
    INSERT INTO public.sports_nodes (store_id, parent_id, node_type, name, sort_order)
      VALUES
        (target_store_id, national_id, 'championship', 'Série A', 10),
        (target_store_id, national_id, 'championship', 'Série B', 20),
        (target_store_id, national_id, 'championship', 'Outros', 30);
  END IF;

  SELECT id INTO international_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id = football_id AND name = 'Internacional' LIMIT 1;
  IF international_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sports_nodes WHERE store_id = target_store_id AND parent_id = international_id
  ) THEN
    INSERT INTO public.sports_nodes (store_id, parent_id, node_type, name, sort_order)
      VALUES
        (target_store_id, international_id, 'country', 'Inglaterra', 10),
        (target_store_id, international_id, 'country', 'Espanha', 20),
        (target_store_id, international_id, 'country', 'Itália', 30),
        (target_store_id, international_id, 'country', 'Alemanha', 40),
        (target_store_id, international_id, 'country', 'França', 50),
        (target_store_id, international_id, 'country', 'Portugal', 60),
        (target_store_id, international_id, 'country', 'Outros', 70);
  END IF;

  SELECT id INTO selections_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id = football_id AND name = 'Seleções' LIMIT 1;

  INSERT INTO public.sports_nodes (store_id, node_type, name, sort_order)
    SELECT target_store_id, seed.node_type, seed.name, seed.sort_order
    FROM (VALUES
      ('sport', 'Basquete', 20), ('sport', 'Vôlei', 30), ('sport', 'Tênis', 40),
      ('sport', 'Corrida', 50), ('sport', 'Ciclismo', 60), ('sport', 'Academia', 70),
      ('sport', 'Artes marciais', 80)
    ) AS seed(node_type, name, sort_order)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.sports_nodes n
      WHERE n.store_id = target_store_id AND n.parent_id IS NULL AND n.name = seed.name
    );
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_sports_for_store(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seed_sports_after_store()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_sports_for_store(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stores_seed_sports ON public.stores;
CREATE TRIGGER stores_seed_sports AFTER INSERT ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.seed_sports_after_store();

CREATE OR REPLACE FUNCTION public.sports_nodes_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS sports_nodes_updated ON public.sports_nodes;
CREATE TRIGGER sports_nodes_updated BEFORE UPDATE ON public.sports_nodes
  FOR EACH ROW EXECUTE FUNCTION public.sports_nodes_updated_at();
DROP TRIGGER IF EXISTS sports_settings_updated ON public.sports_settings;
CREATE TRIGGER sports_settings_updated BEFORE UPDATE ON public.sports_settings
  FOR EACH ROW EXECUTE FUNCTION public.sports_nodes_updated_at();

-- Mantém a estrutura inicial disponível para lojas já existentes; o acesso continua PRO-only.
DO $$
DECLARE store_row record;
BEGIN
  FOR store_row IN SELECT id FROM public.stores LOOP
    PERFORM public.seed_sports_for_store(store_row.id);
  END LOOP;
END $$;

COMMENT ON TABLE public.sports_nodes IS 'Árvore editável de esportes, categorias, países, campeonatos, clubes e seleções por loja.';
COMMENT ON TABLE public.product_sports IS 'Classificação esportiva dos produtos existentes, sem duplicar o cadastro de produtos.';
