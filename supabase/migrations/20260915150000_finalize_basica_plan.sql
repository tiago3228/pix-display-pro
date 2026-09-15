-- Vitrini: consolida a migração do plano legado Grátis para Básica.
-- Execute este arquivo no editor SQL do Lovable se as migrações do repositório
-- ainda não tiverem sido aplicadas ao banco.

INSERT INTO public.plan_pricing (plan, base_price, promo_active)
VALUES
  ('basica', 9.90, false),
  ('pro', 19.90, false)
ON CONFLICT (plan) DO UPDATE
SET base_price = EXCLUDED.base_price,
    promo_active = EXCLUDED.promo_active;

UPDATE public.stores
SET plan = 'basica',
    pro_trial_ends_at = COALESCE(pro_trial_ends_at, now() + interval '30 days'),
    pro_trial_used = true
WHERE plan = 'free';

UPDATE public.subscriptions
SET plan = 'basica'
WHERE plan = 'free';
