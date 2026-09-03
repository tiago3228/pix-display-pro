# Plano — Descrição de produto

## Estado atual (verificado no código)

O recurso solicitado **já existe** no Vitrini:

- **Cadastro do produto** (`src/routes/_authenticated/produtos.tsx`): o formulário de "Novo produto" / "Editar produto" já possui o campo **Descrição** (textarea), salvo na coluna `description` da tabela `products`.
- **Vitrine pública** (`src/routes/loja.$slug.tsx`): a descrição já aparece para o cliente em cada card de produto, abaixo do nome.

Ou seja: nenhuma alteração é estritamente necessária para o pedido.

## Melhorias opcionais (implementar somente se aprovado)

1. **Melhorar o campo no cadastro**
   - Aumentar o textarea para 4 linhas e adicionar placeholder explicativo (ex.: "Ex.: Anel de prata 925 com zircônia, tamanho ajustável").
   - Adicionar contador de caracteres (limite sugerido: 300) para manter os cards da vitrine limpos.

2. **Melhorar a exibição na vitrine**
   - Hoje a descrição é cortada em 2 linhas (`line-clamp-2`). Manter assim no card, mas mostrar a descrição completa na mensagem de pedido do WhatsApp ou em uma visualização expandida do produto.

3. **Validação**
   - Nenhuma migration necessária: a coluna `description` já existe e é `not null`.
   - Testar criar/editar produto com descrição e conferir a exibição na vitrine.

## Fora de escopo

- Nenhuma mudança em banco de dados, preços, planos ou layout geral.
