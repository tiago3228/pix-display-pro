# Assinatura PRO: sair do modo de teste e aceitar cartão real

## O que está acontecendo

A assinatura hoje roda no **ambiente de testes** do Mercado Pago (credencial de teste). Nesse ambiente:

- cartão real é **sempre recusado**, mesmo com dados corretos;
- cartão de teste só é aprovado se o **titular for `APRO`**, o **CPF for 123.456.789-09** e o checkout estiver aberto numa **conta de teste compradora**, diferente da conta vendedora;
- usar seu nome, seu e-mail e seu CPF reais junto com o número do cartão de teste faz o Mercado Pago recusar — foi exatamente isso que aconteceu.

Ou seja: não é um erro do Vitrini. Só existem dois caminhos.

## Caminho recomendado: ativar produção

Passar a assinatura PRO para o ambiente real, para que qualquer cartão verdadeiro funcione e a cobrança de R$ 9,90/mês seja de verdade.

O que eu faço:

1. Guardar a credencial de produção do Mercado Pago (`MERCADOPAGO_PROD_ACCESS_TOKEN`) e o segredo de webhook de produção — você me envia pelo campo seguro de segredo.
2. Trocar o ambiente para `live`, mantendo o teste como fallback caso a credencial falte.
3. Ajustar a tela de Assinatura: o aviso de sandbox e os dados de cartão de teste só aparecem em ambiente de teste; em produção some tudo e fica só o texto normal de cobrança recorrente.
4. Validar ponta a ponta: criar a assinatura, conferir o `init_point`, e checar que o webhook de produção atualiza o status para ativo.

Observação: em produção você continua **não podendo assinar com a própria conta vendedora** — para testar de verdade, use outra conta Mercado Pago (ou pague com cartão em conta diferente).

## Caminho alternativo: continuar testando

Se você preferir só validar o fluxo antes de cobrar de verdade, eu adiciono na tela de Assinatura um passo a passo de teste explicando que, no sandbox, os dados pessoais também precisam ser fictícios (titular `APRO`, CPF 123.456.789-09, e-mail da conta de teste), e como criar as contas de teste comprador/vendedor.

## Onde mexo

- `src/lib/mercadopago.server.ts` — seleção de ambiente e credenciais.
- `src/routes/_authenticated/assinatura.tsx` — avisos condicionais ao ambiente.
- `src/routes/api/public/webhooks/mercadopago.ts` — segredo de webhook por ambiente.
