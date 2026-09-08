import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { QrImage, downloadQr } from "@/components/QrCode";
import { slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/qrcodes")({
  component: QrCodes,
});

function QrCodes() {
  const { data: store } = useMyStore();

  const { data: products } = useQuery({
    queryKey: ["qr-products", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("store_id", store!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const storeUrl = store ? `${origin}/s/${store.slug}` : "";

  async function download(url: string, filename: string) {
    const dataUrl = await QRCode.toDataURL(url, { width: 1024, margin: 2 });
    downloadQr(dataUrl, filename);
  }

  return (
    <AppShell title="QR Codes" description="Imprima e use em embalagens, cartões e vitrines">
      <div className="surface flex flex-col items-center p-6 text-center">
        <p className="font-semibold">QR Code da loja</p>
        <p className="mt-1 text-xs text-muted-foreground">{storeUrl}</p>
        <div className="mt-4">{storeUrl ? <QrImage value={storeUrl} size={220} /> : null}</div>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => download(storeUrl, `qrcode-${store?.slug}.png`)}
        >
          <Download className="mr-2 size-4" /> Baixar PNG
        </Button>
      </div>

      <p className="mt-6 mb-3 text-sm font-semibold">QR Codes por produto</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(products ?? []).map((product) => {
          const url = `${storeUrl}?produto=${product.id}`;
          return (
            <div key={product.id} className="surface flex flex-col items-center p-4 text-center">
              <QrImage value={url} size={140} alt={`QR de ${product.name}`} />
              <p className="mt-2 line-clamp-2 text-sm font-medium">{product.name}</p>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => download(url, `qrcode-${slugify(product.name)}.png`)}
              >
                <Download className="mr-1.5 size-4" /> Baixar
              </Button>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
