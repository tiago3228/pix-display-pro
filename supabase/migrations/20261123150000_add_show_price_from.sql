-- Permite que lojas Premium indiquem que o preço exibido é inicial.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS show_price_from boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.enforce_premium_product_actions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_plan text;
BEGIN
  SELECT plan INTO current_plan FROM public.stores WHERE id = NEW.store_id;

  IF COALESCE(current_plan, 'basica') <> 'pro' THEN
    NEW.purchase_enabled := true;
    NEW.quantity_enabled := true;
    NEW.price_visible := true;
    NEW.quote_enabled := false;
    NEW.show_price_from := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_premium_product_actions ON public.products;
CREATE TRIGGER enforce_premium_product_actions
  BEFORE INSERT OR UPDATE OF store_id, purchase_enabled, quantity_enabled, price_visible, quote_enabled, show_price_from
  ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_premium_product_actions();
