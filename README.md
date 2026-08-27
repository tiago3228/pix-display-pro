# Vitrine Rápida

Quero que você desenvolva um SaaS web completo, moderno, responsivo e funcional para pequenos vendedores que atualmente vendem produtos pelo WhatsApp, pessoalmente, dentro de empresas, condomínios, escolas, igrejas, eventos ou por redes sociais, mas ainda controlam seus produtos e pedidos de maneira manual.

IMPORTANTE:
Este projeto NÃO deve ser limitado a doces.

Os primeiros casos de uso serão:
- Doces
- Joias
- Roupas

Mas a arquitetura deve permitir futuramente:
- Cosméticos
- Bolsas
- Calçados
- Artesanato
- Comidas
- Bebidas
- Produtos personalizados
- Acessórios
- Produtos de beleza
- Presentes
- Produtos feitos sob encomenda
- Outros produtos físicos em geral

A ideia central é:

VENDEDOR CADASTRA PRODUTOS
↓
SISTEMA CRIA UMA VITRINE ONLINE
↓
VENDEDOR COMPARTILHA O LINK OU QR CODE
↓
CLIENTE ACESSA SEM PRECISAR CRIAR CONTA
↓
ESCOLHE UM OU VÁRIOS PRODUTOS
↓
MONTA O CARRINHO
↓
VÊ O TOTAL
↓
COPIA A CHAVE PIX DO VENDEDOR
↓
FAZ O PAGAMENTO
↓
CLICA EM "PEDIR PELO WHATSAPP"
↓
WHATSAPP ABRE COM O PEDIDO AUTOMATICAMENTE MONTADO

O produto deve ser extremamente simples para o cliente e extremamente simples para o vendedor.

==================================================
1. OBJETIVO DO PRODUTO
==================================================

Criar uma plataforma SaaS que funcione como uma "mini loja online" para pessoas que vendem produtos, mas não precisam ou não querem montar um e-commerce tradicional.

A proposta comercial do sistema é:

"Crie sua vitrine online, receba pedidos pelo WhatsApp e venda através de um QR Code."

O vendedor não precisa criar um site próprio.

Cada vendedor terá sua própria vitrine pública, por exemplo:

/loja/nome-do-vendedor

ou

/nome-do-vendedor

A URL deve ser amigável e baseada em um slug único.

Exemplo:

/loja/juliana-joias

/loja/ana-doces

/loja/carla-moda

==================================================
2. MODELO DE NEGÓCIO
==================================================

O sistema será um SaaS multi-tenant.

Cada vendedor é um tenant independente.

Um vendedor jamais poderá visualizar ou modificar dados de outro vendedor.

Plano inicial:

PLANO GRATUITO:
- Criar conta
- Criar vitrine
- Cadastrar até 5 produtos
- Receber pedidos pelo WhatsApp
- Chave Pix
- QR Code
- Link público da loja

PLANO PRO:
R$ 9,90/mês

Recursos:
- Produtos ilimitados
- Fotos dos produtos
- Variações
- Controle de estoque
- Histórico de pedidos
- Relatórios básicos
- QR Codes individuais
- Personalização da loja
- Recursos adicionais que forem implementados

IMPORTANTE:
A arquitetura de cobrança deve ficar preparada para assinatura recorrente, mas NÃO inventar uma integração de pagamento se ela ainda não estiver configurada.

Criar a estrutura para futuramente integrar um gateway de pagamento/assinatura.

NÃO cobrar comissão sobre as vendas dos vendedores.

O vendedor paga uma mensalidade fixa.

==================================================
3. TECNOLOGIA
==================================================

Utilize uma arquitetura moderna e adequada para SaaS.

Preferencialmente:

- React
- TypeScript
- Vite ou stack equivalente suportada pelo Lovable
- Tailwind CSS
- shadcn/ui
- Backend real
- PostgreSQL
- Autenticação real
- Row Level Security quando aplicável
- Storage para imagens
- API real
- Banco de dados persistente

NÃO construir apenas um protótipo visual.

Todos os principais fluxos devem funcionar de verdade.

