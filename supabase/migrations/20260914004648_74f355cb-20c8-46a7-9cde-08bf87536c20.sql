ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pro_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS pro_trial_used boolean NOT NULL DEFAULT false;

ALTER TABLE public.pro_pix_requests
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'pro';

ALTER TABLE public.pro_pix_requests
  DROP CONSTRAINT IF EXISTS pro_pix_requests_plan_check;
ALTER TABLE public.pro_pix_requests
  ADD CONSTRAINT pro_pix_requests_plan_check CHECK (plan IN ('basica', 'pro'));

INSERT INTO public.plan_pricing (plan, base_price, promo_active)
VALUES ('basica', 9.90, false)
ON CONFLICT (plan) DO NOTHING;

UPDATE public.plan_pricing SET base_price = 19.90 WHERE plan = 'pro' AND base_price = 9.90;

UPDATE public.stores
   SET plan = 'basica',
       pro_trial_ends_at = now() + interval '30 days',
       pro_trial_used = true
 WHERE plan = 'free';

CREATE OR REPLACE FUNCTION public.get_public_store(_slug text)
 RETURNS TABLE(id uuid, slug text, name text, seller_name text, description text, category text, whatsapp text, instagram text, logo_url text, banner_url text, primary_color text, welcome_message text, pix_key text, pix_key_type text, accept_pix boolean, allow_installments boolean, max_installments integer, min_installment_amount numeric)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.slug, s.name, s.seller_name, s.description, s.category, s.whatsapp,
         s.instagram, s.logo_url, s.banner_url, s.primary_color, s.welcome_message,
         s.pix_key, s.pix_key_type, s.accept_pix,
         (s.allow_installments AND (s.plan = 'pro' OR (s.pro_trial_ends_at IS NOT NULL AND s.pro_trial_ends_at > now()))) AS allow_installments,
         s.max_installments, s.min_installment_amount
  FROM public.stores s
  WHERE s.slug = _slug AND s.is_active = true
$function$;

CREATE OR REPLACE FUNCTION public.enforce_subscription_grace()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE affected integer := 0;
DECLARE row_sub record;
BEGIN
  FOR row_sub IN
    SELECT id, store_id
      FROM public.subscriptions
     WHERE status = 'past_due'
       AND grace_until IS NOT NULL
       AND grace_until < now()
  LOOP
    UPDATE public.subscriptions SET status = 'expired' WHERE id = row_sub.id;

    UPDATE public.stores
       SET plan = 'basica'
     WHERE id = row_sub.store_id
       AND plan <> 'basica'
       AND NOT EXISTS (
         SELECT 1 FROM public.subscriptions s2
          WHERE s2.store_id = row_sub.store_id
            AND s2.id <> row_sub.id
            AND (s2.status IN ('active', 'authorized')
                 OR (s2.status = 'past_due' AND s2.grace_until IS NOT NULL AND s2.grace_until > now()))
       );

    INSERT INTO public.audit_logs (store_id, action, resource_type, resource_id, metadata)
    VALUES (row_sub.store_id, 'subscription_grace_expired', 'subscription', row_sub.id::text, '{"source":"cron"}'::jsonb);

    affected := affected + 1;
  END LOOP;
  RETURN affected;
END;
$function$;