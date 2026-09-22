import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { uploadAsset } from "@/lib/images";
import { PIX_KEY_TYPES, STORE_CATEGORIES, slugify } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
const VITRINI_PALETTE = {
  primary_color: "#111827",
  secondary_color: "#0f766e",
  accent_color: "#f59e0b",
  background_color: "#f8fafc",
  text_color: "#111827",
  button_color: "#111827",
};
const ADVANCED_PALETTE = {
  text_secondary: "#64748b",
  header: "#111827",
  menu: "#ffffff",
  links: "#0f766e",
  prices: "#111827",
  offers: "#dc2626",
  badges: "#f59e0b",
  cards: "#ffffff",
  borders: "#e2e8f0",
  footer: "#111827",
  filters: "#f1f5f9",
};
const PALETTE_LABELS: Record<keyof typeof ADVANCED_PALETTE, string> = {
  text_secondary: "Cor do texto secundário",
  header: "Cor do cabeçalho",
  menu: "Cor do menu",
  links: "Cor dos links",
  prices: "Cor dos preços",
  offers: "Cor das ofertas",
  badges: "Cor dos badges",
  cards: "Cor dos cards",
  borders: "Cor das bordas",
  footer: "Cor do rodapé",
  filters: "Cor dos filtros",
};

const BANNER_SUGGESTIONS = [
  {
    key: "clothing-new",
    niche: "👕 Roupas",
    title: "Nova coleção",
    subtitle: "Descubra as novidades da loja",
    cta: "Ver coleção",
    gradient: "linear-gradient(120deg,#111827,#0f766e)",
  },
  {
    key: "clothing-offers",
    niche: "👕 Roupas",
    title: "Ofertas especiais",
    subtitle: "Escolhas especiais para você",
    cta: "Ver ofertas",
    gradient: "linear-gradient(120deg,#7c2d12,#f59e0b)",
  },
  {
    key: "sports-season",
    niche: "⚽ Roupas Esportivas",
    title: "Nova temporada",
    subtitle: "Vista sua paixão pelo esporte",
    cta: "Explorar agora",
    gradient: "linear-gradient(120deg,#172554,#2563eb)",
  },
  {
    key: "training-performance",
    niche: "🏋️ Treino / Academia",
    title: "Performance em movimento",
    subtitle: "Prepare-se para o seu próximo desafio",
    cta: "Ver coleção",
    gradient: "linear-gradient(120deg,#14532d,#16a34a)",
  },
  {
    key: "shoes-launch",
    niche: "👟 Calçados",
    title: "Novidades",
    subtitle: "Encontre seu próximo par",
    cta: "Ver novidades",
    gradient: "linear-gradient(120deg,#3b0764,#a855f7)",
  },
];

