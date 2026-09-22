-- Catálogo administrável do hub Lojas Premium.
CREATE TABLE IF NOT EXISTS public.premium_store_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  icon text NOT NULL DEFAULT '⭐',
  image text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'coming_soon', 'inactive')),
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  plan_required text NOT NULL DEFAULT 'basic' CHECK (plan_required IN ('basic', 'pro')),
  route text NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  promotional_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.premium_store_modules TO anon;
GRANT SELECT ON public.premium_store_modules TO authenticated;
GRANT ALL ON public.premium_store_modules TO service_role;
ALTER TABLE public.premium_store_modules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public reads active premium catalog" ON public.premium_store_modules;
CREATE POLICY "public reads active premium catalog" ON public.premium_store_modules FOR SELECT TO anon, authenticated
  USING (active AND status <> 'inactive');
DROP POLICY IF EXISTS "admins manage premium catalog" ON public.premium_store_modules;
CREATE POLICY "admins manage premium catalog" ON public.premium_store_modules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.premium_store_modules (name, slug, description, icon, status, sort_order, active, plan_required, route, featured, promotional_text)
VALUES
  ('Roupas Esportivas', 'roupas-esportivas', 'Clubes, seleções, campeonatos e esportes', '⚽', 'available', 10, true, 'basic', '/roupas-esportivas', true, 'Organize seu catálogo esportivo'),
  ('Roupas de Treino / Academia', 'roupas-treino', 'Fitness, treino, academia e performance', '🏋️', 'available', 20, true, 'basic', '/roupas-treino', true, 'Sua central fitness'),
  ('Calçados', 'calcados', 'Tênis, casual, esportivo e calçados personalizados', '👟', 'available', 30, true, 'basic', '/calcados', true, 'Uma central completa de calçados')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon, route = EXCLUDED.route, status = EXCLUDED.status, active = EXCLUDED.active, sort_order = EXCLUDED.sort_order, featured = EXCLUDED.featured, promotional_text = EXCLUDED.promotional_text;

CREATE TRIGGER premium_store_modules_updated BEFORE UPDATE ON public.premium_store_modules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
