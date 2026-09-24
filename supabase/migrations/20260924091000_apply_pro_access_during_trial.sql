-- O trial de 30 dias libera integralmente os módulos PRO.
CREATE OR REPLACE FUNCTION public.store_has_pro_access(target_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = target_store_id
      AND (
        s.plan = 'pro'
        OR (s.pro_trial_ends_at IS NOT NULL AND s.pro_trial_ends_at > now())
      )
  )
$$;

-- O limite de 5 produtos por módulo não se aplica durante o trial PRO.
CREATE OR REPLACE FUNCTION public.enforce_module_product_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE active_count integer;
BEGIN
  IF NOT public.store_has_pro_access(NEW.store_id)
    AND NEW.is_hidden = false
    AND NEW.module IN ('roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria', 'marmitaria') THEN
    SELECT count(*) INTO active_count
    FROM public.products
    WHERE store_id = NEW.store_id
      AND module = NEW.module
      AND is_hidden = false
      AND id <> NEW.id;
    IF active_count >= 5 THEN
      RAISE EXCEPTION 'Limite de 5 produtos ativos atingido para este módulo na Básica.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_module_limit ON public.products;
CREATE TRIGGER products_module_limit
  BEFORE INSERT OR UPDATE OF module, is_hidden ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_module_product_limit();
