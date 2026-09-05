import { useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Images, Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Paywall } from "@/components/Paywall";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { brl, formatDate } from "@/lib/format";
import { compressImage, uploadAiPage } from "@/lib/images";
import {
  AI_ACCEPTED_IMAGE_TYPES,
  AI_COMPRESS_MAX_SIDE,
  AI_COMPRESS_QUALITY,
  AI_MAX_FILE_BYTES,
  AI_MAX_PAGES_PER_RUN,
} from "@/lib/ai-import.config";
import {
  analyseCatalogPages,
  createProductsFromAi,
  getAiImportStatus,
  listAiImports,
  type AiDraftProduct,
} from "@/lib/ai-import.functions";

export const Route = createFileRoute("/_authenticated/produtos-ia")({
  component: AiProductImport,
  head: () => ({
    meta: [
      { title: "Cadastrar produtos com IA | Vitrini" },
      {
        name: "description",
        content:
          "Fotografe uma página de revista ou catálogo e deixe a IA identificar produtos e preços para sua vitrine.",
      },
      { property: "og:title", content: "Cadastrar produtos com IA | Vitrini" },
      {
        property: "og:description",
        content: "Cadastre vários produtos de uma vez a partir de uma foto do catálogo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Draft = AiDraftProduct & {
  selected: boolean;
  action: "create" | "update" | "skip";
  stock: string;
};

type PageFile = { file: File; preview: string };

function needsReview(draft: Draft) {
  return !draft.name?.trim() || draft.price === null || draft.confidence === "low";
}

function AiProductImport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const analyse = useServerFn(analyseCatalogPages);
  const saveProducts = useServerFn(createProductsFromAi);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [pages, setPages] = useState<PageFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: status, refetch: refetchStatus } = useQuery({
    queryKey: ["ai-import-status"],
    queryFn: () => getAiImportStatus(),
  });
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ["ai-import-history"],
    queryFn: () => listAiImports(),
  });

  const blocked = Boolean(status && status.hasStore && status.remaining <= 0);
  const ready = useMemo(
    () => (drafts ?? []).filter((d) => d.selected && !needsReview(d)),
    [drafts],
  );
  const pending = useMemo(() => (drafts ?? []).filter((d) => needsReview(d)), [drafts]);

  function addFiles(list: FileList | null) {
    if (!list?.length) return;
    const next: PageFile[] = [];
    for (const file of Array.from(list)) {
      if (!AI_ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`"${file.name}" não é uma imagem JPG, PNG ou WEBP.`);
        continue;
      }
      if (file.size > AI_MAX_FILE_BYTES) {
        toast.error(`"${file.name}" é muito grande.`);
        continue;
      }
      next.push({ file, preview: URL.createObjectURL(file) });
    }
    setPages((current) => {
      const combined = [...current, ...next];
      if (combined.length > AI_MAX_PAGES_PER_RUN) {
        toast.info(`Você pode analisar até ${AI_MAX_PAGES_PER_RUN} páginas por vez.`);
      }
      return combined.slice(0, AI_MAX_PAGES_PER_RUN);
    });
  }

  async function runAnalysis() {
    if (!pages.length || busy) return;
    setBusy(true);
    setDrafts(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const payload: { dataUrl: string; imagePath: string | null }[] = [];

      for (let i = 0; i < pages.length; i += 1) {
        setProgress(`Preparando página ${i + 1} de ${pages.length}...`);
        const { dataUrl, blob } = await compressImage(
          pages[i]!.file,
          AI_COMPRESS_MAX_SIDE,
          AI_COMPRESS_QUALITY,
        );
        let imagePath: string | null = null;
        if (userId) {
          try {
            imagePath = await uploadAiPage(userId, blob);
          } catch {
            imagePath = null;
          }
        }
        payload.push({ dataUrl, imagePath });
      }

      setProgress(`🤖 Analisando ${payload.length} página(s)...`);
      const result = await analyse({ data: { pages: payload } });
      await refetchStatus();

      if (result.error === "no-store") {
        toast.error("Crie sua loja antes de cadastrar produtos.");
        return;
      }
      if (result.error === "limit") {
        toast.error("Você já usou todas as análises deste mês.");
        return;
      }
      if (result.error === "provider") {
        toast.error("Não foi possível analisar esta imagem agora. Tente novamente.");
        return;
      }
      if (!result.products.length) {
        setDrafts([]);
        setJobId(result.jobId);
        return;
      }

      setJobId(result.jobId);
      setDrafts(
        result.products.map((product) => ({
          ...product,
          selected: !product.duplicate,
          action: product.duplicate ? "skip" : "create",
          stock: "0",
        })),
      );
      toast.success(`${result.products.length} produto(s) encontrados.`);
      refetchHistory();
    } catch {
      toast.error("Não foi possível analisar esta imagem agora. Tente novamente.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  function update(tempId: string, patch: Partial<Draft>) {
    setDrafts((current) =>
      (current ?? []).map((d) => (d.tempId === tempId ? { ...d, ...patch } : d)),
    );
  }

  async function saveSelected(list: Draft[]) {
    if (!list.length) {
      toast.error("Selecione ao menos um produto.");
      return;
    }
    setSaving(true);
    try {
      const result = await saveProducts({
        data: {
          jobId,
          items: list.map((d) => ({
            name: (d.name ?? "").trim(),
            price: d.price ?? 0,
            originalPrice: d.originalPrice,
            sku: d.sku,
            brand: d.brand,
            description: d.description ?? "",
            categoryName: d.category,
            variants: d.variants,
            stock: Number(d.stock) || 0,
            imagePaths: d.imagePath ? [d.imagePath] : [],
            mode: d.action === "update" ? ("update" as const) : ("create" as const),
            existingProductId: d.action === "update" ? (d.duplicate?.productId ?? null) : null,
          })),
        },
      });
      const total = result.created + result.updated;
      toast.success(`🎉 ${total} produto(s) cadastrados com sucesso!`);
      if (result.failed) toast.error(`${result.failed} produto(s) não puderam ser salvos.`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      refetchHistory();
      navigate({ to: "/produtos" });
    } catch {
      toast.error("Não foi possível cadastrar os produtos agora.");
    } finally {
      setSaving(false);
      setConfirmAll(false);
    }
  }

  return (
    <AppShell
      title="Cadastrar produtos com IA"
      description="Fotografe uma página e deixe a IA identificar os produtos"
    >
      {status && !status.hasStore ? (
        <div className="surface p-4 text-sm">
          Crie sua loja antes de usar o cadastro com IA.{" "}
          <Link to="/minha-loja" className="font-semibold underline">
            Minha Loja
          </Link>
        </div>
      ) : null}

      {status?.hasStore ? (
        <div className="surface mb-4 flex flex-wrap items-center justify-between gap-2 p-4">
          <div>
            <p className="text-sm font-semibold">
              {status.used} de {status.limit} páginas analisadas neste mês
            </p>
            <p className="text-xs text-muted-foreground">
              Plano {status.isPro ? "PRO" : "gratuito"} · o limite renova todo mês
            </p>
          </div>
          <Badge variant="secondary">{status.remaining} restantes</Badge>
        </div>
      ) : null}

      {blocked ? (
        <Paywall
          title="Cadastro Inteligente"
          text={
            status?.isPro
              ? `Você atingiu o limite de ${status.limit} páginas deste mês. O limite renova no próximo mês.`
              : `Você aproveitou suas ${status?.limit ?? 5} análises gratuitas deste mês. Assine o VITRINI PRO para continuar cadastrando produtos automaticamente com IA.`
          }
        />
      ) : (
        <>
          <div className="surface space-y-3 p-4">
            <p className="text-sm text-muted-foreground">
              Fotografe uma página de revista ou catálogo e deixe a IA identificar os produtos,
              preços e outras informações automaticamente.
            </p>

            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              aria-label="Tirar foto da página"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              aria-label="Escolher imagens das páginas"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div
              className="grid gap-2 sm:grid-cols-2"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                addFiles(e.dataTransfer.files);
              }}
            >
              <Button variant="outline" className="h-12" onClick={() => cameraRef.current?.click()}>
                <Camera className="mr-2 size-4" /> Tirar foto
              </Button>
              <Button variant="outline" className="h-12" onClick={() => inputRef.current?.click()}>
                <Images className="mr-2 size-4" /> Escolher imagens
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Você pode adicionar várias páginas (até {AI_MAX_PAGES_PER_RUN} por análise). No
              computador também é possível arrastar e soltar as imagens aqui.
            </p>

            {pages.length ? (
              <>
                <p className="text-sm font-semibold">{pages.length} página(s) selecionada(s)</p>
                <div className="flex flex-wrap gap-2">
                  {pages.map((page, index) => (
                    <div key={page.preview} className="relative">
                      <img
                        src={page.preview}
                        alt={`Página ${index + 1}`}
                        className="size-20 rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        aria-label={`Remover página ${index + 1}`}
                        className="absolute -right-1 -top-1 rounded-full bg-background p-1 shadow"
                        onClick={() => setPages(pages.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <Button className="h-12 w-full" disabled={busy} onClick={runAnalysis}>
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> {progress || "Analisando..."}
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 size-4" /> Analisar páginas
                    </>
                  )}
                </Button>
              </>
            ) : null}
          </div>

          {drafts && drafts.length === 0 ? (
            <div className="surface mt-4 p-4 text-center">
              <p className="text-sm font-semibold">
                Não encontramos produtos identificáveis nesta imagem.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Fotografe novamente com mais iluminação e mantenha a página inteira visível.
              </p>
              <Button
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setDrafts(null);
                  setPages([]);
                }}
              >
                Tentar novamente
              </Button>
            </div>
          ) : null}

          {drafts && drafts.length ? (
            <div className="mt-4 space-y-3">
              <div className="surface flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="text-sm font-semibold">🔎 {drafts.length} produtos encontrados</p>
                  <p className="text-xs text-muted-foreground">
                    {ready.length} prontos para cadastro · {pending.length} precisam de revisão
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDrafts(drafts.map((d) => ({ ...d, selected: !d.selected || false })))
                    }
                  >
                    Selecionar todos
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDrafts(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>

              {drafts.map((draft) => (
                <div key={draft.tempId} className="surface flex gap-3 p-3">
                  <Checkbox
                    className="mt-1"
                    aria-label={`Selecionar ${draft.name ?? "produto"}`}
                    checked={draft.selected}
                    onCheckedChange={(v) => update(draft.tempId, { selected: Boolean(v) })}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{draft.name ?? "Não identificado"}</p>
                    <p className="text-sm text-muted-foreground">
                      {draft.price === null ? "Preço não identificado" : brl(draft.price)}
                      {draft.originalPrice ? ` · antes ${brl(draft.originalPrice)}` : ""}
                      {draft.sku ? ` · Código ${draft.sku}` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge variant="secondary">
                        {draft.confidence === "high"
                          ? "🟢 Alta confiança"
                          : draft.confidence === "medium"
                            ? "🟡 Média confiança"
                            : "🔴 Baixa confiança"}
                      </Badge>
                      {draft.category ? <Badge variant="outline">{draft.category}</Badge> : null}
                      {draft.brand ? <Badge variant="outline">{draft.brand}</Badge> : null}
                      {draft.variants.length ? (
                        <Badge variant="outline">{draft.variants.length} variações</Badge>
                      ) : null}
                    </div>
                    {draft.warnings.length || needsReview(draft) ? (
                      <p className="mt-1 text-xs text-amber-600">
                        ⚠️ {draft.warnings.join(" · ") || "Precisa de revisão"}
                      </p>
                    ) : null}
                    {draft.duplicate ? (
                      <div className="mt-2 rounded-lg border border-border p-2">
                        <p className="text-xs">
                          ⚠️ &quot;{draft.duplicate.productName}&quot; já existe na sua loja
                          {draft.duplicate.matchedBy === "sku" ? " (mesmo código)" : ""}.
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant={draft.action === "update" ? "default" : "outline"}
                            onClick={() =>
                              update(draft.tempId, { action: "update", selected: true })
                            }
                          >
                            Atualizar produto
                          </Button>
                          <Button
                            size="sm"
                            variant={draft.action === "create" ? "default" : "outline"}
                            onClick={() =>
                              update(draft.tempId, { action: "create", selected: true })
                            }
                          >
                            Criar como novo
                          </Button>
                          <Button
                            size="sm"
                            variant={draft.action === "skip" ? "default" : "outline"}
                            onClick={() => update(draft.tempId, { action: "skip", selected: false })}
                          >
                            Ignorar
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {draft.imagePath ? <PagePreview path={draft.imagePath} /> : null}
                    <Button size="sm" variant="ghost" onClick={() => setEditing(draft)}>
                      ✏️ Editar
                    </Button>
                  </div>
                </div>
              ))}

              <div className="surface sticky bottom-16 flex flex-wrap gap-2 p-3 md:bottom-4">
                <Button
                  className="flex-1"
                  disabled={saving || !ready.length}
                  onClick={() => saveSelected(ready)}
                >
                  {saving ? "Salvando..." : `Cadastrar selecionados (${ready.length})`}
                </Button>
                <Button
                  variant="outline"
                  disabled={saving || pending.length > 0 || !drafts.length}
                  onClick={() => setConfirmAll(true)}
                >
                  Cadastrar todos
                </Button>
              </div>
            </div>
          ) : null}
        </>
      )}

      {history?.length ? (
        <div className="surface mt-6 p-4">
          <p className="text-sm font-semibold">📷 Importações com IA</p>
          <div className="mt-2 space-y-2">
            {history.map((row) => (
              <div key={row.id} className="flex items-center justify-between text-xs">
                <span>{formatDate(row.createdAt)}</span>
                <span className="text-muted-foreground">
                  {row.pages} página(s) · {row.productsFound} encontrados · {row.productsCreated}{" "}
                  cadastrados
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={Boolean(editing)} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar produto</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <Field label="Nome">
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Preço">
                  <Input
                    inputMode="decimal"
                    value={editing.price === null ? "" : String(editing.price)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        price: e.target.value
                          ? Number(e.target.value.replace(",", ".")) || 0
                          : null,
                      })
                    }
                  />
                </Field>
                <Field label="Preço original">
                  <Input
                    inputMode="decimal"
                    value={editing.originalPrice === null ? "" : String(editing.originalPrice)}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        originalPrice: e.target.value
                          ? Number(e.target.value.replace(",", ".")) || 0
                          : null,
                      })
                    }
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Código / SKU">
                  <Input
                    value={editing.sku ?? ""}
                    onChange={(e) => setEditing({ ...editing, sku: e.target.value || null })}
                  />
                </Field>
                <Field label="Marca">
                  <Input
                    value={editing.brand ?? ""}
                    onChange={(e) => setEditing({ ...editing, brand: e.target.value || null })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Categoria">
                  <Input
                    value={editing.category ?? ""}
                    onChange={(e) => setEditing({ ...editing, category: e.target.value || null })}
                  />
                </Field>
                <Field label="Estoque">
                  <Input
                    inputMode="numeric"
                    value={editing.stock}
                    onChange={(e) => setEditing({ ...editing, stock: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Descrição">
                <Textarea
                  rows={3}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </Field>
              <Field label="Variações (separadas por vírgula)">
                <Input
                  value={editing.variants.join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      variants: e.target.value
                        .split(",")
                        .map((v) => v.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                if (!editing) return;
                update(editing.tempId, { ...editing, selected: true });
                setEditing(null);
              }}
            >
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAll} onOpenChange={setConfirmAll}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar cadastro</DialogTitle>
          </DialogHeader>
          <p className="text-sm">
            Você está prestes a cadastrar {drafts?.length ?? 0} produtos na sua vitrine.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmAll(false)}>
              Cancelar
            </Button>
            <Button
              disabled={saving}
              onClick={() => saveSelected((drafts ?? []).filter((d) => d.action !== "skip"))}
            >
              <Sparkles className="mr-2 size-4" /> Confirmar cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PagePreview({ path }: { path: string }) {
  const { data } = useQuery({
    queryKey: ["asset", path],
    queryFn: async () => {
      const { resolveAsset } = await import("@/lib/images");
      return resolveAsset(path);
    },
  });
  if (!data) return null;
  return <img src={data} alt="Página analisada" className="size-14 rounded-lg object-cover" />;
}
