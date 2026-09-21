import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { uploadAsset } from "@/lib/images";
import { PIX_KEY_TYPES, STORE_CATEGORIES, slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_SHARE_MESSAGE,
  StoreWhatsAppShare,
  buildStoreShareMessage,
  getStorePublicUrl,
} from "@/components/StoreWhatsAppShare";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/minha-loja")({
  component: MyStore,
});

const COLORS = ["#111827", "#0f766e", "#e11d48", "#7c3aed", "#ea580c", "#2563eb", "#16a34a"];

function MyStore() {
  const { data: store, refetch } = useMyStore();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const isPro = store?.plan === "pro";
  const [form, setForm] = useState({
    name: "",
    seller_name: "",
    slug: "",
    description: "",
    category: "Doces",
    whatsapp: "",
    instagram: "",
    welcome_message: "",
    share_message: DEFAULT_SHARE_MESSAGE,
    primary_color: "#111827",
    pix_key_type: "email",
    pix_key: "",
    is_active: true,
    accept_pix: true,
    allow_installments: false,
    max_installments: 3,
    min_installment_amount: 20,
  });

  useEffect(() => {
    if (!store) return;
    setForm({
      name: store.name,
      seller_name: store.seller_name,
      slug: store.slug,
      description: store.description,
      category: store.category,
      whatsapp: store.whatsapp,
      instagram: store.instagram ?? "",
      welcome_message: store.welcome_message,
      share_message: store.share_message?.trim() || DEFAULT_SHARE_MESSAGE,
      primary_color: store.primary_color,
      pix_key_type: store.pix_key_type,
      pix_key: store.pix_key,
      is_active: store.is_active,
      accept_pix: store.accept_pix,
      allow_installments: store.allow_installments,
      max_installments: store.max_installments,
      min_installment_amount: Number(store.min_installment_amount),
    });
  }, [store]);

  async function uploadImage(kind: "logo_url" | "banner_url", file: File) {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !store) return;
    try {
      const path = await uploadAsset(userData.user.id, file);
      const { error } = await supabase
        .from("stores")
        .update({ [kind]: path } as never)
        .eq("id", store.id);
      if (error) throw error;
      toast.success("Imagem atualizada.");
      queryClient.invalidateQueries({ queryKey: ["my-store"] });
    } catch {
      toast.error("Não foi possível enviar a imagem.");
    }
  }

  async function save() {
    setFeedback(null);

    if (!form.name.trim() || !form.seller_name.trim()) {
      const text = "Preencha o nome da loja e o nome do vendedor.";
      setFeedback({ type: "error", text });
      toast.error(text);
      return;
    }
    if (!form.whatsapp.trim()) {
      const text = "Informe o WhatsApp da loja.";
      setFeedback({ type: "error", text });
      toast.error(text);
      return;
    }

    setSaving(true);
    let current = store;
    if (!current) {
      const { data: fresh } = await refetch();
      current = fresh ?? null;
    }

    const payload = {
      ...form,
      slug: slugify(form.slug) || slugify(form.name),
      instagram: form.instagram || null,
    };

    let error = null as { message: string } | null;
    if (current) {
      const res = await supabase
        .from("stores")
        .update({ ...payload, slug: payload.slug || current.slug })
        .eq("id", current.id);
      error = res.error;
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setSaving(false);
        const text = "Sessão expirada. Entre novamente para salvar.";
        setFeedback({ type: "error", text });
        toast.error(text);
        return;
      }
      const res = await supabase
        .from("stores")
        .insert({ ...payload, owner_id: userData.user.id, onboarding_done: true } as never);
      error = res.error;
    }
    setSaving(false);
    if (error) {
      const text =
        error.message.includes("duplicate") || error.message.includes("unique")
          ? "Esse endereço de loja já está em uso. Escolha outro."
          : `Não foi possível salvar: ${error.message}`;
      setFeedback({ type: "error", text });
      toast.error(text);
      return;
    }
    setFeedback({ type: "success", text: "Alterações salvas com sucesso." });
    toast.success("Loja atualizada!");
    queryClient.invalidateQueries({ queryKey: ["my-store"] });
  }

  return (
    <AppShell title="Minha loja" description="Personalize sua vitrine">
      <div className="surface space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome da loja</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Nome do vendedor</Label>
            <Input
              value={form.seller_name}
              onChange={(e) => setForm({ ...form, seller_name: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Endereço da vitrine</Label>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>/s/</span>
            <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
          </div>
          <p className="text-xs text-muted-foreground">
            Link curto:{" "}
            {typeof window !== "undefined"
              ? `${window.location.origin}/s/${form.slug || slugify(form.name)}`
              : ""}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label>Descrição</Label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Mensagem de boas-vindas</Label>
          <Textarea
            rows={2}
            value={form.welcome_message}
            onChange={(e) => setForm({ ...form, welcome_message: e.target.value })}
          />
        </div>

        <div className="space-y-3 rounded-xl border border-whatsapp/30 bg-whatsapp/5 p-4">
          <div>
            <p className="text-sm font-semibold">Divulgação</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Personalize a frase que será enviada junto com o link da sua vitrine pelo WhatsApp.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem para compartilhar no WhatsApp</Label>
            <Textarea
              rows={3}
              value={form.share_message}
              placeholder={DEFAULT_SHARE_MESSAGE}
              onChange={(e) => setForm({ ...form, share_message: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Essa mensagem será combinada automaticamente com o link correto da sua loja. Deixe em
              branco para usar a mensagem padrão.
            </p>
          </div>
          <div className="rounded-lg border border-border bg-background/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Prévia do compartilhamento
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm">
              {buildStoreShareMessage(
                form.share_message,
                getStorePublicUrl(form.slug || slugify(form.name)),
              )}
            </p>
          </div>
          {store ? <StoreWhatsAppShare slug={store.slug} message={form.share_message} /> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Instagram</Label>
            <Input
              value={form.instagram}
              placeholder="@sualoja"
              onChange={(e) => setForm({ ...form, instagram: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
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
        </div>

        <div className="space-y-2">
          <Label>Cor da marca</Label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Cor ${color}`}
                onClick={() => setForm({ ...form, primary_color: color })}
                className={`size-8 rounded-full border-2 transition ${
                  form.primary_color === color ? "border-foreground" : "border-transparent"
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage("logo_url", file);
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Banner</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage("banner_url", file);
              }}
            />
            <p className="text-xs text-muted-foreground">
              Tamanho ideal: <span className="font-medium">1920 x 400 pixels</span> (proporção
              larga). Use JPG ou PNG de até 5 MB. A imagem é centralizada e cobre toda a largura da
              página; mantenha o conteúdo importante no meio.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Tipo da chave Pix</Label>
            <Select
              value={form.pix_key_type}
              onValueChange={(v) => setForm({ ...form, pix_key_type: v })}
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
          </div>
          <div className="space-y-1.5">
            <Label>Chave Pix</Label>
            <Input
              value={form.pix_key}
              onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Loja ativa</p>
            <p className="text-xs text-muted-foreground">
              Desative para deixar sua vitrine temporariamente fora do ar.
            </p>
          </div>
          <Switch
            checked={form.is_active}
            onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
          />
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">Formas de pagamento</p>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Aceitar Pix à vista</p>
              <p className="text-xs text-muted-foreground">
                O cliente paga direto na sua chave Pix.
              </p>
            </div>
            <Switch
              checked={form.accept_pix}
              onCheckedChange={(checked) => setForm({ ...form, accept_pix: checked })}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Permitir parcelamento {isPro ? "" : "(PRO)"}</p>
              <p className="text-xs text-muted-foreground">
                Parcelamento combinado direto com o cliente, sem banco ou cartão. Você recebe cada
                parcela por Pix e confirma manualmente.
              </p>
            </div>
            <Switch
              disabled={!isPro}
              checked={form.allow_installments && isPro}
              onCheckedChange={(checked) => setForm({ ...form, allow_installments: checked })}
            />
          </div>

          {form.allow_installments && isPro ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Máximo de parcelas</Label>
                <Select
                  value={String(form.max_installments)}
                  onValueChange={(v) => setForm({ ...form, max_installments: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}x
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor mínimo por parcela (R$)</Label>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  value={form.min_installment_amount}
                  onChange={(e) =>
                    setForm({ ...form, min_installment_amount: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          ) : null}
        </div>

        {feedback ? (
          <p
            role="status"
            className={`rounded-lg border p-3 text-sm ${
              feedback.type === "success"
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {feedback.text}
          </p>
        ) : null}

        <Button className="h-11 w-full" disabled={saving} onClick={save}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </AppShell>
  );
}
