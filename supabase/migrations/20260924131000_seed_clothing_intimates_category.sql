-- Garante que lojas existentes de roupas tenham a categoria de roupas íntimas.
-- O módulo e o índice único por loja/módulo/nome evitam misturar nichos ou duplicar a categoria.
INSERT INTO public.categories (store_id, name, module, position)
SELECT
  s.id,
  'Íntimos',
  'roupas',
  COALESCE((
    SELECT MAX(c.position) + 1
    FROM public.categories AS c
    WHERE c.store_id = s.id
      AND c.module = 'roupas'
  ), 0)
FROM public.stores AS s
WHERE public.default_store_module(s.category) = 'roupas'
  AND (
  lower(coalesce(s.category, '')) LIKE '%roup%'
    OR lower(coalesce(s.category, '')) LIKE '%vestu%'
    OR lower(coalesce(s.category, '')) LIKE '%moda%'
    OR lower(coalesce(s.category, '')) LIKE '%lingerie%'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.categories AS c
    WHERE c.store_id = s.id
      AND c.module = 'roupas'
      AND lower(trim(c.name)) IN ('íntimos', 'intimos', 'roupas íntimas', 'roupas intimas', 'lingerie')
  )
ON CONFLICT DO NOTHING;

-- Novas lojas de vestuário também recebem a categoria automaticamente.
CREATE OR REPLACE FUNCTION public.seed_clothing_intimates_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.default_store_module(NEW.category) = 'roupas'
    AND (
      lower(coalesce(NEW.category, '')) LIKE '%roup%'
      OR lower(coalesce(NEW.category, '')) LIKE '%vestu%'
      OR lower(coalesce(NEW.category, '')) LIKE '%moda%'
      OR lower(coalesce(NEW.category, '')) LIKE '%lingerie%'
    ) THEN
    INSERT INTO public.categories (store_id, name, module, position)
    VALUES (NEW.id, 'Íntimos', 'roupas', 0)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stores_seed_clothing_intimates_category ON public.stores;
CREATE TRIGGER stores_seed_clothing_intimates_category
AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.seed_clothing_intimates_category();
