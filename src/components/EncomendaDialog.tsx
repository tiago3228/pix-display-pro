import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { PackageOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/format";
import { submitEncomenda, type OrderTier } from "@/lib/encomendas.functions";
import type { StorefrontProduct } from "@/lib/storefront.functions";

type Props = { product: StorefrontProduct | null; onClose: () => void };

export function EncomendaDialog({ product, onClose }: Props) {
  const submit = useServerFn(submitEncomenda);
  const [quantity, setQuantity] = useState(product?.orderMinQuantity ?? 1);
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [sending, setSending] = useState(false);
  function formatWhatsapp(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  const quote = useMemo(() => {
    if (!product) return null;
    const tier = product.orderTiers
      .filter((item: OrderTier) => item.minQuantity <= quantity)
      .at(-1);
    const unitPrice = tier?.unitPrice ?? product.orderUnitPrice ?? product.price;
    return {
      unitPrice,
      total: Number((quantity * unitPrice).toFixed(2)),
      discount: Number((quantity * Math.max(product.price - unitPrice, 0)).toFixed(2)),
    };
  }, [product, quantity]);
  if (!product || !quote) return null;
  async function send() {
    if (
      quantity < product!.orderMinQuantity ||
      (product!.orderMaxQuantity !== null && quantity > product!.orderMaxQuantity)
    ) {
      toast.error("A quantidade está fora dos limites configurados.");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    if (!/^\d{2}-\d{4}-\d{4}$/.test(customerWhatsapp)) {
      toast.error("Informe o WhatsApp no formato 31-9999-9999.");
      return;
    }
    setSending(true);
    try {
      const result = await submit({
        data: { productId: product!.id, quantity, customerName, customerWhatsapp, customerNote },
      });
      toast.success(`Encomenda #${result.number} enviada!`);
      onClose();
      setQuantity(product!.orderMinQuantity);
      setCustomerName("");
      setCustomerWhatsapp("");
      setCustomerNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a encomenda.");
    } finally {
      setSending(false);
    }
  }
  return (
    <Dialog open={Boolean(product)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageOpen className="size-5 text-primary" /> Encomendar {product.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p>
              Preço aplicado: <b>{brl(quote.unitPrice)}/unidade</b>
            </p>
            <p className="mt-1 text-lg font-bold">Total: {brl(quote.total)}</p>
            {quote.discount > 0 ? (
              <p className="mt-1 text-xs font-medium text-emerald-600">
                Você economizou {brl(quote.discount)}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Mínimo: {product.orderMinQuantity} unidades
              {product.orderMaxQuantity ? ` · máximo: ${product.orderMaxQuantity}` : ""}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="order-quantity">Quantidade</Label>
            <Input
              id="order-quantity"
              type="number"
              min={product.orderMinQuantity}
              max={product.orderMaxQuantity ?? undefined}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || product.orderMinQuantity)}
            />
          </div>
          {product.orderLeadTime ? (
            <p className="rounded-md border p-2 text-sm">
              Prazo estimado: <b>{product.orderLeadTime}</b>
            </p>
          ) : null}
          {product.orderNotes ? (
            <p className="rounded-md border p-2 text-xs text-muted-foreground">
              {product.orderNotes}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="order-name">Seu nome</Label>
            <Input
              id="order-name"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="order-whatsapp">WhatsApp</Label>
            <Input
              id="order-whatsapp"
              inputMode="tel"
              required
              placeholder="31-9999-9999"
              maxLength={12}
              value={customerWhatsapp}
              onChange={(e) => setCustomerWhatsapp(formatWhatsapp(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Informe o código da cidade e o número.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="order-note">Observações (opcional)</Label>
            <Textarea
              id="order-note"
              rows={3}
              placeholder="Ex.: preciso para sábado; cores; sabores..."
              value={customerNote}
              onChange={(e) => setCustomerNote(e.target.value)}
            />
          </div>
          <Button className="h-11 w-full" onClick={send} disabled={sending}>
            {sending ? "Enviando..." : "Enviar encomenda"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
