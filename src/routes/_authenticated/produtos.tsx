import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Eye,
  EyeOff,
  ImageIcon,
  Package,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyStore } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { ProductPhotos } from "@/components/ProductPhotos";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { getSignedAssetUrl } from "@/lib/images.functions";
import { FREE_PLAN_PRODUCT_LIMIT, brl } from "@/lib/format";
import { listSportsNodes, sportsDb, type SportsNode } from "@/lib/sports";
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
type SmartSuggestion = {
  module: "roupas" | "roupas_esportivas" | "roupas_treino" | "calcados";
  brand: string | null;
  model: string | null;
  category: string;
  color: string | null;
  gender: string | null;
  size: string | null;
  name: string;
};

function interpretProductText(input: string): SmartSuggestion {
  const text = input.trim();
  const lower = text.toLocaleLowerCase("pt-BR");
  const module =
    /tênis|tenis|sapato|bota|sandália|sandalia|ch sinelo|nike|adidas|mizuno|puma|vans|olympikus|asics/.test(
      lower,
    )
      ? "calcados"
      : /fitness|academia|legging|top|treino|dry fit/.test(lower)
        ? "roupas_treino"
        : /flamengo|vasco|corinthians|seleção|selecao|camisa de futebol|futebol/.test(lower)
          ? "roupas_esportivas"
          : "roupas";
  const brands = [
    "Nike",
    "adidas",
    "Mizuno",
    "Puma",
    "Vans",
    "Olympikus",
    "ASICS",
    "New Balance",
    "Flamengo",
    "Vasco",
  ];
  const brand = brands.find((item) => lower.includes(item.toLocaleLowerCase("pt-BR"))) ?? null;
  const colors = [
    "preto",
    "branco",
    "vermelho",
    "azul",
    "verde",
    "rosa",
    "cinza",
    "bege",
    "marrom",
    "amarelo",
    "roxo",
    "laranja",
  ];
  const color = colors.find((item) => lower.includes(item));
  const gender = /feminina|feminino/.test(lower)
    ? "feminino"
    : /masculina|masculino/.test(lower)
      ? "masculino"
      : null;
  const sizeMatch = text.match(/(?:tamanho|tam\.?|nº|número)?\s*([0-9]{2}|\b[pmg]\b)/i);
  const size = sizeMatch?.[1]?.toUpperCase() ?? null;
  const model = brand
    ? text
        .replace(new RegExp(brand, "i"), "")
        .replace(
          /\b(preto|branco|vermelho|azul|verde|rosa|cinza|bege|marrom|amarelo|roxo|laranja|masculino|masculina|feminino|feminina|tamanho|tam\.?|[0-9]{2}|\b[pmg]\b)\b/gi,
          " ",
        )
        .replace(/\s+/g, " ")
        .trim() || null
    : null;
  const category =
    module === "calcados"
      ? "Tênis"
      : module === "roupas_treino"
        ? "Conjuntos / Performance"
        : module === "roupas_esportivas"
          ? "Camisas"
          : "A definir";
  const name =
    [brand, model, color ? color[0].toUpperCase() + color.slice(1) : null]
      .filter(Boolean)
      .join(" ") || text;
  return {
    module,
    brand,
    model,
    category,
    color: color ? color[0].toUpperCase() + color.slice(1) : null,
    gender,
    size,
    name,
  };
}

type ProductRow = {
  id: string;
  module: "roupas" | "roupas_esportivas" | "roupas_treino" | "calcados";
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
  sports_product_type?: string | null;
  sports_audience?: string | null;
  sports_is_retro?: boolean;
  sports_is_new_release?: boolean;
  sports_is_customized?: boolean;
  sports_offer_active?: boolean;
  sports_original_price?: number | null;
  sports_offer_price?: number | null;
  sports_offer_percent?: number | null;
  shoe_brand_id?: string | null;
  shoe_model_id?: string | null;
  shoe_authenticity?: "original" | "replica" | null;
  shoe_gender?: string | null;
  shoe_size?: string | null;
  shoe_color?: string | null;
};

