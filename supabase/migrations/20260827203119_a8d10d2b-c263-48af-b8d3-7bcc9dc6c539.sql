-- 1) Exposição pública mínima da tabela stores -------------------------------
DROP POLICY IF EXISTS "public reads active stores" ON public.stores;
REVOKE SELECT ON public.stores FROM anon;
GRANT SELECT (id, is_active) ON public.stores TO anon;

CREATE POLICY "anon checks active stores" ON public.stores
  FOR SELECT TO anon USING (is_active = true);

CREATE OR REPLACE FUNCTION public.get_public_store(_slug text)
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  seller_name text,
  description text,
  category text,
  whatsapp text,
  instagram text,
  logo_url text,
  banner_url text,
  primary_color text,
  welcome_message text,
  pix_key text,
  pix_key_type text,
  accept_pix boolean,
  allow_installments boolean,
  max_installments integer,
  min_installment_amount numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.slug, s.name, s.seller_name, s.description, s.category, s.whatsapp,
         s.instagram, s.logo_url, s.banner_url, s.primary_color, s.welcome_message,
         s.pix_key, s.pix_key_type, s.accept_pix,
         (s.allow_installments AND s.plan = 'pro') AS allow_installments,
         s.max_installments, s.min_installment_amount
  FROM public.stores s
  WHERE s.slug = _slug AND s.is_active = true
$$;

REVOKE ALL ON FUNCTION public.get_public_store(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_store(text) TO anon, authenticated, service_role;

-- 2) Rotina diária: persistir parcelas em atraso -----------------------------
CREATE OR REPLACE FUNCTION public.mark_overdue_installments()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE affected integer;
BEGIN
  UPDATE public.installments
     SET status = 'overdue'
   WHERE status = 'pending'
     AND due_date < CURRENT_DATE;
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_overdue_installments() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_overdue_installments() TO service_role;

-- 3) Rotina diária: encerrar tolerância da assinatura PRO --------------------
CREATE OR REPLACE FUNCTION public.enforce_subscription_grace()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
       SET plan = 'free'
     WHERE id = row_sub.store_id
       AND plan <> 'free'
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
$$;

REVOKE ALL ON FUNCTION public.enforce_subscription_grace() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_subscription_grace() TO service_role;

-- 4) Agendamento diário ------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

DO $$
BEGIN
  PERFORM cron.unschedule('vitrini-daily-billing');
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

SELECT cron.schedule(
  'vitrini-daily-billing',
  '5 3 * * *',
  $$SELECT public.mark_overdue_installments(); SELECT public.enforce_subscription_grace();$$
);