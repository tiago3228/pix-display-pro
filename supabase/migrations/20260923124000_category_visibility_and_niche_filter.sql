-- Categorias podem ser ativadas/desativadas sem apagar categorias ou produtos.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.categories.is_active IS
  'Controla a exibição da categoria. Desativar não exclui a categoria nem seus produtos.';
