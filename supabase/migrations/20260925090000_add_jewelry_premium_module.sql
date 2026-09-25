-- Módulo Premium Joias e Semijoias.
-- Produtos, categorias e configurações são preservados quando o trial/PRO expira;
-- as políticas e o gate do store_modules apenas suspendem o acesso até a reativação.

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_module_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_module_check
  CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria', 'marmitaria', 'joias'));

ALTER TABLE public.categories
  DROP CONSTRAINT IF EXISTS categories_module_check;
ALTER TABLE public.categories
  ADD CONSTRAINT categories_module_check
  CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria', 'marmitaria', 'joias'));

ALTER TABLE public.store_modules
  DROP CONSTRAINT IF EXISTS store_modules_module_check;
ALTER TABLE public.store_modules
  ADD CONSTRAINT store_modules_module_check
  CHECK (module IN ('roupas', 'roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria', 'marmitaria', 'joias'));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS jewelry_material text,
  ADD COLUMN IF NOT EXISTS jewelry_plating text,
  ADD COLUMN IF NOT EXISTS jewelry_color text,
  ADD COLUMN IF NOT EXISTS jewelry_stone text,
  ADD COLUMN IF NOT EXISTS jewelry_is_new_release boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS jewelry_offer_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS jewelry_original_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS jewelry_offer_price numeric(10,2),
  ADD COLUMN IF NOT EXISTS jewelry_offer_percent integer,
  ADD COLUMN IF NOT EXISTS jewelry_offer_expires_at date;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_jewelry_offer_prices_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_jewelry_offer_prices_check
  CHECK (
    NOT jewelry_offer_active OR (
      jewelry_original_price IS NOT NULL
      AND jewelry_offer_price IS NOT NULL
      AND jewelry_original_price > 0
      AND jewelry_offer_price >= 0
      AND jewelry_offer_price < jewelry_original_price
    )
  );

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_jewelry_offer_percent_check;
ALTER TABLE public.products
  ADD CONSTRAINT products_jewelry_offer_percent_check
  CHECK (jewelry_offer_percent IS NULL OR jewelry_offer_percent BETWEEN 0 AND 100);

-- O módulo é Premium por padrão, mesmo se o catálogo tiver sido parcialmente criado antes.
INSERT INTO public.premium_store_modules
  (name, slug, description, icon, status, sort_order, active, plan_required, route, featured, promotional_text)
VALUES
  ('Joias e Semijoias', 'joias-semijoias', 'Anéis, alianças, colares, brincos e peças especiais para presentear', '💎', 'available', 70, true, 'pro', '/joias', true, 'Sua vitrine sofisticada para cada detalhe')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  status = EXCLUDED.status,
  active = EXCLUDED.active,
  plan_required = EXCLUDED.plan_required,
  route = EXCLUDED.route,
  sort_order = EXCLUDED.sort_order,
  featured = EXCLUDED.featured,
  promotional_text = EXCLUDED.promotional_text;

