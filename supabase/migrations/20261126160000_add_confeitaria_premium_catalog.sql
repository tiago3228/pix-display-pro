-- Bolos no Pote & Doces aparece como item próprio no hub Lojas Premium.
-- Reutiliza o módulo `cafeteria` para manter compatibilidade com o catálogo de
-- produtos e categorias já aplicado ao fluxo de onboarding.
INSERT INTO public.premium_store_modules (
  name,
  slug,
  description,
  icon,
  status,
  sort_order,
  active,
  plan_required,
  route,
  featured,
  promotional_text
)
VALUES (
  'Bolos no Pote & Doces',
  'confeitaria',
  'Bolos no pote, doces artesanais e combos para encomendas.',
  '🍰',
  'available',
  55,
  true,
  'pro',
  '/produtos?module=cafeteria',
  true,
  'Sua vitrine para bolos, doces e combos'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  plan_required = EXCLUDED.plan_required,
  route = EXCLUDED.route,
  featured = EXCLUDED.featured,
  promotional_text = EXCLUDED.promotional_text,
  updated_at = now();
