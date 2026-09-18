import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, ExternalLink, Share2, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";

import { useMyStore } from "@/hooks/useAuth";
import { uploadAsset } from "@/lib/images";
import { PIX_KEY_TYPES, STORE_CATEGORIES, slugify, whatsappLink } from "@/lib/format";
import { QrImage } from "@/components/QrCode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: store, isLoading } = useMyStore();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [slug, setSlug] = useState("");

  const [form, setForm] = useState({
    name: "",
    seller_name: "",
    description: "",
    whatsapp: "",
    category: "Doces",
    logoFile: null as File | null,
  });
  const [pix, setPix] = useState({ pix_key_type: "email", pix_key: "" });
  const [product, setProduct] = useState({ name: "", price: "", description: "", stock: "" });

  useEffect(() => {
    if (store?.onboarding_done) navigate({ to: "/dashboard" });
    if (store && !store.onboarding_done) {
      setStoreId(store.id);
      setSlug(store.slug);
    }
  }, [store, navigate]);

  async function saveStore() {
    if (!form.name.trim() || !form.whatsapp.trim()) {
      toast.error("Informe o nome da loja e o WhatsApp.");
      return;
    }
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user!;

    let logoPath: string | null = null;
    if (form.logoFile) {
      try {
        logoPath = await uploadAsset(user.id, form.logoFile);
      } catch {
        toast.error("Não foi possível enviar a imagem, mas seguimos sem ela.");
      }
    }

    let candidate = slugify(form.name) || `loja-${user.id.slice(0, 6)}`;
    const payload = {
      owner_id: user.id,
      name: form.name,
      seller_name: form.seller_name || form.name,
      description: form.description,
      whatsapp: form.whatsapp,
      category: form.category,
      logo_url: logoPath,
    };

    let saved: { id: string; slug: string } | null = null;
    for (let attempt = 0; attempt < 5 && !saved; attempt++) {
      const trySlug = attempt === 0 ? candidate : `${candidate}-${attempt + 1}`;
      const query = storeId
        ? supabase
            .from("stores")
            .update({ ...payload, slug: trySlug })
            .eq("id", storeId)
            .select("id, slug")
            .single()
        : supabase
            .from("stores")
            .insert({ ...payload, slug: trySlug })
            .select("id, slug")
            .single();
      const { data, error } = await query;
      if (!error && data) {
        saved = data;
      } else if (error && !error.message.includes("duplicate")) {
        setSaving(false);
        toast.error("Não foi possível salvar sua loja.");
        return;
      }
      candidate = slugify(form.name) || candidate;
    }
    setSaving(false);
    if (!saved) {
      toast.error("Escolha outro nome para a loja.");
      return;
    }
    setStoreId(saved.id);
    setSlug(saved.slug);
    await supabase
      .from("profiles")
      .upsert({ id: user.id, name: form.seller_name || form.name, email: user.email ?? null });
    setStep(2);
  }

  async function savePix() {
    if (!pix.pix_key.trim()) {
      toast.error("Informe sua chave Pix.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("stores").update(pix).eq("id", storeId!);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar a chave Pix.");
      return;
    }
    setStep(3);
  }

  async function saveProduct() {
    if (!product.name.trim() || !product.price) {
      toast.error("Informe nome e preço do produto.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("products").insert({
      store_id: storeId!,
      name: product.name,
      description: product.description,
      price: Number(product.price.replace(",", ".")),
      stock: product.stock ? Number(product.stock) : 0,
      track_stock: Boolean(product.stock),
    });
    if (!error) {
      await supabase.from("stores").update({ onboarding_done: true }).eq("id", storeId!);
      await queryClient.invalidateQueries({ queryKey: ["my-store"] });
    }
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar o produto.");
      return;
    }
    setStep(4);
  }

  const storeUrl =
    typeof window !== "undefined" ? `${window.location.origin}/s/${slug}` : `/s/${slug}`;

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-8">
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex items-center justify-between">
          {step > 1 && step < 4 ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 px-2"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft className="size-4" /> Voltar
            </Button>
          ) : (
            <BackButton fallbackTo="/dashboard" />
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">Ir para o painel</Link>
          </Button>
        </div>
        <div className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-4" />
          </span>
          <span className="font-[family-name:var(--font-display)]">Vitrini</span>
        </div>

        <div className="mb-5 flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full ${step >= n ? "bg-primary" : "bg-border"}`}
            />
          ))}
        </div>

        <div className="surface p-6">
          {step === 1 ? (
            <>
              <h1 className="text-xl font-bold">Vamos criar sua loja.</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Essas informações aparecem na sua vitrine.
              </p>
              <div className="mt-5 space-y-4">
                <Field label="Nome da loja" required>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ana Doces"
                  />
                </Field>
                <Field label="Nome do vendedor">
                  <Input
                    value={form.seller_name}
                    onChange={(e) => setForm({ ...form, seller_name: e.target.value })}
                    placeholder="Ana"
                  />
                </Field>
                <Field label="Descrição">
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Doces artesanais feitos com carinho"
                  />
                </Field>
                <Field label="WhatsApp" required>
                  <Input
                    inputMode="tel"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </Field>
                <Field label="Categoria principal">
                  <Select
                    value={form.category}
                    onValueChange={(value) => setForm({ ...form, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STORE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Logo da loja (opcional)">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setForm({ ...form, logoFile: e.target.files?.[0] ?? null })}
                  />
                </Field>
                <Button className="h-11 w-full" disabled={saving} onClick={saveStore}>
                  {saving ? "Salvando..." : "Continuar"}
                </Button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h1 className="text-xl font-bold">Configurar pagamento</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Seu cliente vai copiar essa chave e pagar diretamente para você.
              </p>
              <div className="mt-5 space-y-4">
                <Field label="Tipo da chave Pix">
                  <Select
                    value={pix.pix_key_type}
                    onValueChange={(value) => setPix({ ...pix, pix_key_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIX_KEY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Chave Pix" required>
                  <Input
                    value={pix.pix_key}
                    onChange={(e) => setPix({ ...pix, pix_key: e.target.value })}
                  />
                </Field>
                <Button className="h-11 w-full" disabled={saving} onClick={savePix}>
                  {saving ? "Salvando..." : "Continuar"}
                </Button>
              </div>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h1 className="text-xl font-bold">Cadastre seu primeiro produto</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Você poderá adicionar fotos e variações depois.
              </p>
              <div className="mt-5 space-y-4">
                <Field label="Nome do produto" required>
                  <Input
                    value={product.name}
                    onChange={(e) => setProduct({ ...product, name: e.target.value })}
                    placeholder="Brownie Tradicional"
                  />
                </Field>
                <Field label="Descrição">
                  <Textarea
                    rows={2}
                    value={product.description}
                    onChange={(e) => setProduct({ ...product, description: e.target.value })}
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Preço (R$)" required>
                    <Input
                      inputMode="decimal"
                      value={product.price}
                      onChange={(e) => setProduct({ ...product, price: e.target.value })}
                      placeholder="6,00"
                    />
                  </Field>
                  <Field label="Estoque">
                    <Input
                      inputMode="numeric"
                      value={product.stock}
                      onChange={(e) => setProduct({ ...product, stock: e.target.value })}
                      placeholder="20"
                    />
                  </Field>
                </div>
                <Button className="h-11 w-full" disabled={saving} onClick={saveProduct}>
                  {saving ? "Salvando..." : "Finalizar"}
                </Button>
              </div>
            </>
          ) : null}

          {step === 4 ? (
            <div className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Check className="size-6" />
              </div>
              <h1 className="mt-4 text-xl font-bold">Pronto! Sua loja está criada.</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Compartilhe o link ou o QR Code abaixo.
              </p>
              <div className="mt-5 flex justify-center">
                <QrImage value={storeUrl} size={180} alt="QR Code da loja" />
              </div>
              <p className="mt-3 font-mono text-xs break-all text-muted-foreground">{storeUrl}</p>
              <div className="mt-5 grid gap-2">
                <Button
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(storeUrl);
                    toast.success("Link copiado!");
                  }}
                >
                  <Copy className="mr-2 size-4" /> Copiar link
                </Button>
                <Button asChild variant="outline">
                  <a
                    href={whatsappLink(
                      form.whatsapp,
                      `Oi! 😊\n\nConfira minha loja online:\n\n${storeUrl}\n\nVocê pode escolher os produtos e fazer seu pedido pelo WhatsApp.`,
                    )}
                    target="_blank"
                    rel="noopener"
                  >
                    <Share2 className="mr-2 size-4" /> Compartilhar no WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={storeUrl} target="_blank" rel="noopener">
                    <ExternalLink className="mr-2 size-4" /> Acessar minha loja
                  </a>
                </Button>
                <Button asChild className="h-11">
                  <Link to="/dashboard">Ir para o painel</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required ? <span className="text-destructive">*</span> : null}
      </Label>
      {children}
    </div>
  );
}
