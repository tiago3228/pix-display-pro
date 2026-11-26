-- REVIEW ONLY — NÃO EXECUTADO.
-- Proposta mínima: uma loja do proprietário ativa o entitlement para todas as lojas
-- vinculadas ao mesmo owner_id. Revisar contra o banco de teste/remoto antes de aplicar.
--
-- Não cria tabelas/colunas, não altera dados, policies ou GRANTs.
-- A migration versionada 20260924092000_allow_trial_in_premium_sports.sql já aponta
-- as policies esportivas para store_has_pro_access; não são recriadas aqui.

BEGIN;

CREATE OR REPLACE FUNCTION public.store_has_pro_access(target_store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  WITH target AS (
    SELECT s.id, s.owner_id
    FROM public.stores AS s
    WHERE s.id = target_store_id
  ),
  owner_stores AS (
    SELECT candidate.*
    FROM public.stores AS candidate
    JOIN target AS selected
      ON candidate.id = selected.id
      OR (
        selected.owner_id IS NOT NULL
        AND candidate.owner_id = selected.owner_id
      )
  )
  SELECT EXISTS (
    SELECT 1
    FROM owner_stores AS s
    WHERE s.diamond_access
      OR (
        s.pro_trial_ends_at IS NOT NULL
        AND s.pro_trial_ends_at > now()
      )
      OR EXISTS (
        SELECT 1
        FROM public.subscriptions AS sub
        WHERE sub.store_id = s.id
          AND (
            sub.status IN ('active', 'authorized')
            OR (
              sub.status = 'past_due'
              AND sub.grace_until IS NOT NULL
              AND sub.grace_until > now()
            )
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.pro_pix_requests AS p
        WHERE p.store_id = s.id
          AND p.status = 'approved'
          AND p.period_end IS NOT NULL
          AND p.period_end > now()
      )
  );
$function$;

COMMENT ON FUNCTION public.store_has_pro_access(uuid) IS
  'Acesso PRO compartilhado entre todas as lojas com o mesmo owner_id; loja sem proprietário é avaliada individualmente.';

COMMIT;

-- CREATE OR REPLACE preserva os GRANTs EXECUTE atuais; não conceder novos sem revisão.
-- A versão mais recente versionada de get_public_store(text) já usa esta função para
-- o parcelamento; confirme que essa definição está instalada no ambiente escolhido.
-- O onboarding atualizado não emite novo trial quando o proprietário já tem lojas,
-- mas as policies reais de stores e os campos de trial não foram inspecionados no remoto.
-- Não execute antes de revisar as policies reais (pg_policies) e aprovar a migration.