const emptyForm = {
  module: "roupas" as "roupas" | "roupas_esportivas" | "roupas_treino" | "calcados",
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
  sports_node_id: "none",
  sports_product_type: "none",
  sports_audience: "none",
  sports_is_retro: false,
  sports_is_new_release: false,
  sports_is_customized: false,
  sports_offer_active: false,
  sports_original_price: "",
  sports_offer_price: "",
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
  const [sportsNodeId, setSportsNodeId] = useState("none");
  const [sportsCollectionId, setSportsCollectionId] = useState("none");
  const [trainingOnly, setTrainingOnly] = useState(false);
  const [shoesOnly, setShoesOnly] = useState(false);
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartText, setSmartText] = useState("");
  const [smartSuggestion, setSmartSuggestion] = useState<SmartSuggestion | null>(null);

  useEffect(() => {
    setTrainingOnly(
      typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("module") === "roupas_treino",
    );
  }, []);

  useEffect(() => {
    setShoesOnly(
      typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("module") === "calcados",
    );
  }, []);

  const { data: categories } = useQuery({
    queryKey: ["categories", store?.id, trainingOnly, shoesOnly],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      let query = supabase.from("categories").select("id, name").eq("store_id", store!.id);
      if (trainingOnly) query = query.eq("module", "roupas_treino");
      if (shoesOnly) query = query.eq("module", "calcados");
      const { data, error } = await query.order("position");
      if (error) throw error;
      return data;
    },
  });

  const { data: shoeBrands } = useQuery({
    queryKey: ["shoe-brands", store?.id],
    enabled: Boolean(store?.id && shoesOnly),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoe_brands")
        .select("id, name")
        .eq("store_id", store!.id)
        .eq("is_active", true)
        .order("position")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: shoeModels } = useQuery({
    queryKey: ["shoe-models", store?.id, form.shoe_brand_id],
    enabled: Boolean(store?.id && shoesOnly && form.shoe_brand_id !== "none"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shoe_models")
        .select("id, name")
        .eq("store_id", store!.id)
        .eq("brand_id", form.shoe_brand_id)
        .eq("is_active", true)
        .order("position")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products", store?.id, trainingOnly, shoesOnly],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(
          "id, module, name, description, price, stock, track_stock, has_variants, is_hidden, is_featured, image_url, category_id, order_enabled, order_unit_price, order_min_quantity, order_max_quantity, order_lead_time, order_notes, order_progressive_pricing, sports_product_type, sports_audience, sports_is_retro, sports_is_new_release, sports_is_customized, sports_offer_active, sports_original_price, sports_offer_price, sports_offer_percent, shoe_brand_id, shoe_model_id, shoe_authenticity, shoe_gender, shoe_size, shoe_color, product_variants(id, label, price, stock), product_order_tiers(min_quantity, unit_price)",
        )
        .eq("store_id", store!.id);
      if (trainingOnly) query = query.eq("module", "roupas_treino");
      if (shoesOnly) query = query.eq("module", "calcados");
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ProductRow[];
    },
  });

  const { data: sportsNodes } = useQuery<SportsNode[]>({
    queryKey: ["sports-nodes", store?.id],
    enabled: Boolean(store?.id && store.plan === "pro"),
    queryFn: () => listSportsNodes(store!.id),
  });
  const { data: sportsCollections } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["sports-collections", store?.id],
    enabled: Boolean(store?.id && store.plan === "pro"),
    queryFn: async () => {
      const { data, error } = await sportsDb
        .from("sports_collections")
        .select("id, name")
        .eq("store_id", store!.id)
        .eq("is_active", true)
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const limitReached =
    store?.plan !== "pro" &&
    (products?.filter((product) => !product.is_hidden).length ?? 0) >= FREE_PLAN_PRODUCT_LIMIT;

  function openNew() {
    if (limitReached) {
      toast.error(
        `O plano Básica permite até ${FREE_PLAN_PRODUCT_LIMIT} produtos. Assine o PRO para adicionar mais.`,
      );
      return;
    }
    setEditing(null);
    setForm({
      ...emptyForm,
      module: trainingOnly ? "roupas_treino" : shoesOnly ? "calcados" : "roupas",
    });
    setVariants([]);
    setOrderTiers([]);
    setPhotos([]);
    setSportsNodeId("none");
    setSportsCollectionId("none");
    setOpen(true);
  }

  function openEdit(product: ProductRow) {
    setEditing(product);
    setForm({
      module: product.module ?? "roupas",
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
      sports_node_id: "none",
      sports_product_type: product.sports_product_type ?? "none",
      sports_audience: product.sports_audience ?? "none",
      sports_is_retro: Boolean(product.sports_is_retro),
      sports_is_new_release: Boolean(product.sports_is_new_release),
      sports_is_customized: Boolean(product.sports_is_customized),
      sports_offer_active: Boolean(product.sports_offer_active),
      sports_original_price:
        product.sports_original_price == null ? "" : String(product.sports_original_price),
      sports_offer_price:
        product.sports_offer_price == null ? "" : String(product.sports_offer_price),
      shoe_brand_id: product.shoe_brand_id ?? "none",
      shoe_model_id: product.shoe_model_id ?? "none",
      shoe_authenticity: product.shoe_authenticity ?? "original",
      shoe_gender: product.shoe_gender ?? "unissex",
      shoe_size: product.shoe_size ?? "",
      shoe_color: product.shoe_color ?? "",
    });
    setSportsNodeId("none");
    setSportsCollectionId("none");
    void sportsDb
      .from("product_sports")
      .select("node_id")
      .eq("product_id", product.id)
      .maybeSingle()
      .then(({ data }: { data: { node_id?: string | null } | null }) =>
        setSportsNodeId(data?.node_id ?? "none"),
      );
    void sportsDb
      .from("sports_collection_products")
      .select("collection_id")
      .eq("product_id", product.id)
      .maybeSingle()
      .then(({ data }: { data: { collection_id?: string | null } | null }) =>
        setSportsCollectionId(data?.collection_id ?? "none"),
      );
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
      module: trainingOnly ? "roupas_treino" : shoesOnly ? "calcados" : form.module,
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
      sports_product_type: form.sports_product_type === "none" ? null : form.sports_product_type,
      sports_audience: form.sports_audience === "none" ? null : form.sports_audience,
      sports_is_retro: Boolean(form.sports_is_retro),
      sports_is_new_release: Boolean(form.sports_is_new_release),
      sports_is_customized: Boolean(form.sports_is_customized),
      sports_offer_active: Boolean(form.sports_offer_active),
      sports_original_price:
        form.sports_offer_active && form.sports_original_price
          ? Number(String(form.sports_original_price).replace(",", "."))
          : null,
      sports_offer_price:
        form.sports_offer_active && form.sports_offer_price
          ? Number(String(form.sports_offer_price).replace(",", "."))
          : null,
      shoe_brand_id:
        form.module === "calcados" && form.shoe_brand_id !== "none" ? form.shoe_brand_id : null,
      shoe_model_id:
        form.module === "calcados" && form.shoe_model_id !== "none" ? form.shoe_model_id : null,
      shoe_authenticity: form.module === "calcados" ? form.shoe_authenticity : "original",
      shoe_gender: form.module === "calcados" ? form.shoe_gender : null,
      shoe_size: form.module === "calcados" ? form.shoe_size.trim() || null : null,
      shoe_color: form.module === "calcados" ? form.shoe_color.trim() || null : null,
      sports_offer_percent:
        form.sports_offer_active && form.sports_original_price && form.sports_offer_price
          ? Math.max(
              0,
              Math.round(
                (1 -
                  Number(String(form.sports_offer_price).replace(",", ".")) /
                    Number(String(form.sports_original_price).replace(",", "."))) *
                  100,
              ),
            )
          : null,
    };

    const { data: saved, error } = editing
      ? await supabase
          .from("products")
          .update(payload as never)
          .eq("id", editing.id)
          .select("id")
          .single()
      : await supabase
          .from("products")
          .insert(payload as never)
          .select("id")
          .single();

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

    await sportsDb.from("product_sports").delete().eq("product_id", saved.id);
    if (sportsNodeId !== "none" && store.plan === "pro") {
      const { error: sportsError } = await sportsDb.from("product_sports").insert({
        product_id: saved.id,
        node_id: sportsNodeId,
        is_primary: true,
      });
      if (sportsError) {
        setSaving(false);
        toast.error("Produto salvo, mas não foi possível vincular a classificação esportiva.");
        return;
      }
    }
    await sportsDb.from("sports_collection_products").delete().eq("product_id", saved.id);
    if (sportsCollectionId !== "none" && store.plan === "pro") {
      await sportsDb
        .from("sports_collection_products")
        .insert({ collection_id: sportsCollectionId, product_id: saved.id });
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
    if (!error) {
      toast.success("Produto excluído.");
      queryClient.invalidateQueries({ queryKey: ["products", store?.id] });
      return;
    }

    // Produtos presentes em pedidos não podem ser apagados sem quebrar o
    // histórico. Nesse caso, arquivamos o produto e o retiramos da vitrine.
    const { error: archiveError } = await supabase
      .from("products")
      .update({ is_hidden: true } as never)
      .eq("id", product.id);
    if (archiveError) {
      toast.error(`Não foi possível excluir o produto: ${archiveError.message}`);
      return;
    }
    toast.success(
      "Produto arquivado e removido da vitrine. O histórico de pedidos foi preservado.",
    );
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
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSmartText("");
              setSmartSuggestion(null);
              setSmartOpen(true);
            }}
            aria-label="Cadastro inteligente"
          >
            <Sparkles className="size-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Cadastro rápido</span>
          </Button>
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

      <Dialog open={smartOpen} onOpenChange={setSmartOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>✨ Vamos cadastrar seu produto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>O que você está vendendo?</Label>
              <Textarea
                className="mt-1.5"
                rows={3}
                autoFocus
                placeholder="Ex.: Nike Air Force 1 branco feminino 37"
                value={smartText}
                onChange={(event) => {
                  setSmartText(event.target.value);
                  setSmartSuggestion(null);
                }}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Escreva do seu jeito. O Vitrini vai organizar as informações sem inventar dados.
              </p>
            </div>
            {smartSuggestion ? (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="mb-3 text-sm font-semibold">
                  ✨ Entendemos estas informações. Está correto?
                </p>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  {[
                    [
                      "Módulo",
                      smartSuggestion.module === "calcados"
                        ? "👟 Calçados"
                        : smartSuggestion.module === "roupas_treino"
                          ? "🏋️ Treino"
                          : smartSuggestion.module === "roupas_esportivas"
                            ? "⚽ Esportivas"
                            : "👕 Roupas",
                    ],
                    ["Marca", smartSuggestion.brand],
                    ["Modelo", smartSuggestion.model],
                    ["Categoria", smartSuggestion.category],
                    ["Cor", smartSuggestion.color],
                    ["Público", smartSuggestion.gender],
                    ["Tamanho", smartSuggestion.size],
                  ]
                    .filter(([, value]) => value)
                    .map(([label, value]) => (
                      <div key={label}>
                        <span className="text-muted-foreground">{label}:</span> {value}
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSmartOpen(false);
                  openNew();
                }}
              >
                ⚙️ Cadastro manual
              </Button>
              {smartSuggestion ? (
                <Button
                  onClick={() => {
                    setForm({
                      ...emptyForm,
                      module: smartSuggestion.module,
                      name: smartSuggestion.name,
                      shoe_authenticity: "original",
                      shoe_size: smartSuggestion.size ?? "",
                      shoe_color: smartSuggestion.color ?? "",
                      shoe_gender: smartSuggestion.gender ?? "unissex",
                    });
                    setSmartOpen(false);
                    setOpen(true);
                  }}
                >
                  ✓ Usar sugestões e continuar
                </Button>
              ) : (
                <Button
                  disabled={!smartText.trim()}
                  onClick={() => setSmartSuggestion(interpretProductText(smartText))}
                >
                  Continuar <span className="ml-1">→</span>
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <CollapsibleSection
              title="Informações básicas"
              description="Módulo, nome, descrição, preço, estoque e categoria"
              icon={<Package className="size-4" />}
              defaultOpen
            >
              <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Label>Módulo da loja</Label>
                {trainingOnly || shoesOnly ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-sm font-medium">
                    {trainingOnly ? "🏋️ Roupas de Treino / Academia" : "👟 Calçados"}
                  </div>
                ) : (
                  <Select
                    value={form.module}
                    onValueChange={(
                      value: "roupas" | "roupas_esportivas" | "roupas_treino" | "calcados",
                    ) => setForm({ ...form, module: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="roupas">👕 Roupas</SelectItem>
                      <SelectItem value="roupas_esportivas">⚽ Roupas Esportivas</SelectItem>
                      <SelectItem value="roupas_treino">🏋️ Roupas de Treino / Academia</SelectItem>
                      <SelectItem value="calcados">👟 Calçados</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  O produto aparecerá somente no módulo escolhido.
                </p>
              </div>
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
                  <span className="text-xs text-muted-foreground">
                    {form.description.length}/300
                  </span>
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
            </CollapsibleSection>
            {form.module === "calcados" ? (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                <p className="text-sm font-semibold">👟 Dados do Calçado</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Marca</Label>
                    <Select
                      value={form.shoe_brand_id}
                      onValueChange={(value) =>
                        setForm({ ...form, shoe_brand_id: value, shoe_model_id: "none" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Marca" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Marca manual</SelectItem>
                        {(shoeBrands ?? []).map((brand) => (
                          <SelectItem key={brand.id} value={brand.id}>
                            {brand.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Modelo</Label>
                    <Select
                      value={form.shoe_model_id}
                      onValueChange={(value) => setForm({ ...form, shoe_model_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Modelo manual</SelectItem>
                        {(shoeModels ?? []).map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tamanho</Label>
                    <Input
                      value={form.shoe_size}
                      placeholder="BR 38 ou personalizado"
                      onChange={(e) => setForm({ ...form, shoe_size: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Cor</Label>
                    <Input
                      value={form.shoe_color}
                      placeholder="Ex.: Preto"
                      onChange={(e) => setForm({ ...form, shoe_color: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Gênero</Label>
                    <Select
                      value={form.shoe_gender}
                      onValueChange={(value) => setForm({ ...form, shoe_gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Masculino", "Feminino", "Unissex", "Infantil", "Juvenil"].map(
                          (value) => (
                            <SelectItem key={value} value={value.toLowerCase()}>
                              {value}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select
                      value={form.shoe_authenticity}
                      onValueChange={(value) =>
                        setForm({ ...form, shoe_authenticity: value as "original" | "replica" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="original">Original</SelectItem>
                        <SelectItem value="replica">Réplica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  O Vitrini registra a declaração do vendedor e não autentica automaticamente.{" "}
                  {form.shoe_authenticity === "original"
                    ? "A declaração de originalidade é responsabilidade do vendedor."
                    : "Informe corretamente a natureza do produto e observe a legislação aplicável."}
                </p>
              </div>
            ) : null}
            {store?.plan === "pro" && sportsNodes?.length ? (
              <div className="space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900 dark:bg-emerald-950/20">
                <Label>Classificação esportiva</Label>
                <Select value={sportsNodeId} onValueChange={setSportsNodeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem classificação esportiva" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem classificação esportiva</SelectItem>
                    {sportsNodes.map((node) => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.parent_id ? "↳ " : ""}
                        {node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  O produto continua usando as categorias e o fluxo de pedidos atuais.
                </p>
              </div>
            ) : null}
            {store?.plan === "pro" && sportsCollections?.length ? (
              <div className="space-y-1.5">
                <Label>Coleção esportiva</Label>
                <Select value={sportsCollectionId} onValueChange={setSportsCollectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sem coleção" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem coleção</SelectItem>
                    {sportsCollections.map((collection) => (
                      <SelectItem key={collection.id} value={collection.id}>
                        {collection.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {store?.plan === "pro" ? (
              <div className="space-y-3 rounded-lg border border-border p-3">
                <p className="text-sm font-semibold">Catálogo esportivo</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tipo</Label>
                    <Select
                      value={form.sports_product_type}
                      onValueChange={(value) => setForm({ ...form, sports_product_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem tipo</SelectItem>
                        {[
                          "Camisa",
                          "Camiseta",
                          "Regata",
                          "Bermuda",
                          "Calça",
                          "Agasalho",
                          "Moletom",
                          "Boné",
                          "Meia",
                          "Chuteira",
                          "Bolsa",
                          "Mochila",
                          "Bola",
                          "Acessórios",
                          "Personalizado",
                          "Outros",
                        ].map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Público</Label>
                    <Select
                      value={form.sports_audience}
                      onValueChange={(value) => setForm({ ...form, sports_audience: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem público</SelectItem>
                        {["Masculino", "Feminino", "Unissex", "Infantil", "Juvenil"].map(
                          (audience) => (
                            <SelectItem key={audience} value={audience}>
                              {audience}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <ToggleRow
                  label="Retrô"
                  checked={form.sports_is_retro}
                  onChange={(value) => setForm({ ...form, sports_is_retro: value })}
                />
                <ToggleRow
                  label="Lançamento"
                  checked={form.sports_is_new_release}
                  onChange={(value) => setForm({ ...form, sports_is_new_release: value })}
                />
                <ToggleRow
                  label="Produto personalizado"
                  checked={form.sports_is_customized}
                  onChange={(value) => setForm({ ...form, sports_is_customized: value })}
                />
                <ToggleRow
                  label="Oferta"
                  checked={form.sports_offer_active}
                  onChange={(value) => setForm({ ...form, sports_offer_active: value })}
                />
                {form.sports_offer_active ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Preço original</Label>
                      <Input
                        inputMode="decimal"
                        value={form.sports_original_price}
                        onChange={(e) =>
                          setForm({ ...form, sports_original_price: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Preço promocional</Label>
                      <Input
                        inputMode="decimal"
                        value={form.sports_offer_price}
                        onChange={(e) => setForm({ ...form, sports_offer_price: e.target.value })}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
            <CollapsibleSection
              title="Fotos do produto"
              description="Anexe imagens ou tire uma foto com a câmera do celular"
              icon={<ImageIcon className="size-4" />}
            >
              <ProductPhotos
                paths={photos}
                onChange={setPhotos}
                onUploadingChange={setUploadingPhoto}
              />
            </CollapsibleSection>

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
