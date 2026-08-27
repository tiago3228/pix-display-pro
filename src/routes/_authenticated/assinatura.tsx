import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { FREE_PLAN_PRODUCT_LIMIT } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/assinatura")({
  component: Subscription,
});

const PLANS = [
  {
    id: "free",
    name: "Gratuito",
    price: "R$ 0",
    features: [
      `Até ${FREE_PLAN_PRODUCT_LIMIT} produtos`,
      "Vitrine pública com link e QR Code",
      "Pedidos pelo WhatsApp",
      "Painel de pedidos e clientes",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "R$ 29,90/mês",
    features: [
      "Produtos ilimitados",
      "Variações e controle de estoque",
      "Personalização de cores e banner",
      "QR Code por produto",
      "Relatórios de vendas",
    ],
  },
] as const;

function Subscription() {
  const { data: store } = useMyStore();
  const queryClient = useQueryClient();
  const currentPlan = store?.plan ?? "free";

  async function changePlan(plan: string) {
    if (!store) return;
    const { error } = await supabase.from("stores").update({ plan }).eq("id", store.id);
    if (error) {
      toast.error("Não foi possível alterar o plano.");
      return;
    }
    await supabase.from("subscriptions").insert({
      store_id: store.id,
      plan,
      status: plan === "pro" ? "active" : "canceled",
      provider: "manual",
    });
    toast.success(plan === "pro" ? "Plano Pro ativado!" : "Você voltou para o plano gratuito.");
    queryClient.invalidateQueries({ queryKey: ["my-store"] });
  }

  return (
    <AppShell title="Assinatura" description="Escolha o plano ideal para o seu momento">
      <div className="grid gap-4 sm:grid-cols-2">
        {PLANS.map((plan) => {
          const active = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`surface flex flex-col p-5 ${active ? "ring-2 ring-primary" : ""}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold">{plan.name}</p>
                {active ? <Badge>Plano atual</Badge> : null}
              </div>
              <p className="mt-1 text-2xl font-bold">{plan.price}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-5 h-11"
                variant={plan.id === "pro" ? "default" : "outline"}
                disabled={active}
                onClick={() => changePlan(plan.id)}
              >
                {active ? (
                  "Plano ativo"
                ) : plan.id === "pro" ? (
                  <>
                    <Sparkles className="mr-2 size-4" /> Assinar o Pro
                  </>
                ) : (
                  "Voltar para o gratuito"
                )}
              </Button>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Pagamento em ambiente de testes: a troca de plano é aplicada imediatamente.
      </p>
    </AppShell>
  );
}