-- Semeia categorias sugeridas quando o módulo é ativado. ON CONFLICT preserva
-- categorias, produtos, pedidos e personalizações existentes ao reativar a loja.
CREATE OR REPLACE FUNCTION public.seed_jewelry_categories(target_store_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.categories (store_id, name, module, position)
  SELECT target_store_id, seed.name, 'joias', seed.position
  FROM (VALUES
    ('Geral', 0),
    ('💍 Anéis', 1),
    ('💎 Alianças', 2),
    ('📿 Colares', 3),
    ('⛓️ Correntes', 4),
    ('✨ Brincos', 5),
    ('🔗 Pulseiras', 6),
    ('💎 Pingentes', 7),
    ('👑 Conjuntos', 8),
    ('⌚ Relógios e Acessórios', 9),
    ('🎁 Presentes', 10),
    ('⭐ Lançamentos', 11),
    ('🔥 Ofertas', 12)
  ) AS seed(name, position)
  ON CONFLICT (store_id, module, lower(trim(name))) DO NOTHING;
$$;
GRANT EXECUTE ON FUNCTION public.seed_jewelry_categories(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seed_jewelry_categories_after_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.module = 'joias' AND NEW.is_active THEN
    PERFORM public.seed_jewelry_categories(NEW.store_id);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS seed_jewelry_categories_after_activation ON public.store_modules;
CREATE TRIGGER seed_jewelry_categories_after_activation
  AFTER INSERT OR UPDATE ON public.store_modules
  FOR EACH ROW EXECUTE FUNCTION public.seed_jewelry_categories_after_activation();

-- Novas lojas recebem Joias inativo; demais módulos Premium seguem o trial PRO.
CREATE OR REPLACE FUNCTION public.seed_store_modules(target_store_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.store_modules (store_id, module, name, is_active, sort_order)
  SELECT target_store_id, seed.module, seed.name,
         (seed.module = 'roupas' OR
           (seed.module = 'joias' AND public.default_store_module(store_row.category) = 'joias' AND public.store_has_pro_access(target_store_id)) OR
           (seed.module <> 'joias' AND seed.module <> 'roupas' AND public.store_has_pro_access(target_store_id))),
         seed.sort_order
  FROM public.stores AS store_row
  CROSS JOIN (VALUES
    ('roupas', 'Roupas', 10),
    ('roupas_esportivas', 'Roupas Esportivas', 20),
    ('roupas_treino', 'Roupas de Treino / Academia', 30),
    ('calcados', 'Calçados', 40),
    ('cafeteria', 'Cafeteria', 50),
    ('marmitaria', 'Marmitaria', 60),
    ('joias', 'Joias e Semijoias', 70)
  ) AS seed(module, name, sort_order)
  WHERE store_row.id = target_store_id
  ON CONFLICT (store_id, module) DO NOTHING;
  INSERT INTO public.training_settings (store_id)
    VALUES (target_store_id)
    ON CONFLICT (store_id) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_store_modules(uuid) TO authenticated, service_role;

-- Lojas existentes recebem apenas a linha inativa do novo módulo.
INSERT INTO public.store_modules (store_id, module, name, is_active, is_primary, sort_order)
SELECT s.id, 'joias', 'Joias e Semijoias', false, false, 70
FROM public.stores AS s
ON CONFLICT (store_id, module) DO NOTHING;

-- A ativação observa tanto a assinatura quanto o trial PRO de 30 dias.
CREATE OR REPLACE FUNCTION public.enforce_premium_module_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.module IN ('roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria', 'marmitaria', 'joias')
    AND NEW.is_active = true
    AND NOT public.store_has_pro_access(NEW.store_id) THEN
    RAISE EXCEPTION 'Lojas Premium são exclusivas do plano PRO.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS enforce_premium_module_plan ON public.store_modules;
CREATE TRIGGER enforce_premium_module_plan
  BEFORE INSERT OR UPDATE OF is_active ON public.store_modules
  FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_module_plan();

-- Proteção compatível com o limite Básica, incluindo o caso de troca de plano.
CREATE OR REPLACE FUNCTION public.enforce_module_product_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE active_count integer;
BEGIN
  IF NOT public.store_has_pro_access(NEW.store_id)
    AND NEW.is_hidden = false
    AND NEW.module IN ('roupas_esportivas', 'roupas_treino', 'calcados', 'cafeteria', 'marmitaria', 'joias') THEN
    SELECT count(*) INTO active_count
    FROM public.products
    WHERE store_id = NEW.store_id
      AND module = NEW.module
      AND is_hidden = false
      AND id <> NEW.id;
    IF active_count >= 5 THEN
      RAISE EXCEPTION 'Limite de 5 produtos ativos atingido para este módulo na Básica.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS products_module_limit ON public.products;
CREATE TRIGGER products_module_limit
  BEFORE INSERT OR UPDATE OF module, is_hidden ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enforce_module_product_limit();

-- A loja e os produtos continuam guardados se o trial expirar.
DROP POLICY IF EXISTS "owner manages products" ON public.products;
CREATE POLICY "owner manages products" ON public.products FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_id AND s.owner_id = auth.uid()
      AND (module <> 'joias' OR public.store_has_pro_access(s.id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_id AND s.owner_id = auth.uid()
      AND (module <> 'joias' OR public.store_has_pro_access(s.id))
  ));
DROP POLICY IF EXISTS "public reads visible products" ON public.products;
CREATE POLICY "public reads visible products" ON public.products FOR SELECT TO anon
  USING (is_hidden = false AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_id AND s.is_active
      AND (module <> 'joias' OR public.store_has_pro_access(s.id))
  ));

DROP POLICY IF EXISTS "owner manages categories" ON public.categories;
CREATE POLICY "owner manages categories" ON public.categories FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_id AND s.owner_id = auth.uid()
      AND (module <> 'joias' OR public.store_has_pro_access(s.id))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_id AND s.owner_id = auth.uid()
      AND (module <> 'joias' OR public.store_has_pro_access(s.id))
  ));
