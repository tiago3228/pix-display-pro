-- ============ 1. STORES: payment settings ============
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS accept_pix boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_installments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_installments integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS min_installment_amount numeric NOT NULL DEFAULT 20;

ALTER TABLE public.stores
  ADD CONSTRAINT stores_max_installments_range CHECK (max_installments BETWEEN 1 AND 12);

-- ============ 2. CUSTOMERS ============
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS customers_updated ON public.customers;
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS customers_store_whatsapp_idx ON public.customers (store_id, whatsapp);

-- ============ 3. ORDERS: payment terms ============
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'pix_avista',
  ADD COLUMN IF NOT EXISTS installments_count integer NOT NULL DEFAULT 1;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('pix_avista','parcelado'));
ALTER TABLE public.orders
  ADD CONSTRAINT orders_installments_range CHECK (installments_count BETWEEN 1 AND 12);

-- ============ 4. SUBSCRIPTIONS ============
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS provider_plan_id text,
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS external_reference text,
  ADD COLUMN IF NOT EXISTS external_status text,
  ADD COLUMN IF NOT EXISTS amount numeric NOT NULL DEFAULT 9.90,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS init_point text,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_billing_date timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_at timestamptz,
  ADD COLUMN IF NOT EXISTS past_due_since timestamptz,
  ADD COLUMN IF NOT EXISTS grace_until timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS subscriptions_updated ON public.subscriptions;
CREATE TRIGGER subscriptions_updated BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_sub_idx
  ON public.subscriptions (provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

-- one live PRO subscription per store
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_live_per_store_idx
  ON public.subscriptions (store_id)
  WHERE status IN ('pending','active','authorized','past_due','paused');

CREATE INDEX IF NOT EXISTS subscriptions_store_idx ON public.subscriptions (store_id);

-- ============ 5. SUBSCRIPTION PAYMENTS ============
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_payment_id text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending',
  external_status text,
  paid_at timestamptz,
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_payments_provider_idx
  ON public.subscription_payments (provider, provider_payment_id);
CREATE INDEX IF NOT EXISTS subscription_payments_store_idx ON public.subscription_payments (store_id);

GRANT SELECT ON public.subscription_payments TO authenticated;
GRANT ALL ON public.subscription_payments TO service_role;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads subscription payments" ON public.subscription_payments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = subscription_payments.store_id AND s.owner_id = auth.uid()));

CREATE TRIGGER subscription_payments_updated BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 6. SUBSCRIPTION EVENTS (webhook idempotency) ============
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'mercadopago',
  event_id text NOT NULL,
  event_type text NOT NULL,
  resource_id text,
  payload_hash text,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'received',
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_events_unique_idx
  ON public.subscription_events (provider, event_id);
CREATE INDEX IF NOT EXISTS subscription_events_resource_idx ON public.subscription_events (resource_id);

GRANT ALL ON public.subscription_events TO service_role;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- ============ 7. APP SETTINGS (backend only) ============
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER app_settings_updated BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 8. INSTALLMENTS ============
CREATE TABLE IF NOT EXISTS public.installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  installment_number integer NOT NULL,
  total_installments integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  paid_by uuid,
  payment_method text,
  payment_reference text,
  public_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT installments_status_check CHECK (status IN ('pending','paid','overdue','canceled')),
  CONSTRAINT installments_number_check CHECK (installment_number >= 1 AND installment_number <= total_installments)
);
CREATE UNIQUE INDEX IF NOT EXISTS installments_order_number_idx
  ON public.installments (order_id, installment_number);
CREATE UNIQUE INDEX IF NOT EXISTS installments_public_token_idx ON public.installments (public_token);
CREATE INDEX IF NOT EXISTS installments_store_due_idx ON public.installments (store_id, status, due_date);
CREATE INDEX IF NOT EXISTS installments_customer_idx ON public.installments (customer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.installments TO authenticated;
GRANT ALL ON public.installments TO service_role;
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages installments" ON public.installments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = installments.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = installments.store_id AND s.owner_id = auth.uid()));

CREATE TRIGGER installments_updated BEFORE UPDATE ON public.installments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ 9. PAYMENT REMINDERS ============
CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  installment_id uuid NOT NULL REFERENCES public.installments(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  link text,
  message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_reminders_installment_idx ON public.payment_reminders (installment_id);
CREATE INDEX IF NOT EXISTS payment_reminders_store_idx ON public.payment_reminders (store_id, created_at DESC);

GRANT SELECT, INSERT ON public.payment_reminders TO authenticated;
GRANT ALL ON public.payment_reminders TO service_role;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads reminders" ON public.payment_reminders
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = payment_reminders.store_id AND s.owner_id = auth.uid()));
CREATE POLICY "owner creates reminders" ON public.payment_reminders
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = payment_reminders.store_id AND s.owner_id = auth.uid()));

-- ============ 10. AUDIT LOGS ============
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  reference text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_logs_store_idx ON public.audit_logs (store_id, created_at DESC);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = audit_logs.store_id AND s.owner_id = auth.uid()));