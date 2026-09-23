-- Módulo independente de Cafeteria para lojas de cardápio.
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_module_check;
ALTER TABLE public.products ADD CONSTRAINT products_module_check
  CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria'));

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_module_check;
ALTER TABLE public.categories ADD CONSTRAINT categories_module_check
  CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria'));

ALTER TABLE public.store_modules DROP CONSTRAINT IF EXISTS store_modules_module_check;
ALTER TABLE public.store_modules ADD CONSTRAINT store_modules_module_check
  CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria'));

INSERT INTO public.premium_store_modules
  (name, slug, description, icon, status, sort_order, active, plan_required, route, featured)
SELECT 'Cafeteria', 'cafeteria', 'Cafés, salgados, doces, bebidas e combos', '☕', 'available', 50, true, 'basic', '/produtos?module=cafeteria', true
WHERE NOT EXISTS (SELECT 1 FROM public.premium_store_modules WHERE slug = 'cafeteria');

CREATE OR REPLACE FUNCTION public.enforce_module_product_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_plan text; active_count integer;
BEGIN
  SELECT plan INTO current_plan FROM public.stores WHERE id = NEW.store_id;
  IF current_plan <> 'pro' AND NEW.is_hidden = false
    AND NEW.module IN ('roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria') THEN
    SELECT count(*) INTO active_count FROM public.products
      WHERE store_id = NEW.store_id AND module = NEW.module AND is_hidden = false AND id <> NEW.id;
    IF active_count >= 5 THEN
      RAISE EXCEPTION 'Limite de 5 produtos ativos neste módulo no plano Básica.' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