Se o projeto utilizar Lovable Cloud, utilizar os recursos reais disponíveis de banco, autenticação, storage e backend.

==================================================
4. PRINCÍPIO FUNDAMENTAL
==================================================

Existem DOIS ambientes completamente diferentes:

A) ÁREA PÚBLICA DO CLIENTE
B) PAINEL PRIVADO DO VENDEDOR

O CLIENTE NÃO PRECISA CRIAR CONTA.

Isso é fundamental.

O comprador deve conseguir:

QR CODE
→ abrir loja
→ escolher produto
→ adicionar ao carrinho
→ informar variações
→ ver total
→ copiar Pix
→ abrir WhatsApp

sem login.

==================================================
5. AUTENTICAÇÃO DO VENDEDOR
==================================================

Criar:

/login

/signup

/recuperar-senha

O vendedor poderá criar conta utilizando:

- Nome
- E-mail
- Senha
- WhatsApp

Após criar a conta, direcionar para o onboarding.

==================================================
6. ONBOARDING DO VENDEDOR
==================================================

Após criar a conta, mostrar um processo simples de configuração.

Etapa 1:

"Vamos criar sua loja."

Campos:

- Nome da loja
- Nome do vendedor
- Descrição
- WhatsApp
- Foto/logo
- Categoria principal

Categorias sugeridas:

- Doces
- Roupas
- Joias e acessórios
- Cosméticos
- Alimentação
- Artesanato
- Beleza
- Outros

Etapa 2:

Configurar pagamento.

Campos:

Tipo da chave Pix:

- CPF
- CNPJ
- E-mail
- Telefone
- Chave aleatória

Campo:

"Chave Pix"

Salvar essas informações na conta/loja.

Etapa 3:

Cadastrar primeiro produto.

Ao finalizar:

"Pronto! Sua loja está criada."

Mostrar:

- Link da loja
- QR Code
- Botão compartilhar WhatsApp
- Botão acessar minha loja

==================================================
7. DASHBOARD DO VENDEDOR
==================================================

Criar um dashboard limpo e simples.

Não transformar o sistema em um ERP.

O vendedor precisa entender tudo rapidamente.

Dashboard:

"Olá, [nome]!"

Cards:

- Vendas hoje
- Pedidos hoje
- Total de pedidos
- Produtos ativos

Mostrar também:

"Minha loja"

com:

- link público
- botão copiar link
- botão abrir loja
- botão gerar QR Code

Se não houver pedidos:

"Você ainda não recebeu pedidos."

Mostrar botão:

"Cadastrar produto"

==================================================
8. MENU DO VENDEDOR
==================================================

Menu lateral ou inferior responsivo:

- Dashboard
- Produtos
- Pedidos
- Minha Loja
- QR Codes
- Clientes
- Configurações
- Assinatura

Em dispositivos móveis, transformar em navegação adequada para celular.

==================================================
9. PRODUTOS
==================================================

Criar CRUD completo de produtos.

Campos:

- Nome
- Descrição
- Foto
- Preço
- SKU opcional
- Estoque
- Controle de estoque ativado/desativado
- Produto disponível
- Produto em destaque
- Categoria
- Variações
- Ordem de exibição

Exemplo:

Nome:
Brownie Tradicional

Descrição:
Brownie artesanal de chocolate.

Preço:
R$ 6,00

Estoque:
20

Disponível:
SIM

==================================================
10. PRODUTOS COM VARIAÇÕES
==================================================

O sistema precisa suportar produtos simples e produtos com variações.

Exemplo de ROUPA:

Produto:
Blusa Feminina

Preço:
R$ 59,90

Variações:

Tamanho:
P
M
G
GG

Cor:
Preto
Branco
Azul

Cada combinação poderá ter estoque próprio.

Exemplo:

Preto / P = 2
Preto / M = 4
Preto / G = 1

Branco / P = 3
Branco / M = 2

O cliente deve escolher obrigatoriamente as variações necessárias antes de adicionar ao carrinho.

