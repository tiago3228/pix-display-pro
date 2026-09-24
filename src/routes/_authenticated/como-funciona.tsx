import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CreditCard,
  BellRing,
  HelpCircle,
  ImagePlus,
  Megaphone,
  Package,
  QrCode,
  Settings,
  ShoppingCart,
  Shirt,
  Sparkles,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona | Vitrini" },
      {
        name: "description",
        content:
          "Aprenda a configurar sua loja, publicar produtos e começar a vender com o Vitrini.",
      },
    ],
  }),
  component: ComoFunciona,
});

type TutorialStep = {
  title: string;
  description: string;
  details: string[];
  to:
    | "/dashboard"
    | "/onboarding"
    | "/minha-loja"
    | "/produtos"
    | "/produtos-ia"
    | "/roupas-esportivas"
    | "/pedidos"
    | "/cobrancas"
    | "/qrcodes"
    | "/clientes"
    | "/faturamento"
    | "/assinatura"
    | "/lojas-premium"
    | "/feedback"
    | "/configuracoes";
  action: string;
};

type TutorialSection = {
  number: string;
  title: string;
  description: string;
  icon: typeof Store;
  steps: TutorialStep[];
};

const SECTIONS: TutorialSection[] = [
  {
    number: "1",
    title: "Comece pelo cadastro e pela identidade da loja",
    description:
      "Antes de divulgar, deixe os dados básicos corretos para que o cliente reconheça seu negócio e consiga entrar em contato.",
    icon: Store,
    steps: [
      {
        title: "Complete o cadastro inicial",
        description: "Crie ou finalize a loja informando o nome, segmento e dados do proprietário.",
        details: [
          "Escolha um nome fácil de reconhecer e compartilhar.",
          "Informe o segmento correto para apresentar melhor sua vitrine.",
          "Finalize o onboarding para liberar todos os menus do painel.",
        ],
        to: "/onboarding",
        action: "Ir para o cadastro inicial",
      },
      {
        title: "Personalize sua Minha Loja",
        description: "Configure logo, banner, descrição, WhatsApp, Instagram, Pix e aparência.",
        details: [
          "Use uma logo nítida e um banner que represente sua marca.",
          "Revise o slug: ele forma o endereço público /s/nome-da-loja.",
          "Mantenha o WhatsApp atualizado para receber e responder clientes.",
          "Use Loja ativa somente quando a vitrine estiver pronta para receber pedidos.",
        ],
        to: "/minha-loja",
        action: "Ir para Minha Loja",
      },
      {
        title: "Ajuste sua conta e a divulgação",
        description:
          "Use Configurações para atualizar seus dados pessoais, senha e mensagem do WhatsApp.",
        details: [
          "Na seção Divulgação, escreva a frase que acompanhará o link da vitrine.",
          "Clique em Salvar mensagem e confira a prévia do compartilhamento.",
          "Se apagar a frase, o Vitrini volta a usar a mensagem padrão.",
        ],
        to: "/configuracoes",
        action: "Ir para Configurações",
      },
    ],
  },
  {
    number: "2",
    title: "Monte seu catálogo de produtos e serviços",
    description:
      "Um catálogo completo ajuda o cliente a decidir sozinho e reduz perguntas repetidas no WhatsApp.",
    icon: Package,
    steps: [
      {
        title: "Cadastrar produtos manualmente",
        description: "Adicione nome, preço, descrição, categoria, foto e disponibilidade.",
        details: [
          "Use um nome curto e objetivo, como o cliente procuraria.",
          "Informe preço e estoque corretamente para evitar pedidos incorretos.",
          "Escreva uma descrição com tamanho, sabor, cor, prazo ou condições do serviço.",
          "Edite ou desative o produto quando ele não estiver disponível.",
        ],
        to: "/produtos",
        action: "Ir para Produtos",
      },
      {
        title: "Cadastrar produtos com IA",
        description:
          "Fotografe uma página de catálogo, lista ou revista e deixe a IA sugerir os cadastros.",
        details: [
          "Tire uma foto clara, sem reflexos e com nomes e preços legíveis.",
          "Aguarde a análise e revise cada nome, preço e descrição sugeridos.",
          "Confirme somente os itens que realmente deseja publicar.",
          "A IA acelera o trabalho, mas a conferência final é sempre do proprietário.",
        ],
        to: "/produtos-ia",
        action: "Ir para Cadastrar com IA",
      },
      {
        title: "Adicionar fotos aos produtos",
        description: "Use fotos reais e bem iluminadas para tornar a vitrine mais atrativa.",
        details: [
          "Prefira imagens horizontais ou quadradas, nítidas e sem excesso de texto.",
          "Envie arquivos JPG, PNG, WebP ou GIF dentro do limite indicado.",
          "Depois do upload, confira a imagem na visualização do produto e no link público.",
        ],
        to: "/produtos",
        action: "Gerenciar fotos e produtos",
      },
    ],
  },
  {
    number: "3",
    title: "Organize seu catálogo em Roupas Esportivas",
    description:
      "No plano PRO, crie uma estrutura esportiva própria para organizar clubes, seleções, campeonatos, categorias e coleções da sua loja.",
    icon: Shirt,
    steps: [
      {
        title: "Abra o módulo Roupas Esportivas",
        description:
          "Acesse o módulo pelo menu lateral. O recurso é exclusivo do Vitrini PRO e mantém os dados salvos mesmo se o plano for alterado.",
        details: [
          "No painel, clique em Roupas Esportivas.",
          "Confira a visão geral com a quantidade de itens e produtos classificados.",
          "Use a aba Estrutura para organizar a árvore do seu catálogo.",
        ],
        to: "/roupas-esportivas",
        action: "Abrir Roupas Esportivas",
      },
      {
        title: "Monte a estrutura de esportes e categorias",
        description:
          "Crie níveis para que o cliente encontre rapidamente camisas, clubes, seleções, retrô e outros itens.",
        details: [
          "Comece por um item principal, como Futebol ou Basquete.",
          "Adicione categorias filhas, como Nacional, Internacional, Clubes ou Seleções.",
          "Use Novo item para criar clubes, campeonatos e categorias personalizadas.",
          "Edite o nome, cores, logo, banner, ordem e status de cada item.",
        ],
        to: "/roupas-esportivas",
        action: "Configurar estrutura",
      },
      {
        title: "Classifique os produtos esportivos",
        description:
          "Ao cadastrar ou editar um produto, selecione a classificação esportiva e a coleção correspondente.",
        details: [
          "Abra Produtos e crie um produto normalmente, com nome, preço, estoque e fotos.",
          "Na seção Catálogo esportivo, escolha o tipo e o público do produto.",
          "Marque Lançamento, Retrô ou Produto personalizado quando aplicável.",
          "Selecione uma coleção, como Vasco 2026, Nova Temporada ou Ofertas.",
          "Salve o produto para que ele apareça nos filtros da vitrine pública.",
        ],
        to: "/produtos",
        action: "Classificar produtos",
      },
      {
        title: "Configure ofertas e a apresentação da vitrine",
        description:
          "Destaque novidades, ofertas e coleções para deixar a loja mais fácil de navegar.",
        details: [
          "Na aba Personalização, defina nome, descrição e cores do módulo.",
          "Ative ou desative blocos como Lançamentos, Ofertas, Coleções e Retrô.",
          "Na aba Coleções, crie agrupamentos com descrição, imagem e banner.",
          "Para uma oferta, informe o preço original e o preço promocional; o desconto será exibido na vitrine.",
          "Use a aba Visão geral para revisar a quantidade de itens e produtos classificados.",
        ],
        to: "/roupas-esportivas",
        action: "Personalizar módulo",
      },
      {
        title: "Confira como o cliente encontra os produtos",
        description:
          "A vitrine pública apresenta busca e filtros para esportes, categorias, lançamentos, ofertas, retrô e coleções.",
        details: [
          "Abra Ver loja ou o link público da sua vitrine.",
          "Teste a busca por clube, esporte, coleção ou tipo de produto.",
          "Confira os selos de lançamento, oferta e desconto.",
          "Faça um teste pelo celular antes de divulgar a loja.",
        ],
        to: "/minha-loja",
        action: "Ver minha loja",
      },
    ],
  },
  {
    number: "4",
    title: "Publique e divulgue sua vitrine",
    description:
      "O link público é a porta de entrada dos clientes. Use-o no Instagram, Facebook, WhatsApp, cartões e embalagens.",
    icon: Megaphone,
    steps: [
      {
        title: "Copiar o link da vitrine",
        description: "O Dashboard mostra o endereço público exclusivo da sua loja.",
        details: [
          "Clique em Copiar para enviar o endereço em qualquer canal.",
          "Clique em Ver loja para conferir a experiência do cliente.",
          "Teste o link em uma janela anônima ou em outro celular antes de divulgar.",
        ],
        to: "/dashboard",
        action: "Ir para o Dashboard",
      },
      {
        title: "Compartilhar pelo WhatsApp",
        description:
          "No card Link da sua vitrine, clique em WhatsApp para abrir o compartilhamento pronto.",
        details: [
          "A mensagem usa a frase configurada em Configurações → Divulgação.",
          "O link correto da sua loja é incluído automaticamente e não é duplicado.",
          "No WhatsApp, escolha um contato, grupo, comunidade ou Status.",
          "Não é necessário copiar e colar o link manualmente.",
        ],
        to: "/dashboard",
        action: "Abrir o Dashboard",
      },
      {
        title: "Criar e usar o QR Code",
        description: "Transforme o endereço da sua loja em um código fácil de escanear.",
        details: [
          "Baixe ou imprima o QR Code gerado para sua vitrine.",
          "Coloque em balcão, cartão, embalagem, mesa ou material promocional.",
          "Teste o código com a câmera do celular antes de imprimir em grande quantidade.",
        ],
        to: "/qrcodes",
        action: "Ir para QR Codes",
      },
    ],
  },
  {
    number: "5",
    title: "Receba e organize pedidos",
    description:
      "Acompanhe os pedidos desde a entrada até a entrega ou retirada, sem perder informações importantes.",
    icon: ShoppingCart,
    steps: [
      {
        title: "Acompanhar pedidos",
        description: "Veja os itens, dados do cliente, total e andamento de cada pedido.",
        details: [
          "Abra o pedido e confira produtos, quantidades e observações.",
          "Confirme disponibilidade e combine entrega ou retirada pelo WhatsApp quando necessário.",
          "Atualize o status para manter o cliente informado.",
          "Marque como entregue somente após concluir o atendimento.",
        ],
        to: "/pedidos",
        action: "Ir para Pedidos",
      },
      {
        title: "Conhecer seus clientes",
        description:
          "Consulte o histórico de compradores para oferecer um atendimento mais próximo.",
        details: [
          "Use o histórico para identificar clientes recorrentes.",
          "Confira os dados antes de entrar em contato.",
          "Faça divulgações responsáveis e respeite a preferência do cliente.",
        ],
        to: "/clientes",
        action: "Ir para Clientes",
      },
    ],
  },
  {
    number: "6",
    title: "Gerencie cobranças e pagamentos",
    description:
      "Registre valores, acompanhe recebimentos e mantenha o controle financeiro das vendas e serviços.",
    icon: Wallet,
    steps: [
      {
        title: "Criar e acompanhar cobranças",
        description: "Use Cobranças para organizar pagamentos combinados com seus clientes.",
        details: [
          "Preencha cliente, produto, valor e vencimento com atenção.",
          "Envie o link de cobrança pelo WhatsApp quando necessário.",
          "Atualize o pagamento assim que o cliente confirmar o recebimento.",
          "Consulte parcelas em aberto e atrasadas para não perder prazos.",
        ],
        to: "/cobrancas",
        action: "Ir para Cobranças",
      },
      {
        title: "Consultar faturamento",
        description: "Use Faturamento para acompanhar a movimentação registrada da sua loja.",
        details: [
          "Analise o período selecionado e compare resultados.",
          "Use os dados para planejar estoque, ofertas e divulgação.",
          "Lembre-se de que o painel depende dos pedidos e lançamentos registrados.",
        ],
        to: "/faturamento",
        action: "Ir para Faturamento",
      },
    ],
  },
  {
    number: "7",
    title: "Escolha o plano e acompanhe os recursos",
    description:
      "Consulte o plano atual e veja os recursos disponíveis para o momento do seu negócio.",
    icon: CreditCard,
    steps: [
      {
        title: "Conhecer Básica e PRO",
        description: "Compare os planos e escolha a opção adequada para sua operação.",
        details: [
          "Confira preço, limites e recursos antes de assinar.",
          "Novas lojas recebem 30 dias grátis com acesso aos recursos PRO, sem cartão.",
          "Durante o trial, o painel e os módulos Premium ficam liberados.",
          "Depois do período de teste, escolha a Básica ou a PRO para continuar com os recursos pagos.",
        ],
        to: "/assinatura",
        action: "Ver planos",
      },
      {
        title: "Acompanhar o resultado da loja",
        description: "O Dashboard reúne pedidos, faturamento, produtos e visitas da vitrine.",
        details: [
          "Use os indicadores para identificar o que precisa de atenção.",
          "Divulgue o link com frequência para aumentar as visitas.",
          "Mantenha catálogo e preços atualizados para converter melhor.",
        ],
        to: "/dashboard",
        action: "Ver indicadores",
      },
    ],
  },
  {
    number: "8",
    title: "Use os módulos Premium por 30 dias grátis",
    description:
      "O trial PRO libera os módulos especializados para você testar a operação antes de escolher um plano.",
    icon: Sparkles,
    steps: [
      {
        title: "Ative seu segmento especializado",
        description:
          "Acesse Lojas Premium e escolha os módulos que combinam com sua loja, sem perder a liberdade de criar produtos personalizados.",
        details: [
          "Use Roupas Esportivas, Treino/A academia, Calçados, Cafeteria ou Marmitaria.",
          "Os módulos ativados continuam com produtos, pedidos e clientes centralizados.",
          "Na Marmitaria, configure almoço e jantar e use endereço/CEP quando houver entrega.",
          "Produtos sugeridos ou importados continuam editáveis e podem começar como rascunho.",
        ],
        to: "/lojas-premium",
        action: "Explorar Lojas Premium",
      },
      {
        title: "Acompanhe o período gratuito",
        description: "Confira na assinatura a situação do trial e a data de término dos 30 dias PRO.",
        details: [
          "O trial começa na criação da nova loja.",
          "Durante o período, recursos como IA, estoque, variações, faturamento e módulos Premium ficam disponíveis.",
          "A tela de assinatura mostra quando será necessário escolher um plano.",
        ],
        to: "/assinatura",
        action: "Ver meu trial",
      },
    ],
  },
  {
    number: "9",
    title: "Receba alertas e ajude a evoluir o Vitrini",
    description:
      "Acompanhe pedidos mesmo fora da tela atual e envie diretamente suas observações durante os testes.",
    icon: BellRing,
    steps: [
      {
        title: "Ativar notificações de pedidos",
        description: "No Dashboard, toque no sino para permitir notificações do navegador.",
        details: [
          "Aceite a permissão do navegador para receber alertas de novos pedidos.",
          "No computador, as notificações podem chegar mesmo com a aba fechada, conforme as permissões do navegador.",
          "No celular, permita notificações e adicione o Vitrini à tela inicial quando o navegador oferecer essa opção.",
        ],
        to: "/dashboard",
        action: "Abrir o Dashboard",
      },
      {
        title: "Reportar bugs e sugestões",
        description: "Envie problemas, ideias e melhorias para a conta de administrador master.",
        details: [
          "Escolha Bug, Sugestão ou Melhoria.",
          "Descreva a tela, o que aconteceu e, se possível, os passos para reproduzir.",
          "Acompanhe o status do relato em Meus relatos.",
        ],
        to: "/feedback",
        action: "Reportar um problema",
      },
    ],
  },
];

