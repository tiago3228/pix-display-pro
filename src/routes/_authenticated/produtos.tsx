import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Eye, EyeOff, ImageIcon, Package, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { ProductPhotos } from "@/components/ProductPhotos";
import { getSignedAssetUrl } from "@/lib/images.functions";
import { FREE_PLAN_PRODUCT_LIMIT, brl } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/produtos")({
  component: Products,
});

type VariantDraft = { id?: string; label: string; price: string; stock: string };
type OrderTierDraft = { minQuantity: string; unitPrice: string };

type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  track_stock: boolean;
  has_variants: boolean;
  is_hidden: boolean;
  is_featured: boolean;
  image_url: string | null;
  category_id: string | null;
  product_variants: { id: string; label: string; price: number | null; stock: number }[];
  order_enabled: boolean;
  order_unit_price: number | null;
  order_min_quantity: number;
  order_max_quantity: number | null;
  order_lead_time: string | null;
  order_notes: string | null;
  order_progressive_pricing: boolean;
  product_order_tiers?: { min_quantity: number; unit_price: number }[];
};

const emptyForm = {
  name: "",
  description: "",
  price: "",
  stock: "",
  track_stock: false,
  is_hidden: false,
  is_featured: false,
  category_id: "none",
  order_enabled: false,
  order_unit_price: "",
  order_min_quantity: "1",
  order_max_quantity: "",
  order_lead_time: "",
  order_notes: "",
  order_progressive_pricing: false,
};

