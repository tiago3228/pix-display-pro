-- Canal de bugs, sugestões e melhorias enviados pelos proprietários.
CREATE TABLE IF NOT EXISTS public.owner_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('bug', 'sugestao', 'melhoria')),
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_analise', 'resolvido', 'descartado')),
  admin_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS owner_feedback_store_idx ON public.owner_feedback(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS owner_feedback_status_idx ON public.owner_feedback(status, created_at DESC);
GRANT SELECT, INSERT ON public.owner_feedback TO authenticated;
GRANT UPDATE ON public.owner_feedback TO authenticated;
GRANT ALL ON public.owner_feedback TO service_role;
ALTER TABLE public.owner_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners create feedback" ON public.owner_feedback;
CREATE POLICY "owners create feedback" ON public.owner_feedback FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())
  );
DROP POLICY IF EXISTS "owners read own feedback" ON public.owner_feedback;
CREATE POLICY "owners read own feedback" ON public.owner_feedback FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "admins manage feedback" ON public.owner_feedback;
CREATE POLICY "admins manage feedback" ON public.owner_feedback FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER owner_feedback_updated
  BEFORE UPDATE ON public.owner_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
