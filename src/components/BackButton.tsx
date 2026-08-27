import { ArrowLeft } from "lucide-react";
import { useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BackButtonProps = {
  /** Destino usado quando não existe histórico de navegação (link direto, nova aba). */
  fallbackTo?: string;
  label?: string;
  className?: string;
  variant?: "ghost" | "outline";
  iconOnly?: boolean;
};

/**
 * Botão Voltar real: usa o histórico do roteador quando existe e, caso o
 * usuário tenha chegado direto na URL, navega para um destino seguro.
 */
export function BackButton({
  fallbackTo = "/dashboard",
  label = "Voltar",
  className,
  variant = "ghost",
  iconOnly = false,
}: BackButtonProps) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();

  function handleClick() {
    if (canGoBack) {
      router.history.back();
      return;
    }
    navigate({ to: fallbackTo });
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={iconOnly ? "icon" : "sm"}
      aria-label={label}
      onClick={handleClick}
      className={cn(iconOnly ? "" : "gap-1.5 px-2", className)}
    >
      <ArrowLeft className="size-4" />
      {iconOnly ? null : label}
    </Button>
  );
}