==================================================
11. PRODUTOS COM ESTOQUE INDIVIDUAL
==================================================

Para joias e produtos únicos.

Exemplo:

Brinco Dourado

Estoque:
1

Após o vendedor marcar como vendido ou o sistema registrar uma venda, o produto pode ficar automaticamente como indisponível, conforme configuração.

Mostrar:

"Última unidade"

quando estoque = 1.

Quando estoque = 0:

"Esgotado"

==================================================
12. CONTROLE DE DISPONIBILIDADE
==================================================

Todo produto deve possuir:

Disponível
Esgotado
Oculto

O vendedor poderá simplesmente ativar/desativar um produto.

Exemplo:

Produto:
Brownie

[Disponível]

Ao clicar:

[Esgotado]

Isso deve refletir imediatamente na loja pública.

==================================================
13. CATEGORIAS
==================================================

Permitir criar categorias.

Exemplos:

Doces
Roupas
Joias
Acessórios
Cosméticos

A loja pública deve poder apresentar:

Todos
Doces
Roupas
Joias

etc.

==================================================
14. VITRINE PÚBLICA
==================================================

Essa é uma das partes MAIS IMPORTANTES do projeto.

Criar uma página pública extremamente bonita, simples e rápida.

Exemplo:

/loja/juliana-joias

Topo:

[LOGO]

Juliana Joias

"Joias e acessórios"

WhatsApp

Instagram opcional

Depois:

Categorias

Todos | Novidades | Promoções

Produtos em cards.

Cada card:

Foto
Nome
Descrição curta
Preço
Disponibilidade
Botão:

"Adicionar"

==================================================
15. EXPERIÊNCIA MOBILE
==================================================

A maioria dos clientes acessará pelo celular.

Portanto:

MOBILE FIRST.

A loja pública deve ser excelente em smartphones.

Não criar uma interface de desktop simplesmente reduzida.

Criar uma experiência específica para celular.

==================================================
16. CARRINHO
==================================================

O cliente poderá adicionar vários produtos.

Exemplo:

2x Brigadeiro
1x Brownie
1x Bolo de pote

Ou:

1x Brinco Dourado
1x Colar
2x Pulseira

Ou:

1x Blusa preta M
1x Blusa branca G

O carrinho deve mostrar:

Produto
Variação
Quantidade
Preço unitário
Subtotal

No final:

TOTAL

Criar botões:

+
-

Remover

Continuar comprando

Finalizar pedido

==================================================
17. PEDIDO
==================================================

Antes de enviar ao WhatsApp, mostrar uma tela de resumo.

Exemplo:

"Confira seu pedido"

2x Brigadeiro
R$ 6,00

1x Brownie
R$ 6,00

1x Bolo de pote
R$ 8,00

----------------

TOTAL
R$ 20,00

Depois:

"Pagamento"

Chave Pix:

juliana@email.com

Botão:

📋 COPIAR CHAVE PIX

Ao clicar:

"Chave Pix copiada!"

Não afirmar que o pagamento foi realizado automaticamente.

Criar também:

"Já fiz o pagamento"

Esse botão deve ser opcional.

==================================================
18. WHATSAPP
==================================================

Essa é uma funcionalidade central.

Criar botão:

"PEDIR PELO WHATSAPP"

Ao clicar, abrir o WhatsApp do vendedor.

Utilizar o número cadastrado pelo vendedor.

A mensagem deve ser automaticamente montada.

Exemplo:

Olá, Juliana! 😊

Gostaria de fazer este pedido:

💎 1x Brinco Dourado — R$ 39,90
📿 1x Colar Elegance — R$ 59,90

💰 Total: R$ 99,80

Já realizei o pagamento via Pix.

A mensagem deve ser gerada dinamicamente.

Se o cliente não tiver clicado em "Já fiz o pagamento", usar:

"Vou realizar o pagamento via Pix."

OU

"Gostaria de confirmar este pedido."

Não declarar pagamento realizado sem que o cliente tenha informado isso.

==================================================
19. QR CODE
==================================================

Cada vendedor deve possuir um QR Code principal.

