-- Loja Premium Informática & Tecnologia.
-- Execute esta migration no Supabase SQL Editor antes de ativar o módulo.

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_module_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_module_check
  CHECK (module IN ('roupas','roupas_esportivas','roupas_treino','calcados','cafeteria','marmitaria','joias','pizzaria','informatica'));

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_module_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_module_check
  CHECK (module IN ('roupas','roupas_esportivas','roupas_treino','calcados','cafeteria','marmitaria','joias','pizzaria','informatica'));

ALTER TABLE public.store_modules
  DROP CONSTRAINT IF EXISTS store_modules_module_check;
ALTER TABLE public.store_modules
  ADD CONSTRAINT store_modules_module_check
  CHECK (module IN ('roupas','roupas_esportivas','roupas_treino','calcados','cafeteria','marmitaria','joias','pizzaria','informatica'));

INSERT INTO public.premium_store_modules
  (name, slug, description, icon, status, sort_order, active, plan_required, route, featured, promotional_text)
VALUES
  ('Informática & Tecnologia', 'informatica', 'Assistência técnica, upgrades, suporte digital e soluções para empresas', '💻', 'available', 90, true, 'pro', '/informatica', true, 'Transforme serviços técnicos em pedidos organizados')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  status = EXCLUDED.status,
  active = EXCLUDED.active,
  plan_required = EXCLUDED.plan_required,
  route = EXCLUDED.route,
  sort_order = EXCLUDED.sort_order,
  featured = EXCLUDED.featured,
  promotional_text = EXCLUDED.promotional_text;

INSERT INTO public.store_modules (store_id, module, name, is_active, is_primary, sort_order)
SELECT s.id, 'informatica', 'Informática & Tecnologia', false, false, 90
FROM public.stores AS s
ON CONFLICT (store_id, module) DO NOTHING;

INSERT INTO public.categories (store_id, name, module, position)
SELECT s.id, seed.name, 'informatica', seed.position
FROM public.stores AS s
CROSS JOIN (VALUES
  ('Formatação e otimização', 10),
  ('Backup e recuperação', 20),
  ('Instalação e configuração', 30),
  ('Upgrades e montagem', 40),
  ('Manutenção e reparos', 50),
  ('Redes e conectividade', 60),
  ('Sites e sistemas', 70),
  ('Planilhas inteligentes', 80),
  ('Suporte e consultoria', 90),
  ('Peças e acessórios', 100)
) AS seed(name, position)
ON CONFLICT (store_id, module, lower(trim(name))) DO NOTHING;

CREATE OR REPLACE FUNCTION public.enforce_premium_module_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.module IN ('roupas_esportivas','roupas_treino','calcados','cafeteria','marmitaria','joias','pizzaria','informatica')
    AND NEW.is_active = true
    AND NOT public.store_has_pro_access(NEW.store_id) THEN
    RAISE EXCEPTION 'Lojas Premium são exclusivas do plano PRO.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_premium_module_plan ON public.store_modules;
CREATE TRIGGER enforce_premium_module_plan
  BEFORE INSERT OR UPDATE OF is_active ON public.store_modules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_module_plan();

CREATE OR REPLACE FUNCTION public.default_store_module(store_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(coalesce(store_category,'')) LIKE '%inform%' OR lower(coalesce(store_category,'')) LIKE '%comput%' OR lower(coalesce(store_category,'')) LIKE '%tecnolog%' THEN 'informatica'
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

CREATE OR REPLACE FUNCTION public.seed_store_modules(target_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_modules (store_id, module, name, is_active, sort_order)
  SELECT target_store_id, seed.module, seed.name,
    (seed.module = 'roupas' OR
      (seed.module = 'joias' AND public.default_store_module(store_row.category) = 'joias' AND public.store_has_pro_access(target_store_id)) OR
      (seed.module = 'informatica' AND public.default_store_module(store_row.category) = 'informatica' AND public.store_has_pro_access(target_store_id)) OR
      (seed.module NOT IN ('joias','informatica','roupas') AND public.store_has_pro_access(target_store_id))),
    seed.sort_order
  FROM public.stores AS store_row
  CROSS JOIN (VALUES
    ('roupas','Roupas',10),('roupas_esportivas','Roupas Esportivas',20),
    ('roupas_treino','Roupas de Treino / Academia',30),('calcados','Calçados',40),
    ('cafeteria','Cafeteria',50),('marmitaria','Marmitaria',60),
    ('joias','Joias e Semijoias',70),('pizzaria','Pizzaria',80),
    ('informatica','Informática & Tecnologia',90)
  ) AS seed(module,name,sort_order)
  WHERE store_row.id = target_store_id
  ON CONFLICT (store_id, module) DO NOTHING;
  INSERT INTO public.training_settings (store_id)
    VALUES (target_store_id)
    ON CONFLICT (store_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_store_modules(uuid) TO authenticated, service_role;

UPDATE public.store_modules AS sm
SET is_active = true
FROM public.stores AS s
WHERE sm.store_id = s.id
  AND sm.module = 'informatica'
  AND public.default_store_module(s.category) = 'informatica'
  AND public.store_has_pro_access(s.id);

COMMENT ON COLUMN public.products.module IS 'Módulo da loja; informatica representa serviços técnicos e soluções digitais.';
