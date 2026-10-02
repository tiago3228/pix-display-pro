-- Acesso Diamante: acesso permanente equivalente ao plano PRO, concedido pelo Admin Master.
-- Não depende de assinatura, trial ou renovação; só termina quando o admin desabilita.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS diamond_access boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.store_has_pro_access(target_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = target_store_id
      AND (
        s.diamond_access
        OR (s.pro_trial_ends_at IS NOT NULL AND s.pro_trial_ends_at > now())
        OR EXISTS (
          SELECT 1
          FROM public.subscriptions sub
          WHERE sub.store_id = s.id
            AND (
              sub.status IN ('active', 'authorized')
              OR (sub.status = 'past_due' AND sub.grace_until IS NOT NULL AND sub.grace_until > now())
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.pro_pix_requests p
          WHERE p.store_id = s.id
            AND p.status = 'approved'
            AND p.period_end IS NOT NULL
            AND p.period_end > now()
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.master_set_diamond_access(_store_id uuid, _enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result_row public.stores;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso restrito a administradores.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.stores
  SET diamond_access = _enabled,
      plan = CASE
        WHEN _enabled THEN 'pro'
        WHEN EXISTS (
          SELECT 1 FROM public.subscriptions sub
          WHERE sub.store_id = public.stores.id
            AND sub.status IN ('active', 'authorized')
        ) THEN 'pro'
        ELSE 'basica'
      END,
      updated_at = now()
  WHERE id = _store_id
  RETURNING * INTO result_row;

  IF result_row.id IS NULL THEN
    RAISE EXCEPTION 'Loja não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'store_id', result_row.id,
    'store_name', result_row.name,
    'diamond_access', result_row.diamond_access
  );
END;
$$;

REVOKE ALL ON FUNCTION public.master_set_diamond_access(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.master_set_diamond_access(uuid, boolean) TO authenticated;