Esse QR Code direciona diretamente para:

/loja/[slug]

Criar uma página de QR Code no painel.

Mostrar:

"QR Code da sua loja"

Botões:

- Baixar PNG
- Imprimir
- Compartilhar
- Copiar link

Criar também QR Codes individuais para produtos no plano PRO.

Exemplo:

QR Code do Brownie.

Ao escanear:

abre diretamente a página do produto.

==================================================
20. QR CODE PARA IMPRESSÃO
==================================================

Criar uma visualização bonita para impressão.

Exemplo:

--------------------------------

[LOGO]

CONHEÇA MINHA LOJA

Escaneie o QR Code

[ QR CODE ]

Veja produtos
Faça seu pedido
Pague via Pix

--------------------------------

Permitir gerar uma versão adequada para impressão.

==================================================
21. COMPARTILHAMENTO PELO WHATSAPP
==================================================

Criar botão:

"Compartilhar minha loja"

Ao clicar, gerar mensagem:

"Oi! 😊

Confira minha loja online:

[LINK]

Você pode escolher os produtos e fazer seu pedido pelo WhatsApp."

Abrir compartilhamento/WhatsApp quando suportado.

==================================================
22. PEDIDOS NO PAINEL
==================================================

O vendedor deve visualizar pedidos recebidos.

Cada pedido:

Número
Data
Cliente
Produtos
Quantidade
Total
Status

Status:

- Novo
- Em negociação
- Pagamento informado
- Confirmado
- Entregue
- Cancelado

O vendedor poderá alterar o status.

==================================================
23. IMPORTANTE SOBRE O WHATSAPP
==================================================

Como o pedido é enviado pelo WhatsApp, o sistema não deve fingir que existe integração oficial de WhatsApp Business se ela não estiver configurada.

Inicialmente utilizar o mecanismo de abertura do WhatsApp com mensagem pré-preenchida.

Não inventar APIs.

Não criar integrações falsas.

==================================================
24. CLIENTES
==================================================

Como o cliente não precisa criar conta, não obrigar cadastro.

Porém, preparar estrutura para futuramente armazenar:

- Nome
- WhatsApp
- Histórico de pedidos
- Total comprado
- Data do último pedido

Inicialmente isso pode ser criado apenas quando o cliente fornecer o nome/telefone no processo do pedido.

==================================================
25. CONFIGURAÇÕES DA LOJA
==================================================

Criar página:

"Minha Loja"

Campos:

- Nome
- Logo
- Descrição
- WhatsApp
- Instagram
- Categoria
- Chave Pix
- Cor principal
- Mensagem de boas-vindas

Exemplo:

"Olá! Seja bem-vindo à minha loja. 😊"

==================================================
26. PERSONALIZAÇÃO
==================================================

Não permitir uma customização exagerada.

Manter o sistema profissional.

Permitir no máximo:

- Logo
- Cor principal
- Foto/banner
- Nome
- Descrição

A vitrine deve manter uma identidade visual consistente.

==================================================
27. PAGAMENTO PIX
==================================================

Na primeira versão NÃO é necessário integrar diretamente com bancos.

O vendedor cadastra sua chave Pix.

O cliente:

1. Visualiza a chave.
2. Clica em copiar.
3. Faz o pagamento no aplicativo bancário.
4. Volta para a loja.
5. Clica em "Já fiz o pagamento".
6. Envia o pedido pelo WhatsApp.

O sistema deve deixar claro:

"Pagamento realizado diretamente para o vendedor."

Não guardar dinheiro do cliente.

Não criar carteira digital.

Não criar sistema financeiro próprio.

==================================================
28. ASSINATURA DO SAAS
==================================================

Criar página:

"Meu Plano"

Mostrar:

Plano atual

Gratuito
ou
PRO — R$ 9,90/mês

Mostrar benefícios.

Criar botão:

"Assinar PRO"

Deixar estrutura preparada para integração com gateway de pagamento.

Não implementar pagamento falso.

==================================================
29. BANCO DE DADOS
==================================================

Criar estrutura real e normalizada.

