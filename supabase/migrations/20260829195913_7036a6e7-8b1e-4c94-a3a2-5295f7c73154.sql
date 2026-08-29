CREATE TABLE public.campaign_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'customer',
  campaign_type text NOT NULL DEFAULT 'custom',
  recipient_name text,
  recipient_whatsapp text NOT NULL,
  recipient_ref uuid,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  message text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.campaign_sends TO authenticated;
GRANT ALL ON public.campaign_sends TO service_role;

ALTER TABLE public.campaign_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage campaign sends"
ON public.campaign_sends FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert campaign sends"
ON public.campaign_sends FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owners read own campaign sends"
ON public.campaign_sends FOR SELECT TO authenticated
USING (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE POLICY "owners insert own campaign sends"
ON public.campaign_sends FOR INSERT TO authenticated
WITH CHECK (store_id IN (SELECT id FROM public.stores WHERE owner_id = auth.uid()));

CREATE INDEX campaign_sends_store_idx ON public.campaign_sends(store_id, created_at DESC);