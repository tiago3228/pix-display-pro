-- Remove categorias duplicadas por loja, módulo e nome, preservando o registro
-- mais antigo/mais bem posicionado e mantendo produtos apontando para ele.
WITH ranked AS (
  SELECT
    id,
    FIRST_VALUE(id) OVER (
      PARTITION BY store_id, module, lower(trim(name))
      ORDER BY position ASC, created_at ASC, id ASC
    ) AS keeper_id,
    ROW_NUMBER() OVER (
      PARTITION BY store_id, module, lower(trim(name))
      ORDER BY position ASC, created_at ASC, id ASC
    ) AS row_number
  FROM public.categories
), duplicates AS (
  SELECT id, keeper_id
  FROM ranked
  WHERE row_number > 1
)
UPDATE public.products AS p
SET category_id = d.keeper_id
FROM duplicates AS d
WHERE p.category_id = d.id;

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY store_id, module, lower(trim(name))
      ORDER BY position ASC, created_at ASC, id ASC
    ) AS row_number
  FROM public.categories
)
DELETE FROM public.categories AS c
USING ranked AS r
WHERE c.id = r.id
  AND r.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS categories_store_module_name_unique
  ON public.categories (store_id, module, lower(trim(name)));
