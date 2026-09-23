-- Módulo Premium Marmitaria, exclusivo para PRO e teste PRO.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_module_check;
ALTER TABLE public.products ADD CONSTRAINT products_module_check
  CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria', 'marmitaria'));

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_module_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_module_check
  CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria', 'marmitaria'));

ALTER TABLE public.store_modules DROP CONSTRAINT IF EXISTS store_modules_module_check;
ALTER TABLE public.store_modules ADD CONSTRAINT store_modules_module_check
  CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria', 'marmitaria'));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS meal_period text NOT NULL DEFAULT 'both'
  CHECK (meal_period IN ('lunch', 'dinner', 'both'));

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS default_ddd text NOT NULL DEFAULT '31'
  CHECK (default_ddd ~ '^[1-9][0-9]$');

UPDATE public.premium_store_modules
SET plan_required = 'pro'
WHERE active = true;

INSERT INTO public.premium_store_modules
  (name, slug, description, icon, status, sort_order, active, plan_required, route, featured, promotional_text)
SELECT 'Marmitaria', 'marmitaria', 'Marmitas, acompanhamentos, bebidas, sobremesas e combos', '🍱', 'available', 60, true, 'pro', '/produtos?module=marmitaria', true, 'Venda refeições com almoço e janta'
WHERE NOT EXISTS (SELECT 1 FROM public.premium_store_modules WHERE slug = 'marmitaria');

-- Recria a regra de limite incluindo Marmitaria; os rascunhos sugeridos continuam ocultos.
CREATE OR REPLACE FUNCTION public.enforce_module_product_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_plan text; active_count integer;
BEGIN
  SELECT plan INTO current_plan FROM public.stores WHERE id = NEW.store_id;
  IF current_plan <> 'pro' AND NEW.is_hidden = false
    AND NEW.module IN ('roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria', 'marmitaria') THEN
    SELECT count(*) INTO active_count FROM public.products
      WHERE store_id = NEW.store_id AND module = NEW.module AND is_hidden = false AND id <> NEW.id;
    IF active_count >= 5 THEN
      RAISE EXCEPTION 'Limite de 5 produtos ativos neste módulo no plano Básica.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
