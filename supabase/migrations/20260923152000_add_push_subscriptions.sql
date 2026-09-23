CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners manage their push subscriptions"
  ON public.push_subscriptions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = push_subscriptions.store_id AND s.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = push_subscriptions.store_id AND s.owner_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS push_subscriptions_store_id_idx
  ON public.push_subscriptions(store_id);
