import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HelpCircle, Mail, MessageCircle } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte | Vitrini" },
      { name: "description", content: "Encontre ajuda para configurar e utilizar o Vitrini." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
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
      <main className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center gap-2 text-primary">
          <HelpCircle className="size-5" />
          <span className="text-sm font-semibold">Central de ajuda</span>
        </div>
        <h1 className="mt-3 text-3xl font-bold">Como podemos ajudar?</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Consulte a Central Como Funciona dentro do painel ou entre em contato para receber
          orientação sobre sua vitrine.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <SupportCard
            icon={<MessageCircle className="size-5" />}
            title="Atendimento pelo WhatsApp"
            text="Para dúvidas sobre configuração, pedidos, imagens e divulgação, fale com nossa equipe."
            href="https://wa.me/5500000000000"
            label="Abrir WhatsApp"
          />
          <SupportCard
            icon={<Mail className="size-5" />}
            title="Atendimento por e-mail"
            text="Envie detalhes do problema, e-mail da conta e, se possível, uma captura de tela."
            href="mailto:suporte@vitrini.app"
            label="Enviar e-mail"
          />
        </div>
        <section className="surface mt-6 p-5">
          <h2 className="text-lg font-bold">Dúvidas frequentes</h2>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <p className="font-semibold">A imagem do produto não aparece</p>
              <p className="mt-1 text-muted-foreground">
                Confirme o formato e o tamanho do arquivo, salve o produto e revise o link público.
              </p>
            </div>
            <div>
              <p className="font-semibold">O pedido não chegou</p>
              <p className="mt-1 text-muted-foreground">
                Verifique o WhatsApp cadastrado em Minha Loja e consulte o pedido no painel.
              </p>
            </div>
            <div>
              <p className="font-semibold">Meu plano não atualizou</p>
              <p className="mt-1 text-muted-foreground">
                Confira o status do pagamento e envie o identificador da assinatura ao suporte.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Vitrini · By: Tiago Cardoso
      </footer>
    </div>
  );
}

function SupportCard({
  icon,
  title,
  text,
  href,
  label,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  href: string;
  label: string;
}) {
  return (
    <div className="surface p-5">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h2 className="mt-4 font-semibold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      <a
        href={href}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noreferrer" : undefined}
        className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
      >
        {label}
      </a>
    </div>
  );
}
