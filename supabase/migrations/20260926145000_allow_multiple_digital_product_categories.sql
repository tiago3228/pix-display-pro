-- Permite que cada software pertença a mais de uma categoria.
-- Mantém category_id como categoria principal para compatibilidade com versões antigas.
ALTER TABLE public.digital_products
  ADD COLUMN IF NOT EXISTS category_ids uuid[] NOT NULL DEFAULT '{}';

-- Migra a categoria já cadastrada para a nova lista, sem sobrescrever escolhas existentes.
UPDATE public.digital_products
SET category_ids = ARRAY[category_id]
WHERE category_id IS NOT NULL
  AND cardinality(category_ids) = 0;

CREATE INDEX IF NOT EXISTS digital_products_category_ids_gin_idx
  ON public.digital_products USING gin (category_ids);