DROP POLICY IF EXISTS "public reads categories" ON public.categories;
CREATE POLICY "public reads categories" ON public.categories FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = store_id AND s.is_active
      AND (module <> 'joias' OR public.store_has_pro_access(s.id))
  ));

-- SKU e imagem por variação são opcionais; preços/estoque próprios continuam suportados.
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS image_url text;

-- Imagem opcional para cada categoria, editável pelo proprietário.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS image_url text;

-- Opções, valores, variações e imagens permanecem inacessíveis no plano Básica após o trial.
DROP POLICY IF EXISTS "owner manages options" ON public.product_options;
CREATE POLICY "owner manages options" ON public.product_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND s.owner_id = auth.uid()
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND s.owner_id = auth.uid()
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))));
DROP POLICY IF EXISTS "public reads options" ON public.product_options;
CREATE POLICY "public reads options" ON public.product_options FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND p.is_hidden = false AND s.is_active
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))));
DROP POLICY IF EXISTS "owner manages option values" ON public.product_option_values;
CREATE POLICY "owner manages option values" ON public.product_option_values FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.product_options o JOIN public.products p ON p.id = o.product_id
    JOIN public.stores s ON s.id = p.store_id WHERE o.id = option_id AND s.owner_id = auth.uid()
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.product_options o JOIN public.products p ON p.id = o.product_id
    JOIN public.stores s ON s.id = p.store_id WHERE o.id = option_id AND s.owner_id = auth.uid()
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))));
DROP POLICY IF EXISTS "public reads option values" ON public.product_option_values;
CREATE POLICY "public reads option values" ON public.product_option_values FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.product_options o JOIN public.products p ON p.id = o.product_id
    JOIN public.stores s ON s.id = p.store_id WHERE o.id = option_id AND p.is_hidden = false
      AND s.is_active AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))));
DROP POLICY IF EXISTS "owner manages variants" ON public.product_variants;
CREATE POLICY "owner manages variants" ON public.product_variants FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND s.owner_id = auth.uid()
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND s.owner_id = auth.uid()
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))));
DROP POLICY IF EXISTS "public reads variants" ON public.product_variants;
CREATE POLICY "public reads variants" ON public.product_variants FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND p.is_hidden = false AND s.is_active
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))));
DROP POLICY IF EXISTS "owner manages product images" ON public.product_images;
CREATE POLICY "owner manages product images" ON public.product_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND product_images.store_id = s.id AND s.owner_id = auth.uid()
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND product_images.store_id = s.id AND s.owner_id = auth.uid()
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))));
DROP POLICY IF EXISTS "public reads product images" ON public.product_images;
CREATE POLICY "public reads product images" ON public.product_images FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id
    WHERE p.id = product_id AND p.is_hidden = false AND s.is_active
      AND (p.module <> 'joias' OR public.store_has_pro_access(s.id))));

