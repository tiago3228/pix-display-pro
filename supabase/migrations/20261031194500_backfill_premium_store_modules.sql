-- Garante que lojas criadas antes dos módulos mais recentes também tenham
-- registros ativáveis para Cafeteria, Marmitaria e Joias e Semijoias.
INSERT INTO public.store_modules (store_id, module, name, is_active, is_primary, sort_order)
SELECT s.id, seed.module, seed.name, false, false, seed.sort_order
FROM public.stores AS s
CROSS JOIN (VALUES
  ('cafeteria', 'Cafeteria', 50),
  ('marmitaria', 'Marmitaria', 60),
  ('joias', 'Joias e Semijoias', 70)
) AS seed(module, name, sort_order)
ON CONFLICT (store_id, module) DO NOTHING;
