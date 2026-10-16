import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Endereço publicado do Vitrini — os links das lojas sempre usam este domínio,
 * mesmo quando o app roda no preview interno do editor. */
export const PUBLIC_APP_URL = "https://vitrini-br.lovable.app";

export const DEFAULT_SHARE_MESSAGE = "Essa é a minha loja! Entre no link e confira as ofertas.";

export function getStorePublicUrl(slug: string) {
  return `${PUBLIC_APP_URL}/s/${slug}`;
}

export function buildStoreShareMessage(message: string | null | undefined, url: string) {
  const text = message?.trim() || DEFAULT_SHARE_MESSAGE;
  return text.includes(url) ? text : `${text}\n\n${url}`;
}

export function StoreWhatsAppShare({
  slug,
  message,
  className,
}: {
  slug: string;
  message?: string | null;
  className?: string;
}) {
  const url = getStorePublicUrl(slug);
  const shareMessage = buildStoreShareMessage(message, url);

  function share() {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className={cn("rounded-xl border border-whatsapp/30 bg-whatsapp/5 p-4", className)}>
      <p className="text-sm font-semibold">Link da sua vitrine</p>
      <p className="mt-1 break-all text-xs text-muted-foreground">{url}</p>
      <Button
        type="button"
        onClick={share}
        className="mt-3 bg-whatsapp text-whatsapp-foreground hover:bg-whatsapp/90"
      >
        <MessageCircle className="mr-2 size-4" /> Compartilhar no WhatsApp
      </Button>
    </div>
  );
}
