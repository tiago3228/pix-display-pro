CREATE TABLE public.pix_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pix_key text NOT NULL,
  pix_key_type text NOT NULL DEFAULT 'aleatoria',
  receiver_name text NOT NULL,
  receiver_city text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pix_settings TO authenticated;
GRANT ALL ON public.pix_settings TO service_role;
ALTER TABLE public.pix_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage pix settings" ON public.pix_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER pix_settings_updated BEFORE UPDATE ON public.pix_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.pro_pix_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL DEFAULT 9.90,
  payment_method text NOT NULL DEFAULT 'pix_manual',
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid,
  rejected_at timestamptz,
  rejected_by uuid,
  rejection_reason text,
  period_start timestamptz,
  period_end timestamptz,
  pix_key_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pro_pix_requests_one_pending ON public.pro_pix_requests (store_id) WHERE status = 'pending';
CREATE INDEX pro_pix_requests_store_idx ON public.pro_pix_requests (store_id, created_at DESC);
GRANT SELECT ON public.pro_pix_requests TO authenticated;
GRANT ALL ON public.pro_pix_requests TO service_role;
ALTER TABLE public.pro_pix_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owners read own pro pix requests" ON public.pro_pix_requests
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE TRIGGER pro_pix_requests_updated BEFORE UPDATE ON public.pro_pix_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();