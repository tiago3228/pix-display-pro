-- Corrige a exposição pública da identidade visual sem liberar a tabela stores.
-- A vitrine lê somente os campos permitidos por esta função SECURITY DEFINER.
DROP FUNCTION IF EXISTS public.get_public_store(text);

CREATE FUNCTION public.get_public_store(_slug text)
RETURNS TABLE(
  id uuid, slug text, name text, seller_name text, description text, category text, whatsapp text,
  instagram text, logo_url text, banner_url text, primary_color text, secondary_color text,
  accent_color text, background_color text, text_color text, button_color text, theme_palette jsonb,
  welcome_message text, pix_key text, pix_key_type text, accept_pix boolean,
  allow_installments boolean, max_installments integer, min_installment_amount numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT s.id, s.slug, s.name, s.seller_name, s.description, s.category, s.whatsapp,
    s.instagram, s.logo_url, COALESCE(sb.image_url, s.banner_url), s.primary_color,
    s.secondary_color, s.accent_color, s.background_color, s.text_color, s.button_color,
    s.theme_palette, s.welcome_message, s.pix_key, s.pix_key_type, s.accept_pix,
    (s.allow_installments AND (s.plan = 'pro' OR (s.pro_trial_ends_at IS NOT NULL AND s.pro_trial_ends_at > now()))),
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
