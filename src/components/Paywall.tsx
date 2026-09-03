import { Link } from "@tanstack/react-router";
import { Lock, Sparkles } from "lucide-react";
import { brl } from "@/lib/format";
import { useProPricing } from "@/hooks/usePricing";
import { Button } from "@/components/ui/button";

export function Paywall({
  title = "Recurso PRO",
  text = "Esse recurso está disponível no plano PRO.",
}: {
  title?: string;
  text?: string;
}) {
  const { price } = useProPricing();
  return (
    <div className="surface mx-auto max-w-md p-6 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Lock className="size-5" />
      </span>
      <h2 className="mt-4 text-lg font-bold">🔒 {title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <p className="mt-3 text-2xl font-bold">{brl(price)}/mês</p>

      <Button asChild className="mt-4 h-12 w-full">
        <Link to="/assinatura">
          <Sparkles className="mr-2 size-4" /> Assinar PRO
        </Link>
      </Button>
    </div>
  );
}