Entidades sugeridas:

users
stores
products
product_categories
product_variants
product_variant_options
orders
order_items
customers
pix_settings
subscriptions
qr_codes

Relacionamentos devem ser reais.

Cada entidade relacionada a vendedor/loja deve possuir tenant/store_id adequado.

Garantir isolamento entre vendedores.

==================================================
30. SEGURANÇA
==================================================

Segurança é prioridade.

Implementar:

- autenticação real;
- autorização;
- isolamento por vendedor;
- proteção das rotas privadas;
- validação dos dados;
- regras de acesso;
- RLS quando suportado;
- não expor dados privados;
- não expor senha;
- não expor dados de outros vendedores.

A loja pública pode mostrar apenas os dados necessários para venda.

Nunca mostrar:

- senha;
- informações administrativas;
- dados internos;
- histórico privado;
- informações de outros vendedores.

==================================================
31. DESIGN
==================================================

O design deve transmitir:

Simplicidade
Confiança
Modernidade
Velocidade
Pequeno negócio
Tecnologia acessível

Evitar aparência de sistema corporativo pesado.

O cliente deve olhar e entender imediatamente:

"O que essa pessoa vende?"
"Quanto custa?"
"Como comprar?"

O botão principal deve ser muito evidente.

==================================================
32. IDENTIDADE VISUAL
==================================================

Criar uma identidade visual moderna e neutra, pois o sistema atenderá diferentes tipos de vendedores.

Não utilizar uma identidade exclusivamente relacionada a doces.

O sistema deve funcionar visualmente tanto para:

🍫 doces

quanto:

💎 joias

👗 roupas

🧴 cosméticos

🥪 alimentos

etc.

==================================================
33. LANDING PAGE
==================================================

Criar uma landing page para vender o SaaS.

Headline:

"Venda seus produtos de um jeito mais simples."

Subheadline:

"Crie sua vitrine online, compartilhe seu QR Code, receba pedidos pelo WhatsApp e facilite o pagamento via Pix."

CTA:

"Criar minha loja grátis"

Segundo CTA:

"Ver como funciona"

Criar seção:

"Como funciona"

1. Crie sua loja
2. Cadastre seus produtos
3. Compartilhe seu QR Code
4. Receba pedidos pelo WhatsApp

Seção:

"Feito para quem vende"

Cards:

🍫 Doces
💎 Joias
👗 Roupas
🧴 Cosméticos
🎁 Artesanato
🍔 Comidas

Texto:

"E muito mais."

==================================================
34. PREÇO
==================================================

Na landing page:

GRÁTIS

Comece sem pagar.

PRO

R$ 9,90
/mês

"Sem comissão sobre suas vendas."

Isso deve ser extremamente visível.

==================================================
35. FAQ
==================================================

Criar perguntas:

Preciso instalar algum aplicativo?

Não. Sua loja funciona diretamente pelo navegador.

Meu cliente precisa criar conta?

Não.

O pedido chega onde?

Diretamente no seu WhatsApp.

Como recebo o pagamento?

O cliente paga diretamente para você usando sua chave Pix.

Vocês cobram comissão?

Não. O plano possui mensalidade fixa.

Posso vender roupas?

Sim.

Posso vender doces?

Sim.

Posso vender joias?

Sim.

Posso vender outros produtos?

Sim.

==================================================
36. ADMINISTRADOR DA PLATAFORMA
==================================================

Criar estrutura para administrador global do SaaS.

O administrador poderá futuramente visualizar:

- total de vendedores;
- vendedores ativos;
- assinantes PRO;
- receita recorrente;
- lojas criadas;
- pedidos realizados;
- usuários;
- planos.

Não permitir que vendedores comuns acessem essa área.

==================================================
37. ANALYTICS
==================================================

Preparar estrutura para métricas:

- visualizações da loja;
- visualizações de produtos;
- produtos adicionados ao carrinho;
- pedidos iniciados;
- pedidos enviados ao WhatsApp;
- produtos mais visualizados;
- produtos mais vendidos.