function MyStore() {
  const { data: store, refetch } = useMyStore();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );
  const [palettePreview, setPalettePreview] = useState(false);
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#90ee90");
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
    secondary_color: VITRINI_PALETTE.secondary_color,
    accent_color: VITRINI_PALETTE.accent_color,
    background_color: VITRINI_PALETTE.background_color,
    text_color: VITRINI_PALETTE.text_color,
    button_color: VITRINI_PALETTE.button_color,
    theme_palette: { ...ADVANCED_PALETTE, custom_colors: [] as { name: string; hex: string }[] },
  });
  const banners = useQuery({
    queryKey: ["storefront-banners", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("storefront_banners")
        .select("*")
        .eq("store_id", store!.id)
        .order("position")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
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
      secondary_color:
        (store as typeof store & { secondary_color?: string }).secondary_color ??
        VITRINI_PALETTE.secondary_color,
      accent_color:
        (store as typeof store & { accent_color?: string }).accent_color ??
        VITRINI_PALETTE.accent_color,
      background_color:
        (store as typeof store & { background_color?: string }).background_color ??
        VITRINI_PALETTE.background_color,
      text_color:
        (store as typeof store & { text_color?: string }).text_color ?? VITRINI_PALETTE.text_color,
      button_color:
        (store as typeof store & { button_color?: string }).button_color ??
        VITRINI_PALETTE.button_color,
      theme_palette: {
        ...ADVANCED_PALETTE,
        custom_colors: [],
        ...((store as typeof store & { theme_palette?: Record<string, unknown> }).theme_palette ??
          {}),
      },
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
        .update({ ...payload, slug: payload.slug || current.slug } as never)
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

  async function restorePalette() {
    if (
      !store ||
      !window.confirm(
        "Restaurar cores padrão? Suas cores personalizadas serão substituídas pela paleta padrão Vitrini.",
      )
    )
      return;
    const { error } = await supabase
      .from("stores")
      .update(VITRINI_PALETTE as never)
      .eq("id", store.id);
    if (error) return toast.error("Não foi possível restaurar a paleta.");
    setForm((current) => ({
      ...current,
      ...VITRINI_PALETTE,
      theme_palette: { ...ADVANCED_PALETTE, custom_colors: [] },
    }));
    setPalettePreview(false);
    queryClient.invalidateQueries({ queryKey: ["my-store"] });
    toast.success("Paleta padrão Vitrini aplicada.");
  }

  async function addBannerSuggestion(suggestion: (typeof BANNER_SUGGESTIONS)[number]) {
    if (!store) return;
    const { error } = await supabase.from("storefront_banners").insert({
      store_id: store.id,
      title: suggestion.title,
      subtitle: suggestion.subtitle,
      cta_label: suggestion.cta,
      template_key: suggestion.key,
      is_active: false,
      position: banners.data?.length ?? 0,
    });
    if (error) return toast.error("Não foi possível adicionar o banner.");
    await queryClient.invalidateQueries({ queryKey: ["storefront-banners", store.id] });
    toast.success("Banner copiado para sua loja. Agora você pode editá-lo.");
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

        <CollapsibleSection
          title="🎨 Aparência"
          description="Cores da marca e padrão visual Vitrini"
        >
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: form.background_color, color: form.text_color }}
          >
            <div
              className="flex items-center justify-between rounded-lg p-3"
              style={{ backgroundColor: form.primary_color, color: "#fff" }}
            >
              <span className="font-semibold">Prévia da sua loja</span>
              <button
                type="button"
                className="rounded-md px-3 py-1 text-xs font-semibold"
                style={{ backgroundColor: form.accent_color }}
              >
                Comprar
              </button>
            </div>
            <div className="mt-3 rounded-lg border p-3">
              <p className="font-semibold">Produto em destaque</p>
              <p className="mt-1 text-sm" style={{ color: form.secondary_color }}>
                Nova coleção disponível
              </p>
              <p className="mt-2 font-bold">R$ 129,90</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300/50 bg-amber-50 p-3 dark:bg-amber-950/20">
            <div>
              <p className="text-sm font-semibold">🎨 Usar padrão Vitrini</p>
              <p className="text-xs text-muted-foreground">
                Aplique automaticamente uma combinação moderna e vistosa para sua loja.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPalettePreview((value) => !value)}
            >
              🔄 Aplicar padrão
            </Button>
          </div>
          {palettePreview ? (
            <div className="mt-3 space-y-3 rounded-lg border p-3">
              <p className="text-sm font-semibold">Prévia da paleta padrão</p>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div
                  className="rounded p-3 text-white"
                  style={{ backgroundColor: VITRINI_PALETTE.primary_color }}
                >
                  Cabeçalho
                </div>
                <div
                  className="rounded p-3 text-white"
                  style={{ backgroundColor: VITRINI_PALETTE.secondary_color }}
                >
                  Menu
                </div>
                <div
                  className="rounded p-3"
                  style={{ backgroundColor: VITRINI_PALETTE.accent_color }}
                >
                  Destaque
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setPalettePreview(false)}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => void restorePalette()}>
                  Restaurar padrão
                </Button>
              </div>
            </div>
          ) : null}
          <div className="mt-4 space-y-3 rounded-lg border p-3">
            <div>
              <p className="text-sm font-semibold">🎨 Paleta da minha marca</p>
              <p className="text-xs text-muted-foreground">
                Escolha qualquer cor e defina onde ela será usada. As alterações são salvas junto
                com a loja.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(PALETTE_LABELS).map(([key, label]) => {
                const paletteKey = key as keyof typeof ADVANCED_PALETTE;
                const value = String(
                  form.theme_palette[paletteKey] ?? ADVANCED_PALETTE[paletteKey],
                );
                return (
                  <div key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={value}
                      aria-label={label}
                      className="size-9 cursor-pointer rounded border p-0.5"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          theme_palette: {
                            ...current.theme_palette,
                            [paletteKey]: event.target.value,
                          },
                        }))
                      }
                    />
                    <div className="min-w-0 flex-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={value}
                        maxLength={7}
                        className="h-8 font-mono text-xs uppercase"
                        onChange={(event) => {
                          const next = event.target.value;
                          if (/^#[0-9a-f]{0,6}$/i.test(next))
                            setForm((current) => ({
                              ...current,
                              theme_palette: { ...current.theme_palette, [paletteKey]: next },
                            }));
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="mb-2 text-xs font-semibold">➕ Adicionar código de cor</p>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  placeholder="#90EE90"
                  value={customColorHex}
                  onChange={(event) => setCustomColorHex(event.target.value)}
                />
                <Input
                  placeholder="Nome da cor"
                  value={customColorName}
                  onChange={(event) => setCustomColorName(event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(customColorHex))
                      return toast.error("Informe um código HEX válido.");
                    setForm((current) => ({
                      ...current,
                      theme_palette: {
                        ...current.theme_palette,
                        custom_colors: [
                          ...(current.theme_palette.custom_colors ?? []),
                          {
                            name: customColorName.trim() || "Cor personalizada",
                            hex: customColorHex.toUpperCase(),
                          },
                        ],
                      },
                    }));
                    setCustomColorName("");
                  }}
                >
                  Adicionar
                </Button>
              </div>
              {form.theme_palette.custom_colors?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.theme_palette.custom_colors.map(
                    (color: { name: string; hex: string }, index: number) => (
                      <span
                        key={`${color.hex}-${index}`}
                        className="inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs"
                      >
                        <span
                          className="size-3 rounded-full"
                          style={{ backgroundColor: color.hex }}
                        />
                        {color.name} {color.hex}
                      </span>
                    ),
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="🖼️ Banners" description="Sugestões por nicho e cópias editáveis">
          <p className="mb-3 text-sm text-muted-foreground">
            Sem problema. Encontramos algumas sugestões para o seu tipo de loja. Usar uma sugestão
            cria uma cópia editável e não altera o modelo original.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {BANNER_SUGGESTIONS.map((suggestion) => (
              <article key={suggestion.key} className="overflow-hidden rounded-xl border">
                <div
                  className="flex min-h-28 flex-col justify-end p-4 text-white"
                  style={{ background: suggestion.gradient }}
                >
                  <p className="text-lg font-bold uppercase">{suggestion.title}</p>
                  <p className="text-xs opacity-90">{suggestion.subtitle}</p>
                </div>
                <div className="space-y-2 p-3">
                  <p className="text-xs text-muted-foreground">
                    {suggestion.niche} · Banner promocional
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void addBannerSuggestion(suggestion)}
                  >
                    Usar este banner
                  </Button>
                </div>
              </article>
            ))}
          </div>
          {banners.data?.length ? (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold">Banners da sua loja</p>
              {banners.data.map((banner) => (
                <div
                  key={banner.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{banner.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Cópia editável · {banner.is_active ? "Ativo" : "Rascunho"}
                    </p>
                  </div>
                  <Badge variant={banner.is_active ? "default" : "outline"}>
                    {banner.is_active ? "Ativo" : "Editar"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : null}
        </CollapsibleSection>

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
