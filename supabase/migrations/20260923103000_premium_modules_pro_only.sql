-- Todos os módulos da área Lojas Premium são exclusivos do PRO.
UPDATE public.premium_store_modules SET plan_required = 'pro' WHERE active = true;

-- Impede ativação de módulos Premium por lojas sem PRO, preservando os dados existentes.
CREATE OR REPLACE FUNCTION public.enforce_premium_module_plan()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_plan text;
BEGIN
  SELECT plan INTO current_plan FROM public.stores WHERE id = NEW.store_id;
  IF NEW.is_active = true AND COALESCE(current_plan, 'basic') <> 'pro' THEN
    RAISE EXCEPTION 'Lojas Premium são exclusivas do plano PRO.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_premium_module_plan ON public.store_modules;
CREATE TRIGGER enforce_premium_module_plan
  BEFORE INSERT OR UPDATE OF is_active ON public.store_modules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_module_plan();