Não precisa implementar todas as métricas avançadas inicialmente, mas estruturar o projeto para permitir isso no futuro.

==================================================
38. EXPERIÊNCIA DO CLIENTE
==================================================

O cliente deve conseguir comprar em poucos segundos.

Exemplo:

QR Code
↓
Loja
↓
Produto
↓
Adicionar
↓
Carrinho
↓
Pix
↓
WhatsApp

Não pedir:

- login;
- senha;
- cadastro;
- e-mail obrigatório;
- instalação de aplicativo.

Quanto menos atrito, melhor.

==================================================
39. EXPERIÊNCIA DO VENDEDOR
==================================================

Um vendedor que não entende de tecnologia deve conseguir criar sua loja.

Fluxo:

Cadastrar
↓
Nome da loja
↓
WhatsApp
↓
Pix
↓
Produto
↓
QR Code
↓
Começar a vender

O onboarding deve ser muito simples.

==================================================
40. RESPONSIVIDADE
==================================================

O sistema deve funcionar perfeitamente em:

- celular;
- tablet;
- notebook;
- desktop.

Prioridade:

CELULAR.

==================================================
41. ACESSIBILIDADE
==================================================

Implementar:

- bom contraste;
- botões grandes;
- textos legíveis;
- labels claros;
- feedback visual;
- estados de loading;
- mensagens de erro amigáveis;
- navegação adequada por teclado quando aplicável.

==================================================
42. ESTADOS DO SISTEMA
==================================================

Criar estados adequados para:

- carregando;
- vazio;
- erro;
- sucesso;
- produto esgotado;
- loja inexistente;
- loja desativada;
- produto inexistente.

Exemplo:

"Esta loja não está disponível no momento."

==================================================
43. SEO
==================================================

As páginas públicas das lojas devem possuir SEO básico.

Título:

"Juliana Joias | Loja Online"

Descrição baseada nos dados da loja.

Utilizar URLs amigáveis.

==================================================
44. PWA / INSTALAÇÃO FUTURA
==================================================

Estruturar o projeto de forma que futuramente possa funcionar como PWA.

Mas não obrigar o cliente a instalar.

O sistema deve funcionar perfeitamente pelo navegador.

==================================================
45. IMPORTANTE: NÃO SUPERCOMPLICAR O MVP
==================================================

Não adicionar funcionalidades que não foram solicitadas apenas para deixar o sistema maior.

O MVP deve focar em:

VENDEDOR
→ CADASTRA PRODUTOS
→ CRIA VITRINE
→ QR CODE

CLIENTE
→ ACESSA
→ ESCOLHE
→ CARRINHO
→ PIX
→ WHATSAPP

Esse é o coração do produto.

==================================================
46. PRODUTO FUTURO
==================================================

Arquitetar para permitir futuramente:

- domínio personalizado;
- integração real com Pix;
- Pix Copia e Cola;
- QR Code Pix dinâmico;
- pagamento online;
- integração oficial WhatsApp Business;
- notificações;
- cupons;
- promoções;
- descontos;
- clientes recorrentes;
- favoritos;
- avaliações;
- estoque avançado;
- relatórios;
- exportação Excel/CSV;
- impressão de pedidos;
- integração Instagram;
- catálogo compartilhável;
- campanhas;
- assinatura automática;
- múltiplos vendedores por empresa;
- marketplace.

Mas NÃO implementar tudo isso agora.

==================================================
47. REGRA DE OURO DO PROJETO
==================================================

Não criar apenas telas bonitas.

Tudo que for implementado deve estar conectado ao backend real quando necessário.

Exemplo:

Cadastrar produto
→ salvar no banco.

Editar produto
→ atualizar banco.

Excluir produto
→ banco.

Alterar estoque
→ banco.

Criar pedido
→ banco.

Alterar status
→ banco.

Criar conta
→ autenticação real.

Chave Pix
→ banco.

Loja pública
→ buscar dados reais.

QR Code
→ URL real.

==================================================
48. DADOS DE TESTE
==================================================

Criar dados de demonstração apenas se necessário para visualizar o sistema.

