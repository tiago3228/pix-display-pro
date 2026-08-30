# Estoque, Faturamento, Preços de assinatura e Banner editável

## 0. Finalizar campanhas por WhatsApp (pendente da rodada anterior)

A página administrativa de lojas e campanhas já existe, mas falta: link para ela na tela de Administração e o bloco de campanha (PRO) na página Clientes com filtro por produto comprado. Entra nesta rodada.

## 1. Controle de estoque

Hoje o produto já tem quantidade e a vitrine mostra "última unidade"/"esgotado", mas o pedido **não valida nem baixa o estoque**.

- Exibir a quantidade disponível no card e na página do produto ("3 unidades disponíveis"), quando o controle de estoque estiver ligado.
- Limitar a quantidade escolhida no carrinho ao disponível (produto e variação).
- Validar novamente no servidor ao enviar o pedido: se faltou estoque, o pedido é recusado com mensagem clara indicando o produto.
- Baixar o estoque automaticamente ao concluir o pedido (produto simples e variação), somente para produtos com controle de estoque ativo.
- Ao cancelar um pedido no painel, devolver o estoque das unidades daquele pedido.

## 2. Faturamento do Administrador

Nova página **Administração → Faturamento**:

- Totais do período: valor faturado, número de assinaturas/vendas, ticket médio.
- Origem dos valores: assinaturas pagas pelo cartão, aprovações do PRO via Pix e lançamentos manuais.
- Filtros: Hoje, 7 dias, 30 dias, Este mês, Este ano e Personalizado (data inicial/final).
- Gráfico/linha por dia dentro do período e uma lista dos lançamentos.
- Botão **Adicionar venda manual**: valor, data, forma de pagamento (Pix, dinheiro, cartão, outro), loja/cliente relacionado (opcional) e observação. Aparece no total e pode ser excluído.

## 3. Faturamento do cliente PRO

Nova página **Faturamento** no menu do lojista (bloqueada por Paywall no plano Free):

- Total vendido, número de vendas e ticket médio no período.
- Mesmos filtros de período (hoje, 7, 30 dias, mês, ano, personalizado).
- Soma pedidos feitos pela plataforma (exceto cancelados) + vendas registradas manualmente.
- Botão **Registrar venda manual**: valor, data, cliente (opcional), forma de pagamento e observação; pode editar/excluir.
- Lista unificada com etiqueta indicando se veio da vitrine ou foi manual.

## 4. Preços das assinaturas e promoções

- Nova área **Administração → Preço do PRO**: preço normal, preço promocional (ou percentual de desconto), rótulo da promoção ("Promoção relâmpago"), início e fim da validade e liga/desliga.
- O preço mostrado na landing, na tela de Assinatura e no Pix do PRO passa a vir dessa configuração, com o preço antigo riscado e o selo de desconto durante a promoção.
- A cobrança (cartão e valor do Pix) usa o preço vigente no momento da contratação; assinaturas já ativas não mudam de valor.
- Fora da janela de validade, volta automaticamente ao preço normal.

## 5. Banner principal da página pública

- Nova área **Administração → Banner da divulgação**: título, subtítulo/descrição, texto do botão, link do botão, selo opcional e imagem de fundo (upload) com opção de restaurar o padrão.
- A página inicial pública passa a ler esses textos automaticamente (com o conteúdo atual como padrão caso nada esteja configurado).
- Pré-visualização na própria tela de administração antes de salvar.

## Detalhes técnicos

- Migrações novas:
  - `platform_sales` (lançamentos manuais do admin: amount, sold_at, method, store_id opcional, note, created_by) — RLS somente admin via `has_role`.
  - `manual_sales` (vendas manuais do lojista: store_id, amount, sold_at, customer_name, method, note) — RLS por dono da loja.
  - `plan_pricing` (linha única: base_price, promo_price, promo_percent, promo_label, promo_starts_at, promo_ends_at, is_promo_active) — leitura pública (anon/authenticated), escrita só admin.
  - `landing_settings` (linha única: title, subtitle, cta_label, cta_href, badge, image_url) — leitura pública, escrita só admin.
  - Índices por data em `platform_sales.sold_at` e `manual_sales.(store_id, sold_at)`.
- Estoque: validação e baixa dentro de `submitOrder` em `src/lib/storefront.functions.ts`, usando o cliente admin já existente e leitura dos estoques na mesma transação lógica (checagem imediatamente antes do insert, com `update ... where stock >= qty` para evitar venda duplicada). Devolução de estoque no `updateStatus` de `pedidos.tsx` via nova server fn.
- Faturamento admin: server fn com verificação `has_role('admin')` agregando `subscription_payments` (status pago), `pro_pix_requests` aprovadas e `platform_sales`.
- Faturamento lojista: server fn com `requireSupabaseAuth`, agregando `orders` da loja + `manual_sales`; gate PRO igual ao usado em Cobranças.
- Preço: `PRO_PLAN_PRICE` deixa de ser fixo — vira função de leitura via server fn pública com cache curto; `pro-pix.functions.ts`, `mercadopago.server.ts`, landing e `assinatura.tsx` passam a consultar o preço vigente.
- Banner: server fn pública lida no loader da rota `/` (SSR), com fallback para os textos atuais; upload de imagem no bucket `store-assets` existente com URL assinada.
- Novas rotas: `/admin/faturamento`, `/admin/precos`, `/admin/banner`, `/faturamento`, mais links no `AppShell` (admin e lojista) e cartões de atalho na tela de Administração.
