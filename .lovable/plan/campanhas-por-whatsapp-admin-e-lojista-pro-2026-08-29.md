# Campanhas por WhatsApp — Admin e Lojista PRO

Envio por links wa.me (grátis, sem Twilio): o sistema monta a mensagem pronta e abre o WhatsApp de cada contato, um a um, com controle de quem já foi enviado.

## 1. Admin — "Lojas e campanhas"

Nova página em Administração:

- Lista de todas as lojas cadastradas com nome, dono, plano, status, data e WhatsApp.
- Busca por nome/slug e filtros por plano (Free/PRO) e status (ativa/inativa).
- Seleção múltipla de lojas (selecionar todas / por filtro).
- Bloco de campanha com modelos prontos e editáveis:
  - Cupom de desconto (campo do código do cupom e validade)
  - Campanha "Compartilhe e ganhe"
  - Aviso/novidade da plataforma
  - Mensagem livre
- Pré-visualização da mensagem com o nome do lojista preenchido.
- Fila de envio: botão "Abrir WhatsApp" por lojista, marcando automaticamente como enviado e avançando para o próximo; contador "X de Y enviados".

## 2. Lojista PRO — campanha para clientes

Na página Clientes (bloqueada por Paywall para plano Free):

- Filtro "Clientes que compraram" um produto específico (lista de produtos da loja), além de "todos os clientes".
- Seleção múltipla dos clientes filtrados.
- Modelos de mensagem:
  - Produto de volta ao estoque (insere nome do produto e link da vitrine)
  - Promoção/novidade
  - Mensagem livre
- Placeholders automáticos: nome do cliente, nome da loja, nome do produto, link da loja.
- Mesma fila de envio um a um, com contagem de enviados.

## 3. Registro

Cada envio aberto é registrado (quem enviou, para quem, qual campanha) para histórico e para evitar reenvio duplicado na mesma sessão.

## Detalhes técnicos

- Nova tabela `campaign_sends` (store_id nulo para campanhas do admin, destinatário, canal, mensagem, criado_por) com RLS: admin vê tudo via `has_role`, lojista vê apenas os da própria loja.
- Nova rota `/admin/lojas` usando dados de `stores` (já legíveis pelo admin) — reaproveita `AppShell` e `BackButton`.
- Filtro por produto no lojista: consulta `order_items` → `orders` → `customers` da loja, agrupando clientes distintos.
- Mensagens geradas com o helper existente `whatsappLink` em `src/lib/format.ts`; novo módulo `src/lib/campaigns.ts` com os modelos e substituição de placeholders.
- Gate PRO reutiliza a checagem de plano já usada em `cobrancas.tsx` e o componente `Paywall`.
- Nenhuma integração externa nem envio automático — apenas abertura de `wa.me`.