Utilizar exemplos:

LOJA 1:
Ana Doces

Produtos:
Brigadeiro
Brownie
Bolo de pote
Cookie

LOJA 2:
Juliana Joias

Produtos:
Brinco Dourado
Colar Elegance
Pulseira

LOJA 3:
Carla Moda

Produtos:
Blusa Feminina
Calça Jeans
Vestido

Esses dados servem apenas para teste.

==================================================
49. TESTES
==================================================

Depois de implementar, testar os principais fluxos.

TESTE 1:
Criar vendedor.

TESTE 2:
Cadastrar loja.

TESTE 3:
Cadastrar chave Pix.

TESTE 4:
Cadastrar produto.

TESTE 5:
Abrir URL pública.

TESTE 6:
Adicionar produto ao carrinho.

TESTE 7:
Adicionar vários produtos.

TESTE 8:
Selecionar variações.

TESTE 9:
Calcular total.

TESTE 10:
Copiar chave Pix.

TESTE 11:
Gerar pedido.

TESTE 12:
Abrir WhatsApp com mensagem correta.

TESTE 13:
Ver pedido no painel.

TESTE 14:
Alterar status.

TESTE 15:
Testar produto esgotado.

TESTE 16:
Testar isolamento entre dois vendedores.

==================================================
50. RESULTADO FINAL ESPERADO
==================================================

Quero um SaaS funcional chamado provisoriamente:

[DEFINIR NOME DO PRODUTO]

Não precisa ficar preso a "doces".

A plataforma deve permitir que qualquer pequeno vendedor crie sua própria mini loja.

O conceito principal é:

"Você vende pelo WhatsApp.
Nós organizamos sua vitrine."

A experiência ideal:

VENDEDOR:

Cria conta
→
Cria loja
→
Cadastra produto
→
Cadastra Pix
→
Recebe QR Code
→
Compartilha
→
Recebe pedidos.

CLIENTE:

Escaneia QR Code
→
Entra na loja
→
Escolhe produtos
→
Monta carrinho
→
Vê total
→
Copia Pix
→
Paga
→
Clica em pedir
→
WhatsApp abre automaticamente.

==================================================
51. ORDEM DE IMPLEMENTAÇÃO
==================================================

Não tente construir tudo de uma vez sem validar cada etapa.

Implemente nesta ordem:

FASE 1:
Estrutura do projeto + banco + autenticação.

FASE 2:
Cadastro/onboarding do vendedor.

FASE 3:
CRUD de produtos.

FASE 4:
Vitrine pública.

FASE 5:
Carrinho.

FASE 6:
Chave Pix + botão copiar.

FASE 7:
Integração de pedido com WhatsApp.

FASE 8:
Pedidos no painel.

FASE 9:
QR Code.

FASE 10:
Plano gratuito/PRO e estrutura de assinatura.

FASE 11:
Dashboard e métricas básicas.

FASE 12:
Testes completos e correções.

==================================================
52. REGRA FINAL
==================================================

Antes de considerar o projeto concluído:

- verificar erros de TypeScript;
- verificar erros de build;
- verificar erros de console;
- verificar autenticação;
- verificar banco;
- verificar permissões;
- verificar RLS;
- verificar rotas públicas;
- verificar rotas privadas;
- verificar WhatsApp;
- verificar geração de QR Code;
- verificar Pix;
- verificar carrinho;
- verificar estoque;
- verificar responsividade.

Não considerar uma funcionalidade pronta apenas porque a interface foi criada.

Uma funcionalidade só deve ser considerada pronta quando o fluxo completo funcionar.

PRIORIDADE ABSOLUTA:

Simplicidade para o comprador.
Simplicidade para o vendedor.
Velocidade.
Mobile first.
Backend real.
Segurança.
Arquitetura multi-tenant.
Escalabilidade.

Comece analisando a arquitetura necessária e implemente o projeto de forma incremental, validando cada fase antes de avançar para a próxima.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://pix-display-pro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/efd353a4-6bab-489e-898c-3fd8f231e668).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
