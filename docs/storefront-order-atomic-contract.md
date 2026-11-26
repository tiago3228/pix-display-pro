# Contrato técnico — `create_storefront_order_atomic`

**Status: implementação candidata incluída no SQL de revisão existente e testada em PostgreSQL 16 local descartável. Não foi aplicada nem validada contra o Supabase real ou contra o schema implantado; ainda não está liberada para merge/publicação.** O código local já chama a RPC, portanto não deve ser publicado contra um banco que não ofereça este contrato.

## Objetivo e fronteira da transação

A RPC deve ser a única fronteira de gravação para criação de um pedido da vitrine e alterações de estoque. Deve executar em uma transação PostgreSQL só: localizar/criar o cliente quando houver WhatsApp; atualizar os agregados desse cliente; inserir o pedido e os itens; aplicar os ajustes de estoque; e inserir as parcelas, quando fornecidas. Qualquer erro deve abortar tudo, sem pedido órfão, baixa parcial, cliente atualizado sem pedido ou parcelas incompletas.

O endpoint `submitOrder` calcula preços, itens, frete e regras de parcelamento no servidor. A RPC não deve confiar em valores enviados pelo navegador: sua única chamada deve vir da aplicação server-side autenticada com `service_role`. A função pode operar como `SECURITY INVOKER` sob esse papel. Se for indispensável `SECURITY DEFINER`, a implementação SQL deverá justificar isso, fixar `search_path`, validar cada referência multi-tenant e conceder `EXECUTE` somente ao papel estritamente necessário; não conceder a `PUBLIC`, `anon` ou `authenticated`.

## Interface usada pelo código local

O código chama `supabaseAdmin.rpc("create_storefront_order_atomic", args)` com estes argumentos nomeados:

- `p_order`: objeto com `store_id`, `customer_name`, `customer_whatsapp`, `note`, campos de endereço (`delivery_cep`, `delivery_address`, `delivery_number`, `delivery_complement`, `delivery_neighborhood`, `delivery_city`, `delivery_state`), `delivery_fee`, `delivery_distance_km`, `fulfillment_type`, `delivery_quote_required`, `delivery_config_source`, `delivery_settings_updated_at`, `total`, `payment_declared`, `receipt_path`, `payment_method`, `installments_count` e `status`.
- `p_items`: linhas com `product_id` (nulo para pizza/adicional da pizzaria), `product_name`, `variant_label`, `quantity`, `unit_price` e `subtotal`. Os preços e nomes já foram resolvidos no servidor a partir do cadastro vigente.
- `p_stock_adjustments`: lista de `{ table, id, quantity }`. `table` só pode ser `products` ou `product_variants`; quantidades repetidas do mesmo registro já são agregadas no servidor.
- `p_installments`: lista de `{ installment_number, total_installments, amount, due_date }`; vazia para pedido à vista.
- `p_customer_name` e `p_customer_whatsapp`: dados para compatibilidade com a criação/atualização atual do cliente. WhatsApp vazio significa que não se associa cliente.

A resposta precisa ser uma linha/objeto ou array com o primeiro item contendo `id`, `number` e, quando houver, `customer_id`. O endpoint rejeita uma resposta sem `id` ou `number`.

## Requisitos obrigatórios de integridade

1. Validar formato e consistência dos parâmetros antes de escrever. Confirmar que `p_order.store_id` existe e está ativo; que endereço, tipo de atendimento, taxa, distância e CEP estão coerentes; que `p_order.total` corresponde à soma dos subtotais mais a taxa; que quantidade, preço, parcela e identificadores são válidos. A RPC só deve receber o payload de serviço server-side.
2. Para cotação de entrega da Pizzaria, o servidor calcula distância e autorização geográfica. A RPC bloqueia a configuração correspondente (`pizzeria_settings` no modo `legacy`, `store_delivery_settings` no modo `generic`), e confere timestamp, taxa, habilitação, CEP de origem e se a distância calculada não supera o raio. Se a configuração mudou depois da cotação, aborta e solicita nova tentativa. A RPC não chama serviços externos de CEP nem recalcula coordenadas.
3. Para cada ajuste de estoque, aceitar somente as tabelas explicitamente permitidas, confirmar que o registro pertence a `p_order.store_id`, validar `track_stock` e quantidade positiva, e relacionar uma variação àquele produto/loja. Nunca aceitar um `store_id` de ajuste vindo do cliente.
4. Bloquear as linhas de estoque necessárias (`FOR UPDATE`) em ordem estável e verificar o saldo vigente dentro da transação. Se qualquer item estiver indisponível ou sem saldo suficiente, lançar erro estruturado e fazer rollback integral. O saldo informado pelo endpoint serve apenas para mensagem antecipada; não substitui a verificação sob lock.
5. Criar/atualizar cliente por chave `(store_id, whatsapp)` apenas quando WhatsApp existir. Atualizar `last_order_at`, `orders_count` e `total_spent` na mesma transação e exatamente uma vez por pedido. Preservar clientes e pedidos antigos; não reprocessar nem recalcular registros legados.
6. Inserir pedido, itens e parcelas com os relacionamentos e campos já usados pelo sistema. Validar que o comprovante, se informado, usa o prefixo `receipts/<store_id>/` e corresponde ao objeto esperado; nunca permitir anexar um arquivo de outra loja.
7. Atribuir `customer_id` criado/atualizado ao pedido e às parcelas. Garantir que as parcelas somem exatamente o total do pedido em centavos e não excedam `installments_count`.
8. Falhar de forma explícita sem deixar dados parciais. O endpoint transforma falhas de estoque em mensagem específica e retorna erro genérico para outros erros sem registrar conteúdo privado nos logs.

