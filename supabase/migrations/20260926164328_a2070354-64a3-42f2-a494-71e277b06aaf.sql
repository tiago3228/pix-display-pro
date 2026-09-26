DROP POLICY IF EXISTS "read public store assets" ON storage.objects;
DROP POLICY IF EXISTS "public reads digital product assets" ON storage.objects;

DROP POLICY IF EXISTS "anyone reads landing settings" ON public.landing_settings;
CREATE POLICY "anyone reads landing settings" ON public.landing_settings
  FOR SELECT TO anon, authenticated USING (singleton = true);

DROP POLICY IF EXISTS "anyone reads plan pricing" ON public.plan_pricing;
CREATE POLICY "anyone reads plan pricing" ON public.plan_pricing
  FOR SELECT TO anon, authenticated USING (plan IN ('basica','pro'));