function Products() {
  const { data: store } = useMyStore();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [optionName, setOptionName] = useState("Tamanho");
  const [orderTiers, setOrderTiers] = useState<OrderTierDraft[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const { data: categories } = useQuery({
    queryKey: ["categories", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name")
        .eq("store_id", store!.id)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products", store?.id],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, description, price, stock, track_stock, has_variants, is_hidden, is_featured, image_url, category_id, order_enabled, order_unit_price, order_min_quantity, order_max_quantity, order_lead_time, order_notes, order_progressive_pricing, product_variants(id, label, price, stock), product_order_tiers(min_quantity, unit_price)",
        )
        .eq("store_id", store!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  const limitReached = store?.plan !== "pro" && (products?.length ?? 0) >= FREE_PLAN_PRODUCT_LIMIT;

  function openNew() {
    if (limitReached) {
      toast.error(
        `O plano Básica permite até ${FREE_PLAN_PRODUCT_LIMIT} produtos. Assine o PRO para adicionar mais.`,
      );
      return;
    }
    setEditing(null);
    setForm(emptyForm);
    setVariants([]);
    setOrderTiers([]);
    setPhotos([]);
    setOpen(true);
  }

  function openEdit(product: ProductRow) {
    setEditing(product);
    setForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      stock: String(product.stock),
      track_stock: product.track_stock,
      is_hidden: product.is_hidden,
      is_featured: product.is_featured,
      category_id: product.category_id ?? "none",
      order_enabled: product.order_enabled,
      order_unit_price: product.order_unit_price === null ? "" : String(product.order_unit_price),
      order_min_quantity: String(product.order_min_quantity ?? 1),
      order_max_quantity:
        product.order_max_quantity === null ? "" : String(product.order_max_quantity),
      order_lead_time: product.order_lead_time ?? "",
      order_notes: product.order_notes ?? "",
      order_progressive_pricing: product.order_progressive_pricing,
    });
    setVariants(
      product.product_variants.map((v) => ({
        id: v.id,
        label: v.label,
        price: v.price === null ? "" : String(v.price),
        stock: String(v.stock),
      })),
    );
    setOrderTiers(
      (product.product_order_tiers ?? []).map((tier) => ({
        minQuantity: String(tier.min_quantity),
        unitPrice: String(tier.unit_price),
      })),
    );
    setPhotos(product.image_url ? [product.image_url] : []);
    supabase
      .from("product_images")
      .select("image_url, position")
      .eq("product_id", product.id)
      .order("position")
      .then(({ data }) => {
        const list = (data ?? []).map((row) => row.image_url as string);
        if (list.length) setPhotos(list);
      });
    setOpen(true);
  }

  async function save() {
    if (!store) {
      toast.error("Crie sua loja antes de cadastrar produtos.");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    const normalizedTiers = orderTiers.map((tier) => ({
      minQuantity: Number(tier.minQuantity),
      unitPrice: Number(String(tier.unitPrice).replace(",", ".")),
    }));
    if (form.order_enabled) {
      const unitPrice = Number(String(form.order_unit_price).replace(",", "."));
      const minQuantity = Number(form.order_min_quantity);
      const maxQuantity = form.order_max_quantity ? Number(form.order_max_quantity) : null;
      if (
        unitPrice <= 0 ||
        minQuantity < 1 ||
        (maxQuantity !== null && maxQuantity < minQuantity)
      ) {
        toast.error("Informe preço e quantidades válidos para a encomenda.");
        return;
      }
      if (normalizedTiers.some((tier) => tier.minQuantity < minQuantity || tier.unitPrice <= 0)) {
        toast.error("Revise as faixas de preço da encomenda.");
        return;
      }
      if (
        new Set(normalizedTiers.map((tier) => tier.minQuantity)).size !== normalizedTiers.length ||
        normalizedTiers.some(
          (tier, index) => index > 0 && tier.unitPrice > normalizedTiers[index - 1]!.unitPrice,
        )
      ) {
        toast.error("As faixas não podem repetir quantidades nem aumentar o preço por unidade.");
        return;
      }
    }
    setSaving(true);
    const imagePath = photos[0] ?? null;

    const cleanVariants = variants.filter((v) => v.label.trim());
    const payload = {
      store_id: store.id,
      name: form.name.trim(),
      description: form.description ?? "",
      price: Number(String(form.price).replace(",", ".")) || 0,
      stock: Number(form.stock) || 0,
      track_stock: form.track_stock,
      is_hidden: form.is_hidden,
      is_featured: form.is_featured,
      has_variants: cleanVariants.length > 0,
      category_id: form.category_id === "none" ? null : form.category_id,
      ...(photos.length || editing ? { image_url: imagePath } : {}),
      updated_at: new Date().toISOString(),
      order_enabled: form.order_enabled,
      order_unit_price: form.order_enabled
        ? Number(String(form.order_unit_price).replace(",", "."))
        : null,
      order_min_quantity: form.order_enabled ? Number(form.order_min_quantity) : 1,
      order_max_quantity:
        form.order_enabled && form.order_max_quantity ? Number(form.order_max_quantity) : null,
      order_lead_time: form.order_enabled ? form.order_lead_time.trim() || null : null,
      order_notes: form.order_enabled ? form.order_notes.trim() || null : null,
      order_progressive_pricing: form.order_enabled && form.order_progressive_pricing,
    };

    const { data: saved, error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id).select("id").single()
      : await supabase.from("products").insert(payload).select("id").single();

    if (error || !saved) {
      setSaving(false);
      toast.error(error?.message || "Não foi possível salvar o produto.");
      return;
    }

    const { error: deleteImagesError } = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", saved.id);
    if (deleteImagesError) {
      setSaving(false);
      toast.error(`Não foi possível atualizar as fotos: ${deleteImagesError.message}`);
      return;
    }
    if (photos.length) {
      const { error: insertImagesError } = await supabase.from("product_images").insert(
        photos.map((path, position) => ({
          product_id: saved.id,
          store_id: store.id,
          image_url: path,
          position,
        })),
      );
      if (insertImagesError) {
        setSaving(false);
        toast.error(`Não foi possível salvar as fotos: ${insertImagesError.message}`);
        return;
      }
    }
    await supabase.from("product_order_tiers").delete().eq("product_id", saved.id);
    if (form.order_enabled && form.order_progressive_pricing && normalizedTiers.length) {
      const { error: tierError } = await supabase.from("product_order_tiers").insert(
        normalizedTiers.map((tier) => ({
          product_id: saved.id,
          min_quantity: tier.minQuantity,
          unit_price: tier.unitPrice,
        })),
      );
      if (tierError) {
        setSaving(false);
        toast.error(`Não foi possível salvar as faixas: ${tierError.message}`);
        return;
      }
    }

    await supabase.from("product_variants").delete().eq("product_id", saved.id);
    await supabase.from("product_options").delete().eq("product_id", saved.id);

    if (cleanVariants.length) {
      const { data: option } = await supabase
        .from("product_options")
        .insert({ product_id: saved.id, name: optionName || "Opção" })
        .select("id")
        .single();
      if (option) {
        await supabase.from("product_option_values").insert(
          cleanVariants.map((v, index) => ({
            option_id: option.id,
            value: v.label.trim(),
            position: index,
          })),
        );
      }
      await supabase.from("product_variants").insert(
        cleanVariants.map((v) => ({
          product_id: saved.id,
          label: v.label.trim(),
          price: v.price ? Number(v.price.replace(",", ".")) : null,
          stock: Number(v.stock) || 0,
        })),
      );
    }

    setSaving(false);
    setOpen(false);
    toast.success(editing ? "Produto atualizado!" : "Produto criado!");
    queryClient.invalidateQueries({ queryKey: ["products", store.id] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", store.id] });
  }

  async function remove(product: ProductRow) {
    if (!confirm(`Excluir "${product.name}"?`)) return;
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      toast.error("Não foi possível excluir.");
      return;
    }
    toast.success("Produto excluído.");
    queryClient.invalidateQueries({ queryKey: ["products", store?.id] });
  }

  async function toggle(product: ProductRow, field: "is_hidden" | "is_featured") {
    await supabase
      .from("products")
      .update({ [field]: !product[field] } as never)
      .eq("id", product.id);
    queryClient.invalidateQueries({ queryKey: ["products", store?.id] });
  }

  async function addCategory() {
    if (!newCategory.trim() || !store) return;
    const { error } = await supabase
      .from("categories")
      .insert({ store_id: store.id, name: newCategory.trim() });
    if (error) {
      toast.error("Não foi possível criar a categoria.");
      return;
    }
    setNewCategory("");
    queryClient.invalidateQueries({ queryKey: ["categories", store.id] });
  }

  return (
    <AppShell
      title="Produtos"
      description={`${products?.length ?? 0} produto(s) na sua vitrine`}
      action={
        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" variant="outline" asChild>
            <Link to="/produtos-ia" aria-label="Cadastrar com IA">
              <Camera className="size-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Cadastrar com IA</span>
            </Link>
          </Button>
          <Button size="sm" onClick={openNew} aria-label="Cadastrar produto manualmente">
            <Plus className="size-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Manual</span>
          </Button>
        </div>
      }
    >
      {limitReached ? (
        <div className="surface mb-4 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm">
            Você atingiu o limite de {FREE_PLAN_PRODUCT_LIMIT} produtos do plano Básica.
          </p>
          <Button size="sm" asChild>
            <Link to="/assinatura">Assinar o Pro</Link>
          </Button>
        </div>
      ) : null}

      <div className="surface mb-4 p-4">
        <p className="text-sm font-semibold">Categorias</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(categories ?? []).map((category) => (
            <Badge key={category.id} variant="secondary">
              {category.name}
            </Badge>
          ))}
          {!categories?.length ? (
            <p className="text-xs text-muted-foreground">Nenhuma categoria criada.</p>
          ) : null}
        </div>
        <div className="mt-3 flex gap-2">
          <Input
            placeholder="Nova categoria"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <Button variant="outline" onClick={addCategory}>
            Adicionar
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {(products ?? []).map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onEdit={() => openEdit(product)}
            onRemove={() => remove(product)}
            onToggle={(field) => toggle(product, field)}
          />
        ))}
        {!products?.length ? (
          <div className="surface p-10 text-center text-sm text-muted-foreground">
            Você ainda não cadastrou produtos.
          </div>
        ) : null}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Descrição</Label>
                <span className="text-xs text-muted-foreground">{form.description.length}/300</span>
              </div>
              <Textarea
                rows={4}
                maxLength={300}
                placeholder="Ex.: Anel de prata 925 com zircônia, tamanho ajustável"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preço (R$)</Label>
                <Input
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Estoque</Label>
                <Input
                  inputMode="numeric"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={form.category_id}
                onValueChange={(v) => setForm({ ...form, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {(categories ?? []).map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ProductPhotos
              paths={photos}
              onChange={setPhotos}
              onUploadingChange={setUploadingPhoto}
            />

            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Variações</p>
                  <p className="text-xs text-muted-foreground">
                    Ex.: tamanhos, sabores ou cores com preço e estoque próprios.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setVariants([...variants, { label: "", price: "", stock: "" }])}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              {variants.length ? (
                <div className="space-y-1.5">
                  <Label>Nome do grupo</Label>
                  <Input
                    value={optionName}
                    onChange={(e) => setOptionName(e.target.value)}
                    placeholder="Tamanho"
                  />
                </div>
              ) : null}
              {variants.map((variant, index) => (
                <div key={index} className="grid grid-cols-[1fr_84px_72px_auto] items-end gap-2">
                  <Input
                    placeholder="Opção"
                    value={variant.label}
                    onChange={(e) => {
                      const next = [...variants];
                      next[index] = { ...variant, label: e.target.value };
                      setVariants(next);
                    }}
                  />
                  <Input
                    placeholder="Preço"
                    inputMode="decimal"
                    value={variant.price}
                    onChange={(e) => {
                      const next = [...variants];
                      next[index] = { ...variant, price: e.target.value };
                      setVariants(next);
                    }}
                  />
                  <Input
                    placeholder="Estq."
                    inputMode="numeric"
                    value={variant.stock}
                    onChange={(e) => {
                      const next = [...variants];
                      next[index] = { ...variant, stock: e.target.value };
                      setVariants(next);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remover variação"
                    onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <ToggleRow
                label="📦 Disponibilizar para encomenda"
                checked={form.order_enabled}
                onChange={(v) => setForm({ ...form, order_enabled: v })}
              />
              {form.order_enabled ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Preço por unidade (R$)</Label>
                      <Input
                        inputMode="decimal"
                        value={form.order_unit_price}
                        onChange={(e) => setForm({ ...form, order_unit_price: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Quantidade mínima</Label>
                      <Input
                        inputMode="numeric"
                        value={form.order_min_quantity}
                        onChange={(e) => setForm({ ...form, order_min_quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Quantidade máxima</Label>
                      <Input
                        inputMode="numeric"
                        value={form.order_max_quantity}
                        onChange={(e) => setForm({ ...form, order_max_quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Prazo de produção</Label>
                      <Input
                        placeholder="Ex.: 7 dias úteis"
                        value={form.order_lead_time}
                        onChange={(e) => setForm({ ...form, order_lead_time: e.target.value })}
                      />
                    </div>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Observações: cores, tamanhos, sabores..."
                    value={form.order_notes}
                    onChange={(e) => setForm({ ...form, order_notes: e.target.value })}
                  />
                  <ToggleRow
                    label="Ativar preço progressivo por quantidade"
                    checked={form.order_progressive_pricing}
                    onChange={(v) => setForm({ ...form, order_progressive_pricing: v })}
                  />
                  {form.order_progressive_pricing ? (
                    <div className="space-y-2">
                      {orderTiers.map((tier, index) => (
                        <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                          <Input
                            placeholder="A partir de"
                            inputMode="numeric"
                            value={tier.minQuantity}
                            onChange={(e) =>
                              setOrderTiers(
                                orderTiers.map((item, i) =>
                                  i === index ? { ...item, minQuantity: e.target.value } : item,
                                ),
                              )
                            }
                          />
                          <Input
                            placeholder="Preço/unidade"
                            inputMode="decimal"
                            value={tier.unitPrice}
                            onChange={(e) =>
                              setOrderTiers(
                                orderTiers.map((item, i) =>
                                  i === index ? { ...item, unitPrice: e.target.value } : item,
                                ),
                              )
                            }
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setOrderTiers(orderTiers.filter((_, i) => i !== index))}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setOrderTiers([...orderTiers, { minQuantity: "", unitPrice: "" }])
                        }
                      >
                        <Plus className="mr-1 size-4" /> Adicionar faixa
                      </Button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <ToggleRow
              label="Controlar estoque"
              checked={form.track_stock}
              onChange={(v) => setForm({ ...form, track_stock: v })}
            />
            <ToggleRow
              label="Destacar na vitrine"
              checked={form.is_featured}
              onChange={(v) => setForm({ ...form, is_featured: v })}
            />
            <ToggleRow
              label="Ocultar da vitrine"
              checked={form.is_hidden}
              onChange={(v) => setForm({ ...form, is_hidden: v })}
            />
          </div>

          <DialogFooter>
            <Button className="w-full" disabled={saving || uploadingPhoto} onClick={save}>
              {saving ? "Salvando..." : uploadingPhoto ? "Aguardando foto..." : "Salvar produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ProductCard({
  product,
  onEdit,
  onRemove,
  onToggle,
}: {
  product: ProductRow;
  onEdit: () => void;
  onRemove: () => void;
  onToggle: (field: "is_hidden" | "is_featured") => void;
}) {
  const [image, setImage] = useState<string | null>(null);
  const signAsset = useServerFn(getSignedAssetUrl);
  useEffect(() => {
    if (!product.image_url) {
      setImage(null);
      return;
    }
    if (product.image_url.startsWith("http")) {
      setImage(product.image_url);
      return;
    }
    void signAsset({ data: { path: product.image_url } })
      .then((result) => setImage(result.url))
      .catch(() => setImage(null));
  }, [product.image_url, signAsset]);

  return (
    <div className="surface flex items-center gap-3 p-3">
      <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
        {image ? (
          <img src={image} alt={product.name} className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{product.name}</p>
          {product.is_featured ? <Star className="size-3.5 fill-primary text-primary" /> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {brl(Number(product.price))}
          {product.has_variants ? ` · ${product.product_variants.length} variações` : ""}
          {product.track_stock ? ` · ${product.stock} em estoque` : ""}
        </p>
        {product.is_hidden ? (
          <Badge variant="secondary" className="mt-1">
            Oculto
          </Badge>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Destacar"
          onClick={() => onToggle("is_featured")}
        >
          <Star className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Ocultar"
          onClick={() => onToggle("is_hidden")}
        >
          {product.is_hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button size="icon" variant="ghost" aria-label="Editar" onClick={onEdit}>
          <Pencil className="size-4" />
        </Button>
        <Button size="icon" variant="ghost" aria-label="Excluir" onClick={onRemove}>
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}
