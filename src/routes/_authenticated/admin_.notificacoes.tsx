import { createFileRoute } from "@tanstack/react-router";
import {
  BellRing,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Monitor,
  Smartphone,
  Wifi,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin_/notificacoes")({
  component: AdminNotifications,
});

const sections = [
  {
    title: "iPhone e iPad",
    icon: Smartphone,
    badge: "Safari / PWA",
    steps: [
      "Abra a loja Vitrini no Safari e entre no painel do proprietário.",
      "Toque em Compartilhar e escolha Adicionar à Tela de Início.",
      "Abra o Vitrini pelo novo ícone instalado; não use apenas a aba comum do Safari.",
      "No Dashboard, toque no sino de notificações e permita o envio de alertas.",
      "Se necessário, confira em Ajustes → Notificações → Vitrini se Permitir Notificações está ativo.",
    ],
    note: "No iOS, o Push depende do site estar instalado na Tela de Início e aberto como aplicativo. A opção pode não aparecer em uma aba comum do Safari.",
  },
  {
    title: "Android",
    icon: Smartphone,
    badge: "Chrome / PWA",
    steps: [
      "Abra o painel no Chrome usando HTTPS e faça login.",
      "Toque no sino no topo e escolha Permitir quando o navegador solicitar.",
      "Para maior confiabilidade, use o menu ⋮ → Adicionar à tela inicial e abra o Vitrini pelo ícone.",
      "Em Android → Notificações → Notificações de apps, confirme que o Chrome ou o Vitrini não está bloqueado.",
      "Desative a economia de bateria para o Chrome/Vitrini se o aparelho estiver atrasando os alertas.",
    ],
    note: "O Android pode suspender aplicativos em segundo plano. A permissão do navegador, a economia de bateria e o modo Não perturbe precisam permitir notificações.",
  },
  {
    title: "Computador: Chrome e Edge",
    icon: Monitor,
    badge: "Windows / macOS / Linux",
    steps: [
      "Abra o painel publicado em HTTPS e entre na conta do proprietário.",
      "Clique no sino Ativar notificações de pedidos.",
      "Na janela do navegador, escolha Permitir.",
      "Se o aviso não aparecer, abra as configurações do site pelo ícone ao lado do endereço e coloque Notificações como Permitir.",
      "Faça um pedido de teste em outro dispositivo e mantenha o computador conectado à internet.",
    ],
    note: "Depois de ativado, o computador pode mostrar o alerta mesmo com a aba fechada, desde que o navegador continue autorizado a executar notificações em segundo plano.",
  },
  {
    title: "Computador: Brave",
    icon: Monitor,
    badge: "Atenção aos Shields",
    steps: [
      "Abra brave://settings/privacy.",
      "Ative Usar os serviços do Google para mensagens Push, quando essa opção estiver disponível.",
      "No site Vitrini, clique no ícone do Shields e desative o bloqueio somente para este domínio, se necessário.",
      "Volte ao painel e clique novamente no sino para ativar as notificações.",
      "Se continuar aparecendo push service error, teste no Chrome ou Edge para separar bloqueio do navegador de falha do servidor.",
    ],
    note: "O Brave pode bloquear o serviço de mensagens Push por privacidade. Isso é uma configuração local do navegador e não significa que o pedido deixou de ser salvo.",
  },
];

function AdminNotifications() {
  return (
    <AppShell title="FAQ de notificações" description="Orientações para configurar alertas de novos pedidos">
      <div className="space-y-5">
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BellRing className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Guia para atendimento
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight">Como ativar os alertas de pedidos</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Envie estas instruções ao lojista conforme o dispositivo usado. O pedido continua sendo
                registrado mesmo quando uma notificação não é entregue.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniCard icon={Wifi} title="HTTPS obrigatório" text="A ativação só funciona no endereço publicado e seguro." />
            <MiniCard icon={BellRing} title="Permissão local" text="O lojista precisa permitir alertas no navegador e no sistema." />
            <MiniCard icon={ClipboardCheck} title="Teste real" text="Confirme enviando um pedido por outro celular ou computador." />
          </div>
        </section>

        <section className="surface p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <h2 className="font-semibold">Roteiro rápido de validação</h2>
              <ol className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                <li>1. O lojista ativou o sino e recebeu confirmação.</li>
                <li>2. A permissão do navegador aparece como permitida.</li>
                <li>3. O painel foi deixado fechado ou em outra tela.</li>
                <li>4. Um pedido foi enviado pela vitrine pública.</li>
                <li>5. O alerta mostrou número e valor do pedido.</li>
                <li>6. O clique no alerta abriu a tela Pedidos.</li>
              </ol>
            </div>
          </div>
        </section>

        <div className="space-y-3">
          {sections.map((section) => (
            <details key={section.title} className="surface group overflow-hidden" open={section.title === "iPhone e iPad"}>
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-semibold [&::-webkit-details-marker]:hidden">
                <section.icon className="size-5 text-primary" />
                <span className="flex-1">{section.title}</span>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                  {section.badge}
                </span>
                <span className="text-muted-foreground transition group-open:rotate-180">⌄</span>
              </summary>
              <div className="border-t border-border px-4 pb-5 pt-4 sm:px-12">
                <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {section.steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-4 flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-5 text-amber-900 dark:text-amber-200">
                  <CircleAlert className="mt-0.5 size-4 shrink-0" />
                  <span>{section.note}</span>
                </div>
              </div>
            </details>
          ))}
        </div>

        <section className="surface p-5 sm:p-6">
          <h2 className="font-semibold">Diagnóstico dos erros mais comuns</h2>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <Diagnostic title="Permissão bloqueada" text="Abrir as configurações do site, permitir Notificações e recarregar o painel." />
            <Diagnostic title="Registration failed" text="Testar HTTPS, limpar o Service Worker antigo e tentar novamente no Chrome/Edge." />
            <Diagnostic title="push service error" text="No Brave, habilitar os serviços Google para Push ou testar outro navegador." />
            <Diagnostic title="Nenhum alerta chegou" text="Confirmar VAPID, assinatura salva, internet e se o pedido foi feito depois da ativação." />
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function MiniCard({ icon: Icon, title, text }: { icon: typeof Wifi; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-4">
      <Icon className="size-4 text-primary" />
      <p className="mt-2 text-sm font-semibold">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function Diagnostic({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

export default AdminNotifications;
