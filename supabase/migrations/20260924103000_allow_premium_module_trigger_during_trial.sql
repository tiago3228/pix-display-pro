-- O trial PRO também deve liberar a ativação dos módulos Premium.
CREATE OR REPLACE FUNCTION public.enforce_premium_module_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true AND NOT public.store_has_pro_access(NEW.store_id) THEN
    RAISE EXCEPTION 'Lojas Premium são exclusivas do plano PRO.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_premium_module_plan ON public.store_modules;
CREATE TRIGGER enforce_premium_module_plan
  BEFORE INSERT OR UPDATE OF is_active ON public.store_modules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_module_plan();
