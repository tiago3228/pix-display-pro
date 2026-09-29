-- Vitrini: pagamentos Pix dinâmicos via Mercado Pago.
-- Cole este arquivo no editor SQL do Lovable e execute antes de usar o novo checkout Pix.

CREATE TABLE IF NOT EXISTS public.mercadopago_pix_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  plan text NOT NULL CHECK (plan IN ('basica', 'pro')),
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'BRL',
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_payment_id text NOT NULL,
  external_reference text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  status_detail text,
  qr_code text,
  qr_code_base64 text,
  ticket_url text,
  payer_email text NOT NULL,
  expires_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id),
  UNIQUE (external_reference)
);

ALTER TABLE public.mercadopago_pix_payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.mercadopago_pix_payments TO authenticated;
GRANT ALL ON public.mercadopago_pix_payments TO service_role;

DROP POLICY IF EXISTS "owners read Mercado Pago Pix payments"
  ON public.mercadopago_pix_payments;
CREATE POLICY "owners read Mercado Pago Pix payments"
  ON public.mercadopago_pix_payments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = mercadopago_pix_payments.store_id
      AND s.owner_id = auth.uid()
  ));

DROP TRIGGER IF EXISTS mercadopago_pix_payments_updated
  ON public.mercadopago_pix_payments;
CREATE TRIGGER mercadopago_pix_payments_updated
  BEFORE UPDATE ON public.mercadopago_pix_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS mercadopago_pix_payments_store_idx
  ON public.mercadopago_pix_payments(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mercadopago_pix_payments_status_idx
  ON public.mercadopago_pix_payments(status, expires_at);
CREATE INDEX IF NOT EXISTS mercadopago_pix_payments_external_ref_idx
  ON public.mercadopago_pix_payments(external_reference);
