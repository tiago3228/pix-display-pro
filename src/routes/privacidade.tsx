import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade | Vitrini" },
      { name: "description", content: "Saiba como o Vitrini trata os dados usados na plataforma." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidade" icon={<ShieldCheck className="size-5" />}>
      <p className="lead">
        Esta política explica, de forma transparente, como o Vitrini coleta, usa e protege
        informações de proprietários de lojas e clientes.
      </p>
      <h2>1. Dados coletados</h2>
      <p>
        Podemos tratar nome, e-mail, WhatsApp, dados da loja, produtos, pedidos, clientes
        cadastrados pelo proprietário e informações necessárias para autenticação e cobrança.
      </p>
      <h2>2. Como usamos os dados</h2>
      <p>
        Usamos os dados para disponibilizar a vitrine, registrar pedidos, facilitar o contato pelo
        WhatsApp, gerar relatórios, processar assinaturas e melhorar a segurança e o funcionamento
        da plataforma.
      </p>
      <h2>3. Dados dos clientes da loja</h2>
      <p>
        O proprietário é responsável pelos dados de seus próprios clientes. O Vitrini disponibiliza
        recursos de organização e deve ser usado de acordo com a legislação aplicável e com as
        autorizações necessárias.
      </p>
      <h2>4. Compartilhamento</h2>
      <p>
        Não vendemos dados pessoais. Compartilhamos informações somente quando necessário para
        operar serviços contratados, cumprir obrigação legal, processar pagamentos ou proteger
        direitos e segurança.
      </p>
      <h2>5. Segurança e retenção</h2>
      <p>
        Aplicamos controles de acesso e armazenamento seguro. Mantemos os dados enquanto a conta
        estiver ativa ou pelo período necessário para cumprir obrigações legais e resolver disputas.
      </p>
      <h2>6. Direitos e contato</h2>
      <p>
        Para solicitar acesso, correção ou esclarecimentos sobre seus dados, entre em contato pelo
        canal de suporte informado no Vitrini. Solicitações podem exigir confirmação de identidade.
      </p>
      <p className="muted">Última atualização: 18 de setembro de 2026.</p>
    </LegalLayout>
  );
}

function LegalLayout({
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
