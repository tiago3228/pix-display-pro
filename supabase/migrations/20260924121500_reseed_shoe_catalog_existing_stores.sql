-- Reaplica o catálogo sugerido de marcas e modelos para lojas já existentes.
-- A operação é idempotente: itens existentes não são duplicados e itens desativados
-- pelo proprietário permanecem desativados.
DO $$
DECLARE
  store_row record;
BEGIN
  FOR store_row IN SELECT id FROM public.stores LOOP
    PERFORM public.seed_shoes_catalog(store_row.id);
  END LOOP;
END;
$$;