`store_events`, `audit_logs` e push são efeitos auxiliares feitos pelo código após a RPC retornar sucesso; não participam da transação principal e não devem ser tratados como confirmação da gravação. A falha de notificação não pode desfazer um pedido já confirmado.

## Compatibilidade e rollout

- Antes de publicar este código, implementar a RPC com a assinatura exata e testar em staging contra o schema efetivamente usado pelo aplicativo. Hoje a ausência da RPC fará o checkout falhar para todos os pedidos, não apenas para a Pizzaria.
- A chamada é posterior à revalidação de CEP, raio, distância e taxa no servidor para pedidos da Pizzaria com endereço de entrega. A RPC não substitui essa validação nem deve aceitar taxa do navegador.
- Manter os campos legados de pedido, clientes e parcelas; nenhuma tabela antiga deve ser apagada ou renomeada por esse contrato. O mecanismo transacional deve preencher o mesmo formato que o fluxo atual produz.
- Não remover nem renomear a RPC no rollback. Um rollback seguro de aplicação pode restaurar a versão anterior do endpoint enquanto a função compatível permanece instalada. A estratégia de rollback do SQL deve ser revisada separadamente; não apagar dados já gravados pela nova versão.
- A configuração genérica de entrega (`store_delivery_settings`) e a revogação de leitura pública de `pizzeria_settings` continuam dependentes de SQL revisado, grants e RLS confirmados. Nenhuma política real do Supabase foi consultada neste trabalho.

## Validação local concluída

Em PostgreSQL 16 descartável, a definição extraída da proposta compilou e passou testes de: pedido básico e cliente; produto sem controle de estoque; agregação de ajustes duplicados; baixa de estoque de produto e variações; pedido parcelado com soma exata; cotação de entrega nos modos `legacy` e `generic`; rejeição de cotação desatualizada; isolamento de tenant no ajuste de estoque; saldo insuficiente; caminho de comprovante da loja; rollback integral após falha simulada durante a gravação dos itens; bloqueio de `EXECUTE` para `anon` e `authenticated`; e dois pedidos simultâneos disputando a última unidade, com exatamente um sucesso e saldo não negativo. Também foi validada a ordem da proposta em que a função é criada antes de `fulfillment_type`, desde que a coluna seja adicionada antes do primeiro uso.

Foi detectado que a migration versionada de `pizzeria_settings` define `updated_at` apenas com `DEFAULT now()`, sem trigger, e o painel atual faz `upsert` sem enviar esse campo. Por isso a proposta existente agora adiciona um trigger `BEFORE UPDATE` que usa `public.set_updated_at()`; o teste local confirmou que a mudança da configuração invalida uma cotação antiga.

**Limite:** o fixture reproduz as colunas das migrations versionadas e os campos de entrega informados pelo usuário. Não representa as policies/grants/triggers do projeto Supabase, que não foram consultadas, nem substitui teste de integração contra uma cópia de staging do schema implantado. As migrations versionadas não contêm `orders.delivery_fee`, `orders.delivery_distance_km` nem `pizzeria_settings.delivery_enabled`, `delivery_origin_cep`, `delivery_radius_km` e `delivery_fee`; esses campos aparecem no snapshot informado pelo usuário e precisam ser confirmados no ambiente de teste antes de qualquer aplicação.

## Testes exigidos em ambiente descartável

1. Pedido comum à vista: pedido, itens, cliente e total corretos; nenhum ajuste de estoque quando `track_stock` estiver desativado.
2. Pedido com produto/variação monitorados: estoque correto, inclusive com duas linhas do mesmo item agregadas.
3. Dois pedidos concorrentes pelo último item: exatamente um sucesso; o outro recebe erro de estoque; nunca saldo negativo.
4. Falha provocada após cada etapa de escrita: nenhum pedido, item, cliente atualizado, estoque baixado ou parcela parcial permanece.
5. Pedido parcelado: valor e datas das parcelas compatíveis; soma em centavos igual ao pedido; falha na parcela reverte o pedido inteiro.
6. Pedido de Pizzaria com CEP permitido, fora do raio, taxa alterada depois da cotação e retirada; confirmar recálculo server-side e preservar pedidos antigos.
7. Duas lojas: tentar combinar `store_id` da loja A com produto, variação, cliente, estoque ou comprovante da loja B; todas as tentativas devem falhar sem retornar dados de B.
8. Permissões diretas: chamada da RPC por `anon` e `authenticated` deve ser negada; apenas o caminho server-side autorizado pode executá-la.
9. Compatibilidade: consultar pedidos antigos, abrir detalhes, comprovantes e relatórios após a implantação, sem reescrita ou exclusão de registros.
10. RLS real, grants e policies de cada tabela devem ser inventariados no ambiente de teste e comparados às migrations. Testes de unidade locais não substituem essa verificação.
