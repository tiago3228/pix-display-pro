-- Garante que novas lojas usem o plano Básica com trial PRO completo.
-- O trial é controlado por pro_trial_ends_at e permanece editável/auditável.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pro_trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS pro_trial_used boolean NOT NULL DEFAULT false;

ALTER TABLE public.stores
  ALTER COLUMN plan SET DEFAULT 'basica';

UPDATE public.stores
SET plan = 'basica'
WHERE plan = 'free';
