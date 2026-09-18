import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso | Vitrini" },
      { name: "description", content: "Consulte as regras de uso da plataforma Vitrini." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PublicPage title="Termos de Uso" icon={<FileText className="size-5" />}>
      <p className="lead">
        Ao criar uma conta ou utilizar o Vitrini, você concorda com estes termos. Leia as condições
        antes de publicar sua loja.
      </p>
      <h2>1. O serviço</h2>
      <p>
        O Vitrini oferece ferramentas para criação de vitrines online, catálogo, pedidos,
        divulgação, organização de clientes e acompanhamento financeiro. A disponibilidade pode ser
        atualizada para melhorar o serviço.
      </p>
      <h2>2. Responsabilidade do proprietário</h2>
      <p>
        O proprietário deve fornecer informações verdadeiras, manter sua senha protegida, publicar
        somente produtos ou serviços permitidos e cumprir suas obrigações fiscais, consumeristas e
        comerciais.
      </p>
      <h2>3. Pedidos e pagamentos</h2>
      <p>
        O Vitrini organiza o pedido e facilita o contato entre cliente e vendedor. A negociação,
        entrega, qualidade do produto, cancelamento, reembolso e recebimento são responsabilidade do
        vendedor, salvo quando uma condição específica informar o contrário.
      </p>
      <h2>4. Assinaturas</h2>
      <p>
        Os planos, preços, períodos promocionais e recursos são apresentados no momento da
        contratação. O acesso a recursos pagos depende da confirmação do pagamento e pode ser
        alterado em caso de inadimplência, cancelamento ou término do período contratado.
      </p>
      <h2>5. Conteúdo e uso aceitável</h2>
      <p>
        Não é permitido usar o Vitrini para fraude, conteúdo ilegal, violação de direitos, spam,
        tentativa de acesso indevido ou qualquer atividade que prejudique outros usuários e a
        segurança da plataforma.
      </p>
      <h2>6. Encerramento</h2>
      <p>
        O usuário pode solicitar o encerramento da conta. O Vitrini poderá suspender contas que
        violem estes termos ou ofereçam risco à operação, sempre preservando informações necessárias
        para obrigações legais.
      </p>
      <h2>7. Contato</h2>
      <p>
        Em caso de dúvidas sobre estes termos, utilize o canal de suporte disponível na plataforma.
      </p>
      <p className="muted">Última atualização: 18 de setembro de 2026.</p>
    </PublicPage>
  );
}

function PublicPage({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link to="/" className="font-semibold">
            Vitrini
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Início
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <span className="text-sm font-semibold">Informações legais</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold">{title}</h1>
        <article className="legal-content mt-8 space-y-5 text-sm leading-7 text-muted-foreground">
          {children}
        </article>
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Vitrini · By: Tiago Cardoso
      </footer>
    </div>
  );
}