COMMENT ON COLUMN public.products.jewelry_material IS 'Material declarado da joia; opcional e editável pelo vendedor.';
COMMENT ON COLUMN public.products.jewelry_plating IS 'Banho da joia; opcional e editável pelo vendedor.';
COMMENT ON COLUMN public.products.jewelry_color IS 'Cor/acabamento visual da joia; opcional.';
COMMENT ON COLUMN public.products.jewelry_stone IS 'Pedra da joia; opcional.';
COMMENT ON COLUMN public.products.jewelry_offer_expires_at IS 'Último dia em que a oferta é exibida; NULL significa sem data de término.';
COMMENT ON COLUMN public.products.jewelry_is_new_release IS 'Exibe o produto na seção de lançamentos da vitrine de Joias.';
COMMENT ON COLUMN public.products.jewelry_offer_active IS 'Ativa preço e identificação promocional do módulo Joias.';

-- Categorias iniciais para lojas PRO que já tinham Joias ativadas.
SELECT public.seed_jewelry_categories(sm.store_id)
FROM public.store_modules AS sm
WHERE sm.module = 'joias' AND sm.is_active AND public.store_has_pro_access(sm.store_id);

-- Mantém o módulo padrão calculado no SQL alinhado ao utilitário da aplicação.
CREATE OR REPLACE FUNCTION public.default_store_module(store_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN lower(coalesce(store_category, '')) LIKE '%joia%'
      OR lower(coalesce(store_category, '')) LIKE '%semijoia%'
      OR lower(coalesce(store_category, '')) LIKE '%bijuteria%'
      OR lower(coalesce(store_category, '')) LIKE '%acessório%'
      OR lower(coalesce(store_category, '')) LIKE '%acessorio%' THEN 'joias'
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
SELECT s.id, 'Geral', 'joias', -1
FROM public.stores AS s
WHERE public.default_store_module(s.category) = 'joias'
  AND NOT EXISTS (
    SELECT 1 FROM public.categories AS c
    WHERE c.store_id = s.id AND c.module = 'joias'
      AND lower(trim(c.name)) IN ('geral', 'outros', 'diversos', 'sem categoria', 'uncategorized')
  )
ON CONFLICT (store_id, module, lower(trim(name))) DO NOTHING;

-- Se a loja já escolheu Joias como nicho, ativar o módulo apenas para contas
-- com acesso PRO/trial. O trigger acima preenche categorias faltantes.
UPDATE public.store_modules AS sm
SET is_active = true
FROM public.stores AS s
WHERE sm.store_id = s.id
  AND sm.module = 'joias'
  AND sm.is_active = false
  AND public.default_store_module(s.category) = 'joias'
  AND public.store_has_pro_access(s.id);

-- Loja cujo nicho principal é Joias deixa de aparecer publicamente quando o PRO/trial expira.
CREATE OR REPLACE FUNCTION public.get_public_store(_slug text)
RETURNS TABLE(
  id uuid, slug text, name text, seller_name text, description text, category text,
  whatsapp text, instagram text, logo_url text, banner_url text, primary_color text,
  welcome_message text, pix_key text, pix_key_type text, accept_pix boolean,
  allow_installments boolean, max_installments integer, min_installment_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.slug, s.name, s.seller_name, s.description, s.category, s.whatsapp,
         s.instagram, s.logo_url, s.banner_url, s.primary_color, s.welcome_message,
         s.pix_key, s.pix_key_type, s.accept_pix,
         (s.allow_installments AND public.store_has_pro_access(s.id)) AS allow_installments,
         s.max_installments, s.min_installment_amount
  FROM public.stores AS s
  WHERE s.slug = _slug
    AND s.is_active = true
    AND (public.default_store_module(s.category) <> 'joias' OR public.store_has_pro_access(s.id));
$$;
