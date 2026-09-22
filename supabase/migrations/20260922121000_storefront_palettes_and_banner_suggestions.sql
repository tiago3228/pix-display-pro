-- Premium Storefront: paleta completa e cópias editáveis de banners por loja.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS secondary_color text NOT NULL DEFAULT '#0f766e',
  ADD COLUMN IF NOT EXISTS accent_color text NOT NULL DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS background_color text NOT NULL DEFAULT '#f8fafc',
  ADD COLUMN IF NOT EXISTS text_color text NOT NULL DEFAULT '#111827',
  ADD COLUMN IF NOT EXISTS button_color text NOT NULL DEFAULT '#111827';

CREATE TABLE IF NOT EXISTS public.storefront_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  cta_label text NOT NULL DEFAULT 'Ver produtos',
  cta_href text NOT NULL DEFAULT '#produtos',
  image_url text,
  template_key text NOT NULL DEFAULT 'custom',
  is_active boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.storefront_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.storefront_banners TO authenticated;
ALTER TABLE public.storefront_banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public reads active storefront banners" ON public.storefront_banners;
CREATE POLICY "public reads active storefront banners" ON public.storefront_banners FOR SELECT TO anon USING (
  is_active AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active)
);
DROP POLICY IF EXISTS "owners manage storefront banners" ON public.storefront_banners;
CREATE POLICY "owners manage storefront banners" ON public.storefront_banners FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
);

DROP FUNCTION IF EXISTS public.get_public_store(text);
CREATE FUNCTION public.get_public_store(_slug text)
RETURNS TABLE(
  id uuid, slug text, name text, seller_name text, description text, category text, whatsapp text,
  instagram text, logo_url text, banner_url text, primary_color text, secondary_color text,
  accent_color text, background_color text, text_color text, button_color text, welcome_message text,
  pix_key text, pix_key_type text, accept_pix boolean, allow_installments boolean,
  max_installments integer, min_installment_amount numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.id, s.slug, s.name, s.seller_name, s.description, s.category, s.whatsapp,
    s.instagram, s.logo_url, COALESCE(sb.image_url, s.banner_url), s.primary_color,
    s.secondary_color, s.accent_color, s.background_color, s.text_color, s.button_color,
    s.welcome_message, s.pix_key, s.pix_key_type, s.accept_pix,
    (s.allow_installments AND (s.plan = 'pro' OR (s.pro_trial_ends_at IS NOT NULL AND s.pro_trial_ends_at > now())),
    s.max_installments, s.min_installment_amount
  FROM public.stores s
  LEFT JOIN LATERAL (
    SELECT image_url FROM public.storefront_banners b
    WHERE b.store_id = s.id AND b.is_active
      AND (b.starts_at IS NULL OR b.starts_at <= now())
      AND (b.ends_at IS NULL OR b.ends_at >= now())
    ORDER BY b.position, b.created_at DESC LIMIT 1
  ) sb ON true
  WHERE s.slug = _slug AND s.is_active = true
$function$;
