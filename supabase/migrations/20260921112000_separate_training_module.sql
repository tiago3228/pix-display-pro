-- Separação arquitetural: Roupas, Roupas Esportivas e Roupas de Treino/A academia.
-- Preserva IDs, imagens, preços, estoque e produtos existentes.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS module text NOT NULL DEFAULT 'roupas';
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_module_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_module_check CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino'));

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS module text NOT NULL DEFAULT 'roupas';
ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_module_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_module_check CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino'));

CREATE TABLE IF NOT EXISTS public.store_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  module text NOT NULL CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino')),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, module)
);
CREATE INDEX IF NOT EXISTS store_modules_store_idx ON public.store_modules(store_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_modules TO authenticated;
GRANT SELECT ON public.store_modules TO anon;
GRANT ALL ON public.store_modules TO service_role;
ALTER TABLE public.store_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owners manage store modules" ON public.store_modules;
CREATE POLICY "owners manage store modules" ON public.store_modules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "public reads active store modules" ON public.store_modules;
CREATE POLICY "public reads active store modules" ON public.store_modules FOR SELECT TO anon
  USING (is_active AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active));

CREATE TABLE IF NOT EXISTS public.training_settings (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  name text NOT NULL DEFAULT 'Roupas de Treino / Academia',
  description text NOT NULL DEFAULT 'Academia, fitness, corrida e performance.',
  banner_url text,
  primary_color text NOT NULL DEFAULT '#7c3aed',
  secondary_color text NOT NULL DEFAULT '#f97316',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_settings TO authenticated;
GRANT SELECT ON public.training_settings TO anon;
GRANT ALL ON public.training_settings TO service_role;
ALTER TABLE public.training_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owners manage training settings" ON public.training_settings;
CREATE POLICY "owners manage training settings" ON public.training_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "public reads training settings" ON public.training_settings;
CREATE POLICY "public reads training settings" ON public.training_settings FOR SELECT TO anon
  USING (enabled AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active));

-- Classifica explicitamente produtos já vinculados à árvore esportiva.
UPDATE public.products p SET module = 'roupas_esportivas'
WHERE EXISTS (SELECT 1 FROM public.product_sports ps JOIN public.sports_nodes n ON n.id = ps.node_id WHERE ps.product_id = p.id);

-- O antigo nó raiz Academia deixa de ser um esporte. Produtos associados a ele
-- passam para o módulo independente preservando o mesmo product_id.
UPDATE public.products p SET module = 'roupas_treino'
WHERE EXISTS (
  SELECT 1 FROM public.product_sports ps
  JOIN public.sports_nodes n ON n.id = ps.node_id
  WHERE ps.product_id = p.id AND n.parent_id IS NULL AND lower(n.name) IN ('academia', 'fitness', 'treino')
);
DELETE FROM public.product_sports ps
WHERE EXISTS (
  SELECT 1 FROM public.sports_nodes n
  WHERE n.id = ps.node_id AND n.parent_id IS NULL AND lower(n.name) IN ('academia', 'fitness', 'treino')
);
UPDATE public.sports_nodes
SET is_active = false
WHERE parent_id IS NULL AND lower(name) IN ('academia', 'fitness', 'treino');

-- Categorias fitness passam ao módulo de treino; as demais não são alteradas.
UPDATE public.categories SET module = 'roupas_treino'
WHERE lower(name) LIKE ANY (ARRAY['%fitness%', '%treino%', '%academia%', '%legging%', '%top%', '%dry fit%', '%musculação%', '%corrida%']);

CREATE OR REPLACE FUNCTION public.seed_store_modules(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.store_modules (store_id, module, name, sort_order)
  VALUES
    (target_store_id, 'roupas', 'Roupas', 10),
    (target_store_id, 'roupas_esportivas', 'Roupas Esportivas', 20),
    (target_store_id, 'roupas_treino', 'Roupas de Treino / Academia', 30)
  ON CONFLICT (store_id, module) DO NOTHING;
  INSERT INTO public.training_settings (store_id) VALUES (target_store_id)
    ON CONFLICT (store_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_store_modules(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seed_modules_after_store()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_store_modules(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stores_seed_modules ON public.stores;
CREATE TRIGGER stores_seed_modules AFTER INSERT ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.seed_modules_after_store();

DO $$
DECLARE store_row record;
BEGIN
  FOR store_row IN SELECT id FROM public.stores LOOP
    PERFORM public.seed_store_modules(store_row.id);
  END LOOP;
END $$;

-- Limite de produtos ativos por módulo na Básica. Produtos inativos não consomem limite.
CREATE OR REPLACE FUNCTION public.enforce_module_product_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_plan text;
DECLARE active_count integer;
BEGIN
  SELECT plan INTO current_plan FROM public.stores WHERE id = NEW.store_id;
  IF current_plan <> 'pro' AND NEW.is_hidden = false AND NEW.module IN ('roupas_esportivas', 'roupas_treino') THEN
    SELECT count(*) INTO active_count FROM public.products
      WHERE store_id = NEW.store_id AND module = NEW.module AND is_hidden = false AND id <> NEW.id;
    IF active_count >= 5 THEN
      RAISE EXCEPTION 'Limite de 5 produtos ativos atingido para este módulo na Básica';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS products_module_limit ON public.products;
CREATE TRIGGER products_module_limit BEFORE INSERT OR UPDATE OF module, is_hidden ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_module_product_limit();

COMMENT ON COLUMN public.products.module IS 'Módulo explícito: roupas, roupas_esportivas ou roupas_treino. Nunca inferir por categoria.';
