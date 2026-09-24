-- Garante uma categoria neutra para lojas sem categorias próprias do seu nicho.
-- A categoria é vinculada ao módulo padrão da loja para não misturar nichos.
CREATE OR REPLACE FUNCTION public.default_store_module(store_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(coalesce(store_category, '')) LIKE '%marmit%' THEN 'marmitaria'
    WHEN lower(coalesce(store_category, '')) LIKE '%cafeteria%'
      OR lower(coalesce(store_category, '')) LIKE '%aliment%'
      OR lower(coalesce(store_category, '')) LIKE '%doces%'
      OR lower(coalesce(store_category, '')) LIKE '%padaria%'
      OR lower(coalesce(store_category, '')) LIKE '%confeitaria%' THEN 'cafeteria'
    WHEN lower(coalesce(store_category, '')) LIKE '%calçado%'
      OR lower(coalesce(store_category, '')) LIKE '%calcado%' THEN 'calcados'
    WHEN lower(coalesce(store_category, '')) LIKE '%treino%'
      OR lower(coalesce(store_category, '')) LIKE '%academia%' THEN 'roupas_treino'
    WHEN lower(coalesce(store_category, '')) LIKE '%esport%' THEN 'roupas_esportivas'
    ELSE 'roupas'
  END;
$$;

INSERT INTO public.categories (store_id, name, module, position)
SELECT s.id, 'Geral', public.default_store_module(s.category), -1
FROM public.stores AS s
WHERE NOT EXISTS (
  SELECT 1
  FROM public.categories AS c
  WHERE c.store_id = s.id
    AND c.module = public.default_store_module(s.category)
    AND lower(trim(c.name)) IN ('geral', 'outros', 'diversos', 'sem categoria', 'uncategorized')
);

-- Corrige lojas de alimentação criadas antes da classificação por nicho.
-- Uma categoria de roupas/esportes incompatível é substituída por Geral;
-- os registros e demais dados dos produtos são preservados.
UPDATE public.products AS p
SET module = public.default_store_module(s.category),
    category_id = CASE
      WHEN p.category_id IS NULL OR EXISTS (
        SELECT 1
        FROM public.categories AS c
        WHERE c.id = p.category_id
          AND (
            c.module = public.default_store_module(s.category)
            OR lower(trim(c.name)) IN ('geral', 'outros', 'diversos', 'sem categoria', 'uncategorized')
          )
      ) THEN p.category_id
      ELSE (
        SELECT c.id
        FROM public.categories AS c
        WHERE c.store_id = s.id
          AND c.module = public.default_store_module(s.category)
          AND lower(trim(c.name)) = 'geral'
        ORDER BY c.position
        LIMIT 1
      )
    END
FROM public.stores AS s
WHERE p.store_id = s.id
  AND public.default_store_module(s.category) IN ('cafeteria', 'marmitaria')
  AND (
    p.module <> public.default_store_module(s.category)
    OR (
      p.category_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.categories AS c
        WHERE c.id = p.category_id
          AND (
            c.module = public.default_store_module(s.category)
            OR lower(trim(c.name)) IN ('geral', 'outros', 'diversos', 'sem categoria', 'uncategorized')
          )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.seed_general_store_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.categories (store_id, name, module, position)
  VALUES (NEW.id, 'Geral', public.default_store_module(NEW.category), -1);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stores_seed_general_category ON public.stores;
CREATE TRIGGER stores_seed_general_category
AFTER INSERT ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.seed_general_store_category();
