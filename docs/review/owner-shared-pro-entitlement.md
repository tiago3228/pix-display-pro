# Revisão: entitlement PRO compartilhado entre lojas

## Escopo

O arquivo `owner-shared-pro-entitlement.sql` propõe substituir somente o corpo de `public.store_has_pro_access(uuid)`. Para uma loja com `owner_id` definido, o entitlement vale se qualquer loja do mesmo proprietário tiver acesso Diamond permanente, trial vigente, assinatura ativa/autorizada, assinatura em carência vigente ou pagamento Pix aprovado ainda dentro do período. Lojas sem `owner_id` são avaliadas individualmente.

A função continua retornando somente boolean. A proposta não cria tabelas/colunas, não altera registros, policies ou GRANTs. `CREATE OR REPLACE FUNCTION` preserva os privilégios EXECUTE atuais. O corpo permanece `SECURITY DEFINER`, com `search_path` fixo em `public`.

## Compatibilidade e policies

A migration versionada `20260924092000_allow_trial_in_premium_sports.sql` já atualiza as policies esportivas para usar `store_has_pro_access`; portanto, a proposta não recria políticas que já existem no histórico versionado. A versão mais recente versionada de `get_public_store(text)` também usa a função para decidir se o parcelamento aparece. Ao trocar o corpo do entitlement, esses recursos passam a reconhecer o PRO compartilhado sem duplicar migrations ou políticas.

A aplicação consulta a função existente por `target_store_id` ao carregar a loja ativa e nas validações server-side. A cobrança continua associada à loja âncora da conta, sem criar uma cobrança por loja. O onboarding atualizado concede trial apenas quando o proprietário ainda não possui lojas; lojas posteriores não recebem novo período no fluxo normal.

## Limitação: trial da primeira loja

A verificação de primeira loja no onboarding é feita com a lista carregada no cliente antes do `INSERT`; ela não é atômica. Duas criações simultâneas podem passar pela verificação e tentar conceder trial. Portanto, essa regra é uma proteção de fluxo, não uma garantia de banco. Para garanti-la contra chamadas diretas ou concorrentes, é necessária uma operação server-side atômica e revisão das policies reais de `stores`; essa alteração não está incluída neste SQL e não deve ser improvisada sem inspecionar as policies instaladas.

## Segurança e limites

A revisão foi feita nas migrations locais, não por introspecção do banco remoto. Antes de aplicar, conferir `pg_policies`, privilégios de execução e as definições reais das funções no ambiente. Confirmar que não exista policy permissiva antiga com outro nome e que a função instalada corresponda ao histórico. A proposta não altera grants e não afirma que chamadas diretas à API não possam editar campos de trial; se as policies reais permitirem ao proprietário controlar `pro_trial_ends_at` ou `pro_trial_used`, uma proteção server-side adicional deve ser desenhada e aprovada.

## Testes recomendados em ambiente de teste

1. Proprietário sem PRO: todas as lojas retornam `false`.
2. Uma loja com assinatura ativa: todas as lojas do mesmo `owner_id` retornam `true`; outra conta permanece `false`.
3. Testar separadamente `authorized`, `past_due` dentro/fora da carência, Pix aprovado vigente/expirado, trial vigente/expirado e Diamond.
4. Loja inexistente e loja sem proprietário não recebem acesso herdado de outra conta.
5. Confirmar que telas, catálogo, checkout e policies chamam o entitlement da loja ativa e que a cobrança continua única.
6. Testar leitura pública apenas do conteúdo permitido e negar escrita anônima e escrita cruzada entre proprietários.
7. Conferir que a view pública não expõe dados de assinatura ou Pix.

## Implantação e rollback

Não executar este SQL antes de revisão e autorização expressa. Aplicar em ambiente de teste primeiro e executar os testes acima. O rollback é restaurar o corpo anterior de `store_has_pro_access` do arquivo `supabase/migrations/20261002140000_diamond_access.sql`; a proposta não altera dados ou schema.