function ComoFunciona() {
  return (
    <AppShell
      title="Como funciona"
      description="Central completa do proprietário para configurar, divulgar e operar sua loja"
    >
      <div className="space-y-5">
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <HelpCircle className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Central do proprietário
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                Sua loja em poucos passos
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
                Configure os dados, publique seus produtos, divulgue o link e acompanhe os pedidos.
                Sempre que aparecer um botão <strong className="text-foreground">Ir para</strong>,
                você será levado diretamente ao serviço explicado.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["1", "Configure", "Conta, loja e catálogo"],
              ["2", "Divulgue", "Link, QR Code e WhatsApp"],
              ["3", "Atenda", "Pedidos, clientes e cobranças"],
            ].map(([number, title, description]) => (
              <div key={number} className="rounded-xl border border-border bg-background/80 p-4">
                <p className="text-sm font-bold text-primary">{number}</p>
                <p className="mt-2 font-semibold">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
          <QuickGuide
            icon={ImagePlus}
            title="Fotos"
            text="Use imagens claras e revise o resultado no link público."
          />
          <QuickGuide
            icon={QrCode}
            title="Divulgação"
            text="Compartilhe seu link no WhatsApp, redes sociais e QR Code."
          />
          <QuickGuide
            icon={Settings}
            title="Manutenção"
            text="Atualize preços, disponibilidade e mensagem sempre que precisar."
          />
        </section>

        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <TutorialSectionView key={section.number} section={section} />
          ))}
        </div>

        <section className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">Pronto para começar?</p>
            <p className="text-sm text-muted-foreground">
              Revise seus dados e publique sua vitrine quando tudo estiver correto.
            </p>
          </div>
          <Link
            to="/configuracoes"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-accent"
          >
            <Settings className="size-4" /> Abrir configurações <ArrowRight className="size-4" />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}

function QuickGuide({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof ImagePlus;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function TutorialSectionView({ section }: { section: TutorialSection }) {
  const Icon = section.icon;
  return (
    <section className="surface p-5 sm:p-7">
      <div className="flex items-start gap-3 border-b border-border pb-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">
            Etapa {section.number}
          </p>
          <h2 className="mt-1 text-xl font-bold sm:text-2xl">{section.title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.description}</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {section.steps.map((step, index) => (
          <article
            key={step.title}
            className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.description}</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {step.details.map((detail) => (
                    <li key={detail} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to={step.to}
                  className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  {step.action} <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
