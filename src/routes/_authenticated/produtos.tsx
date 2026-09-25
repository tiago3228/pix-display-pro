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
import { resolveAsset, uploadAsset } from "@/lib/images";
import { FREE_PLAN_PRODUCT_LIMIT, brl } from "@/lib/format";
import { searchProductDiscovery, type DiscoveryResult } from "@/lib/product-discovery.functions";
import { listSportsNodes, sportsDb, type SportsNode } from "@/lib/sports";
import { getStoreNicheModule, isNeutralCategoryName } from "@/lib/store-niche";
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

type VariantDraft = { id?: string; label: string; price: string; stock: string; sku: string; image_url: string | null };
type OrderTierDraft = { minQuantity: string; unitPrice: string };
type SmartSuggestion = {
  module:
    | "roupas"
    | "roupas_esportivas"
    | "roupas_treino"
    | "calcados"
    | "cafeteria"
    | "marmitaria"
    | "joias";
  brand: string | null;
  model: string | null;
  category: string;
  color: string | null;
  gender: string | null;
  size: string | null;
  name: string;
};

function interpretProductText(
  input: string,
  defaultModule: SmartSuggestion["module"] = "roupas",
): SmartSuggestion {
  const text = input.trim();
  const lower = text.toLocaleLowerCase("pt-BR");
  const module =
    /tênis|tenis|sapato|bota|sandália|sandalia|ch sinelo|nike|adidas|mizuno|puma|vans|olympikus|asics/.test(
      lower,
    )
      ? "calcados"
      : /marmita|marmitex|prato feito|almoço|almoco|janta|refeição|refeicao/.test(lower)
        ? "marmitaria"
        : /anel|aliança|alianca|brinco|colar|corrente|pulseira|pingente|semijoia|joia/.test(lower)
          ? "joias"
        : /café|cafe|bolo|doce|brigadeiro|brownie|empada|pastel|cappuccino|bebida|salgado/.test(
              lower,
            )
          ? "cafeteria"
          : /fitness|academia|legging|top|treino|dry fit/.test(lower)
            ? "roupas_treino"
            : /flamengo|vasco|corinthians|seleção|selecao|camisa de futebol|futebol/.test(lower)
              ? "roupas_esportivas"
              : defaultModule;
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
      : module === "marmitaria"
        ? "🍱 Marmitas"
        : module === "joias"
          ? lower.includes("alian") ? "💎 Alianças" : lower.includes("brinc") ? "✨ Brincos" : lower.includes("colar") ? "📿 Colares" : lower.includes("corren") ? "⛓️ Correntes" : lower.includes("pulseir") ? "🔗 Pulseiras" : lower.includes("pingent") ? "💎 Pingentes" : lower.includes("conjunt") ? "👑 Conjuntos" : "💍 Anéis"
        : module === "cafeteria"
          ? /café|cafe|cappuccino/.test(lower)
            ? "☕ Cafés"
            : "🍰 Bolos e Doces"
      : module === "roupas_treino"
        ? "Conjuntos / Performance"
        : module === "roupas_esportivas"
          ? "Camisas"
          : "A definir";
  const name =
    [brand, model, color ? color.charAt(0).toUpperCase() + color.slice(1) : null]
      .filter(Boolean)
      .join(" ") || text;
  return {
    module,
    brand,
    model,
    category,
    color: color ? color.charAt(0).toUpperCase() + color.slice(1) : null,
    gender,
    size,
    name,
  };
}

type ProductRow = {
  id: string;
  module:
    | "roupas"
    | "roupas_esportivas"
    | "roupas_treino"
    | "calcados"
    | "cafeteria"
    | "marmitaria"
    | "joias";
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
  product_variants: { id: string; label: string; price: number | null; stock: number; sku?: string | null; image_url?: string | null }[];
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
  meal_period?: "lunch" | "dinner" | "both" | null;
  delivery_enabled?: boolean;
  jewelry_material?: string | null;
  jewelry_plating?: string | null;
  jewelry_color?: string | null;
  jewelry_stone?: string | null;
  jewelry_is_new_release?: boolean;
  jewelry_offer_active?: boolean;
  jewelry_original_price?: number | null;
  jewelry_offer_price?: number | null;
  jewelry_offer_percent?: number | null;
  jewelry_offer_expires_at?: string | null;
};

const emptyForm = {
  module: "roupas" as ProductRow["module"],
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
  shoe_brand_id: "none",
  shoe_model_id: "none",
  shoe_authenticity: "original",
  shoe_gender: "none",
  shoe_size: "",
  shoe_color: "",
  meal_period: "both" as "lunch" | "dinner" | "both",
  delivery_enabled: true,
  jewelry_material: "",
  jewelry_plating: "",
  jewelry_color: "",
  jewelry_stone: "",
  jewelry_is_new_release: false,
  jewelry_offer_active: false,
  jewelry_original_price: "",
  jewelry_offer_price: "",
  jewelry_offer_expires_at: "",
};

function CategoryImagePreview({ path }: { path: string | null | undefined }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void resolveAsset(path).then((resolved) => { if (active) setUrl(resolved); });
    return () => { active = false; };
  }, [path]);
  return url ? <img src={url} alt="" className="size-10 rounded-lg object-cover" /> :
    <span className="flex size-10 items-center justify-center rounded-lg bg-muted"><ImageIcon className="size-4" /></span>;
}

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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [categoryImageUploading, setCategoryImageUploading] = useState<string | null>(null);
  const [manualShoeBrand, setManualShoeBrand] = useState("");
  const [manualShoeModel, setManualShoeModel] = useState("");
  const [sportsNodeId, setSportsNodeId] = useState("none");
  const [sportsCollectionId, setSportsCollectionId] = useState("none");
  const [trainingOnly, setTrainingOnly] = useState(false);
  const [shoesOnly, setShoesOnly] = useState(false);
  const [cafeteriaOnly, setCafeteriaOnly] = useState(false);
  const [marmitariaOnly, setMarmitariaOnly] = useState(false);
  const [jewelryOnly, setJewelryOnly] = useState(false);
  const [sportsOnly, setSportsOnly] = useState(false);
  const sportsCatalogEnabled = ["roupas", "roupas_esportivas", "roupas_treino"].includes(form.module);

  function currentCategoryModule() {
    if (jewelryOnly) return "joias";
    if (cafeteriaOnly) return "cafeteria";
    if (marmitariaOnly) return "marmitaria";
    if (shoesOnly) return "calcados";
    if (trainingOnly) return "roupas_treino";
    if (sportsOnly) return "roupas_esportivas";
    return getStoreNicheModule(store?.category);
  }
  const [guidedOpen, setGuidedOpen] = useState(false);
  const [guidedType, setGuidedType] = useState("");
  const [smartOpen, setSmartOpen] = useState(false);
  const [smartText, setSmartText] = useState("");
  const [smartSuggestion, setSmartSuggestion] = useState<SmartSuggestion | null>(null);
  const [internetOpen, setInternetOpen] = useState(false);
  const [internetQuery, setInternetQuery] = useState("");
  const [internetResults, setInternetResults] = useState<DiscoveryResult[]>([]);
  const [internetSearching, setInternetSearching] = useState(false);
  const [importedDiscovery, setImportedDiscovery] = useState<DiscoveryResult | null>(null);
  const discover = useServerFn(searchProductDiscovery);

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setSportsOnly(params.get("module") === "roupas_esportivas");
    setCafeteriaOnly(params.get("module") === "cafeteria");
    setMarmitariaOnly(params.get("module") === "marmitaria");
    setJewelryOnly(params.get("module") === "joias");
    if (params.get("guided") === "1") setGuidedOpen(true);
  }, []);

  const { data: categories } = useQuery({
    queryKey: [
      "categories",
      store?.id,
      store?.category,
      trainingOnly,
      shoesOnly,
      cafeteriaOnly, marmitariaOnly,
      jewelryOnly,
      sportsOnly,
      open,
      form.module,
    ],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      const query = supabase
        .from("categories")
        .select("id, name, module, is_active, position, image_url")
        .eq("store_id", store!.id);
      const { data, error } = await query.order("position");
      if (error) throw error;
      const module = open ? form.module : currentCategoryModule();
      const moduleCategories = (data ?? []).filter((category) => category.module === module);
      const neutralCategory =
        moduleCategories.find((category) => category.is_active !== false && isNeutralCategoryName(category.name)) ??
        (data ?? []).find((category) => category.is_active !== false && isNeutralCategoryName(category.name));
      const visible = [
        ...moduleCategories.filter((category) => !isNeutralCategoryName(category.name)),
        ...(neutralCategory ? [neutralCategory] : []),
      ];
      const unique = new Map<string, (typeof visible)[number]>();
      for (const category of visible) {
        const key = `${category.module ?? "roupas"}:${category.name.trim().toLocaleLowerCase("pt-BR")}`;
        if (!unique.has(key)) unique.set(key, category);
      }
      return [...unique.values()];
    },
  });

  const { data: shoeBrands } = useQuery({
    queryKey: ["shoe-brands", store?.id, form.module],
    enabled: Boolean(store?.id && (shoesOnly || form.module === "calcados")),
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
    enabled: Boolean(store?.id && (shoesOnly || form.module === "calcados")),
    queryFn: async () => {
      let query = supabase
        .from("shoe_models")
        .select("id, name, brand_id")
        .eq("store_id", store!.id);
      if (form.shoe_brand_id !== "none") query = query.eq("brand_id", form.shoe_brand_id);
      const { data, error } = await query
        .eq("is_active", true)
        .order("position")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products", store?.id, trainingOnly, shoesOnly, cafeteriaOnly, marmitariaOnly, jewelryOnly],
    enabled: Boolean(store?.id),
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select(
          "id, module, name, description, price, stock, track_stock, has_variants, is_hidden, is_featured, image_url, category_id, order_enabled, order_unit_price, order_min_quantity, order_max_quantity, order_lead_time, order_notes, order_progressive_pricing, sports_product_type, sports_audience, sports_is_retro, sports_is_new_release, sports_is_customized, sports_offer_active, sports_original_price, sports_offer_price, sports_offer_percent, meal_period, delivery_enabled, shoe_brand_id, shoe_model_id, shoe_authenticity, shoe_gender, shoe_size, shoe_color, jewelry_material, jewelry_plating, jewelry_color, jewelry_stone, jewelry_is_new_release, jewelry_offer_active, jewelry_original_price, jewelry_offer_price, jewelry_offer_percent, jewelry_offer_expires_at, product_variants(id, label, price, stock, sku, image_url), product_order_tiers(min_quantity, unit_price)",
        )
        .eq("store_id", store!.id);
      if (trainingOnly) query = query.eq("module", "roupas_treino");
      if (shoesOnly) query = query.eq("module", "calcados");
      if (cafeteriaOnly) query = query.eq("module", "cafeteria");
      if (marmitariaOnly) query = query.eq("module", "marmitaria");
      if (jewelryOnly) query = query.eq("module", "joias");
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ProductRow[];
    },
  });

  const { data: sportsNodes } = useQuery<SportsNode[]>({
    queryKey: ["sports-nodes", store?.id],
    enabled: Boolean(store?.id && store.plan === "pro" && sportsCatalogEnabled),
    queryFn: () => listSportsNodes(store!.id),
  });
  const { data: sportsCollections } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["sports-collections", store?.id],
    enabled: Boolean(store?.id && store.plan === "pro" && sportsCatalogEnabled),
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
    setImportedDiscovery(null);
    setManualShoeBrand("");
    setManualShoeModel("");
    setForm({
      ...emptyForm,
      module: jewelryOnly
        ? "joias"
        : trainingOnly
        ? "roupas_treino"
        : shoesOnly
          ? "calcados"
          : marmitariaOnly
            ? "marmitaria"
          : cafeteriaOnly
            ? "cafeteria"
            : currentCategoryModule(),
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
    setImportedDiscovery(null);
    setManualShoeBrand("");
    setManualShoeModel("");
    if (product.shoe_brand_id) {
      void supabase
        .from("shoe_brands")
        .select("name")
        .eq("id", product.shoe_brand_id)
        .maybeSingle()
        .then(({ data }) => setManualShoeBrand(data?.name ?? ""));
    }
    if (product.shoe_model_id) {
      void supabase
        .from("shoe_models")
        .select("name")
        .eq("id", product.shoe_model_id)
        .maybeSingle()
        .then(({ data }) => setManualShoeModel(data?.name ?? ""));
    }
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
      meal_period: product.meal_period ?? "both",
      delivery_enabled: product.delivery_enabled ?? product.module === "marmitaria",
      jewelry_material: product.jewelry_material ?? "",
      jewelry_plating: product.jewelry_plating ?? "",
      jewelry_color: product.jewelry_color ?? "",
      jewelry_stone: product.jewelry_stone ?? "",
      jewelry_is_new_release: Boolean(product.jewelry_is_new_release),
      jewelry_offer_active: Boolean(product.jewelry_offer_active),
      jewelry_original_price:
        product.jewelry_original_price == null ? "" : String(product.jewelry_original_price),
      jewelry_offer_price:
        product.jewelry_offer_price == null ? "" : String(product.jewelry_offer_price),
      jewelry_offer_expires_at: product.jewelry_offer_expires_at ?? "",
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
        sku: v.sku ?? "",
        image_url: v.image_url ?? null,
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

  async function uploadVariantImage(index: number, file: File) {
    if (!store?.owner_id) return;
    try {
      const path = await uploadAsset(store.owner_id, file);
      setVariants((current) => current.map((item, i) => i === index ? { ...item, image_url: path } : item));
      toast.success("Imagem da variação adicionada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem da variação.");
    }
  }

  async function save() {
    if (!store) {
      toast.error("Crie sua loja antes de cadastrar produtos.");
      return;
    }
    if (form.module === "joias" && store.plan !== "pro") {
      toast.error("Joias e Semijoias é exclusivo do Vitrini PRO.");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    if (form.module === "joias" && form.jewelry_offer_active) {
      const original = Number(String(form.jewelry_original_price).replace(",", "."));
      const offer = Number(String(form.jewelry_offer_price).replace(",", "."));
      if (!Number.isFinite(original) || !Number.isFinite(offer) || original <= 0 || offer < 0 || offer >= original) {
        toast.error("Informe um preço promocional menor que o preço original.");
        return;
      }
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

    let shoeBrandId = form.shoe_brand_id === "none" ? null : form.shoe_brand_id;
    let shoeModelId = form.shoe_model_id === "none" ? null : form.shoe_model_id;
    if (form.module === "calcados") {
      const { data: storeShoeBrands, error: shoeBrandLookupError } = await supabase
        .from("shoe_brands")
        .select("id, name")
        .eq("store_id", store.id)
        .eq("is_active", true);
      if (shoeBrandLookupError) {
        setSaving(false);
        toast.error(`Não foi possível verificar as marcas: ${shoeBrandLookupError.message}`);
        return;
      }
      const requestedBrand = manualShoeBrand.trim();
      if (requestedBrand) {
        if (!shoeBrandId) {
          const existingBrand = (storeShoeBrands ?? []).find(
            (brand) =>
              brand.name.trim().toLocaleLowerCase("pt-BR") ===
              requestedBrand.toLocaleLowerCase("pt-BR"),
          );
          if (existingBrand) shoeBrandId = existingBrand.id;
        }
        if (!shoeBrandId) {
          const { data, error: brandError } = await supabase
            .from("shoe_brands")
            .insert({ store_id: store.id, name: requestedBrand })
            .select("id")
            .single();
          if (brandError || !data) {
            setSaving(false);
            toast.error(`Não foi possível salvar a marca: ${brandError?.message ?? "erro desconhecido"}`);
            return;
          }
          shoeBrandId = data.id;
        }
      }

      const requestedModel = manualShoeModel.trim();
      if (requestedModel) {
        if (!shoeBrandId) {
          const genericBrand = (storeShoeBrands ?? []).find(
            (brand) => brand.name.trim().toLocaleLowerCase("pt-BR") === "sem marca",
          );
          if (genericBrand) {
            shoeBrandId = genericBrand.id;
          } else {
            const { data, error: brandError } = await supabase
              .from("shoe_brands")
              .insert({ store_id: store.id, name: "Sem marca" })
              .select("id")
              .single();
            if (brandError || !data) {
              setSaving(false);
              toast.error(`Não foi possível salvar o modelo: ${brandError?.message ?? "erro desconhecido"}`);
              return;
            }
            shoeBrandId = data.id;
          }
        }
        const { data: modelsForBrand, error: modelsError } = await supabase
          .from("shoe_models")
          .select("id, name")
          .eq("store_id", store.id)
          .eq("brand_id", shoeBrandId)
          .eq("is_active", true);
        if (modelsError) {
          setSaving(false);
          toast.error(`Não foi possível verificar o modelo: ${modelsError.message}`);
          return;
        }
        const existingModel = (modelsForBrand ?? []).find(
          (model) =>
            model.name.trim().toLocaleLowerCase("pt-BR") ===
            requestedModel.toLocaleLowerCase("pt-BR"),
        );
        if (existingModel) {
          shoeModelId = existingModel.id;
        } else {
          const { data, error: modelError } = await supabase
            .from("shoe_models")
            .insert({ store_id: store.id, brand_id: shoeBrandId, name: requestedModel })
            .select("id")
            .single();
          if (modelError || !data) {
            setSaving(false);
            toast.error(`Não foi possível salvar o modelo: ${modelError?.message ?? "erro desconhecido"}`);
            return;
          }
          shoeModelId = data.id;
        }
      }
    }

    const cleanVariants = variants.filter((v) => v.label.trim());
    const payload = {
      store_id: store.id,
      module: jewelryOnly
        ? "joias"
        : trainingOnly
        ? "roupas_treino"
        : shoesOnly
          ? "calcados"
          : marmitariaOnly
            ? "marmitaria"
          : cafeteriaOnly
            ? "cafeteria"
            : form.module,
      name: form.name.trim(),
      meal_period: form.module === "marmitaria" || marmitariaOnly ? form.meal_period : "both",
      delivery_enabled: form.module === "marmitaria" || marmitariaOnly ? Boolean(form.delivery_enabled) : false,
      jewelry_material: form.module === "joias" ? form.jewelry_material.trim() || null : null,
      jewelry_plating: form.module === "joias" ? form.jewelry_plating.trim() || null : null,
      jewelry_color: form.module === "joias" ? form.jewelry_color.trim() || null : null,
      jewelry_stone: form.module === "joias" ? form.jewelry_stone.trim() || null : null,
      jewelry_is_new_release: form.module === "joias" && Boolean(form.jewelry_is_new_release),
      jewelry_offer_active: form.module === "joias" && Boolean(form.jewelry_offer_active),
      jewelry_original_price:
        form.module === "joias" && form.jewelry_offer_active && form.jewelry_original_price
          ? Number(String(form.jewelry_original_price).replace(",", "."))
          : null,
      jewelry_offer_price:
        form.module === "joias" && form.jewelry_offer_active && form.jewelry_offer_price
          ? Number(String(form.jewelry_offer_price).replace(",", "."))
          : null,
      jewelry_offer_percent:
        form.module === "joias" && form.jewelry_offer_active && form.jewelry_original_price && form.jewelry_offer_price
          ? Math.max(0, Math.min(100, Math.round((1 - Number(String(form.jewelry_offer_price).replace(",", ".")) / Number(String(form.jewelry_original_price).replace(",", "."))) * 100)))
          : null,
      jewelry_offer_expires_at:
        form.module === "joias" && form.jewelry_offer_active && form.jewelry_offer_expires_at
          ? form.jewelry_offer_expires_at
          : null,
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
        form.module === "calcados" ? shoeBrandId : null,
      shoe_model_id:
        form.module === "calcados" ? shoeModelId : null,
      shoe_authenticity: form.module === "calcados" ? form.shoe_authenticity : "original",
      shoe_gender: form.module === "calcados" ? form.shoe_gender : null,
      shoe_size: form.module === "calcados" ? form.shoe_size.trim() || null : null,
      shoe_color: form.module === "calcados" ? form.shoe_color.trim() || null : null,
      discovery_source_name: importedDiscovery?.sourceName ?? null,
      discovery_source_url: importedDiscovery?.sourceUrl ?? null,
      discovery_imported_at: importedDiscovery ? new Date().toISOString() : null,
      discovery_imported_fields: importedDiscovery
        ? {
            name: true,
            brand: Boolean(importedDiscovery.brand),
            model: Boolean(importedDiscovery.model),
            category: Boolean(importedDiscovery.category),
            description: Boolean(importedDiscovery.description),
          }
        : {},
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
          sku: v.sku.trim() || null,
          image_url: v.image_url,
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
    queryClient.invalidateQueries({ queryKey: ["shoe-brands", store.id] });
    queryClient.invalidateQueries({ queryKey: ["shoe-models", store.id] });
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
      .insert({ store_id: store.id, name: newCategory.trim(), module: currentCategoryModule() });
    if (error) {
      toast.error("Não foi possível criar a categoria.");
      return;
    }
    setNewCategory("");
    queryClient.invalidateQueries({ queryKey: ["categories", store.id] });
  }

  async function saveCategoryName(categoryId: string) {
    if (!store || !editingCategoryName.trim()) return;
    const { error } = await supabase.from("categories").update({ name: editingCategoryName.trim() }).eq("id", categoryId).eq("store_id", store.id);
    if (error) { toast.error("Não foi possível renomear a categoria. Verifique se já existe outra com esse nome."); return; }
    setEditingCategoryId(null);
    await queryClient.invalidateQueries({ queryKey: ["categories", store.id] });
  }

  async function removeCategory(category: { id: string; name: string }) {
    if (!store || !window.confirm(`Excluir a categoria “${category.name}”? Os produtos serão mantidos sem categoria.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", category.id).eq("store_id", store.id);
    if (error) { toast.error("Não foi possível excluir esta categoria."); return; }
    await queryClient.invalidateQueries({ queryKey: ["categories", store.id] });
    await queryClient.invalidateQueries({ queryKey: ["products", store.id] });
  }

  async function moveCategory(category: { id: string; module: string; position: number }, direction: -1 | 1) {
    if (!store) return;
    const siblings = (categories ?? []).filter((item) => item.module === category.module && item.is_active !== false)
      .sort((a, b) => a.position - b.position);
    const index = siblings.findIndex((item) => item.id === category.id);
    const other = siblings[index + direction];
    if (!other) return;
    const { error } = await supabase.from("categories").update({ position: other.position }).eq("id", category.id).eq("store_id", store.id);
    if (error) { toast.error("Não foi possível reordenar as categorias."); return; }
    const { error: otherError } = await supabase.from("categories").update({ position: category.position }).eq("id", other.id).eq("store_id", store.id);
    if (otherError) { toast.error("Não foi possível concluir a reordenação."); return; }
    await queryClient.invalidateQueries({ queryKey: ["categories", store.id] });
  }

  async function uploadCategoryImage(categoryId: string, file: File) {
    if (!store?.owner_id) return;
    setCategoryImageUploading(categoryId);
    try {
      const path = await uploadAsset(store.owner_id, file);
      const { error } = await supabase.from("categories").update({ image_url: path }).eq("id", categoryId).eq("store_id", store.id);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["categories", store.id] });
      toast.success("Imagem da categoria atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a imagem.");
    } finally { setCategoryImageUploading(null); }
  }

  async function toggleCategory(category: { id: string; name: string; is_active: boolean | null }) {
    const next = category.is_active === false;
    const { error } = await supabase
      .from("categories")
      .update({ is_active: next } as never)
      .eq("id", category.id)
      .eq("store_id", store!.id);
    if (error) {
      toast.error("Não foi possível alterar a categoria. Publique a migração SQL primeiro.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["categories", store?.id] });
    toast.success(`${category.name} ${next ? "ativada" : "desativada"}.`);
  }

  if ((jewelryOnly || currentCategoryModule() === "joias") && store && store.plan !== "pro") {
    return (
      <AppShell title="Joias e Semijoias" description="Loja especializada do catálogo Premium">
        <div className="surface mx-auto mt-8 max-w-xl p-8 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-3xl">
            🔒
          </div>
          <h2 className="mt-4 text-2xl font-bold">Recurso exclusivo PRO</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Crie uma loja especializada em joias e semijoias com categorias prontas, personalização completa e uma vitrine profissional.
          </p>
          <Button className="mt-5" asChild>
            <Link to="/assinatura">Conhecer o Vitrini PRO</Link>
          </Button>
        </div>
      </AppShell>
    );
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
        <div className="mt-2 space-y-2">
          {(categories ?? []).map((category, index) => {
            const active = category.is_active !== false;
            const siblings = (categories ?? []).filter((item) => item.module === category.module && item.is_active !== false);
            return (
              <div key={category.id} className={`flex flex-wrap items-center gap-2 rounded-xl border p-2 ${active ? "" : "opacity-60"}`}>
                <CategoryImagePreview path={category.image_url} />
                {editingCategoryId === category.id ? (
                  <Input className="min-w-36 flex-1" autoFocus value={editingCategoryName} onChange={(event) => setEditingCategoryName(event.target.value)} />
                ) : <button type="button" className={`min-w-36 flex-1 text-left text-sm font-medium ${active ? "" : "line-through"}`} onClick={() => void toggleCategory(category)}>{category.name}{active ? " ✓" : " · desativada"}</button>}
                <div className="flex items-center gap-1">
                  {editingCategoryId === category.id ? <>
                    <Button type="button" size="sm" onClick={() => void saveCategoryName(category.id)}>Salvar</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)}>Cancelar</Button>
                  </> : <>
                    <Button type="button" size="icon" variant="ghost" title="Renomear" onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }}><Pencil className="size-4" /></Button>
                    <label className="inline-flex size-9 cursor-pointer items-center justify-center rounded-md hover:bg-muted" title="Alterar imagem">
                      <ImageIcon className="size-4" />
                      <input type="file" accept="image/*" className="sr-only" disabled={categoryImageUploading === category.id} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCategoryImage(category.id, file); event.currentTarget.value = ""; }} />
                    </label>
                    <Button type="button" size="icon" variant="ghost" title="Mover para cima" disabled={!active || index === 0} onClick={() => void moveCategory(category, -1)}>↑</Button>
                    <Button type="button" size="icon" variant="ghost" title="Mover para baixo" disabled={!active || index >= siblings.length - 1} onClick={() => void moveCategory(category, 1)}>↓</Button>
                    <Button type="button" size="icon" variant="ghost" title="Excluir categoria" onClick={() => void removeCategory(category)}><Trash2 className="size-4" /></Button>
                  </>}
                </div>
              </div>
            );
          })}
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

      <Dialog open={guidedOpen} onOpenChange={setGuidedOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>✨ O que você deseja cadastrar?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Escolha o tipo e mostraremos somente as informações relevantes para esta loja.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(jewelryOnly || getStoreNicheModule(store?.category) === "joias"
              ? [
                  ["💍", "Anel"],
                  ["💎", "Aliança"],
                  ["📿", "Colar"],
                  ["⛓️", "Corrente"],
                  ["✨", "Brinco"],
                  ["🔗", "Pulseira"],
                  ["💎", "Pingente"],
                  ["👑", "Conjunto"],
                  ["🎁", "Outro"],
                ]
              : shoesOnly
              ? [
                  ["👟", "Tênis"],
                  ["👢", "Botas"],
                  ["👞", "Sapatos"],
                  ["🩴", "Sandálias"],
                  ["🥿", "Sapatilhas"],
                  ["🧒", "Infantil"],
                  ["⚽", "Esportivos"],
                  ["🎯", "Personalizados"],
                ]
              : cafeteriaOnly
                ? [
                    ["☕", "Café"],
                    ["🥛", "Cappuccino"],
                    ["🥟", "Empada"],
                    ["🥐", "Pastel Assado"],
                    ["🥧", "Tortinha"],
                    ["🍰", "Bolo"],
                    ["🍪", "Doce"],
                    ["🥤", "Bebida"],
                    ["⭐", "Combo"],
                  ]
                : trainingOnly
                  ? [
                      ["👕", "Camiseta de treino"],
                      ["💨", "Camiseta Dry Fit"],
                      ["🏃", "Regata"],
                      ["👚", "Top"],
                      ["🩳", "Shorts"],
                      ["🦵", "Legging"],
                      ["🏋️", "Conjunto Fitness"],
                      ["🎯", "Personalizado"],
                    ]
                  : [
                      ["👕", "Camisa"],
                      ["👚", "Blusa"],
                      ["👗", "Vestido"],
                      ["👖", "Calça"],
                      ["🩳", "Shorts"],
                      ["🧥", "Jaqueta"],
                      ["🧶", "Moletom"],
                      ["✨", "Personalizado"],
                    ]
            )
              .map(([icon, label]) => [icon ?? "", label ?? ""] as const)
              .map(([icon, label]) => (
                <button
                  key={label}
                  type="button"
                  className="flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border p-2 text-center text-sm transition hover:border-primary hover:bg-primary/5"
                  onClick={() => {
                    setGuidedType(label);
                    const module = jewelryOnly || getStoreNicheModule(store?.category) === "joias"
                      ? "joias"
                      : cafeteriaOnly
                      ? "cafeteria"
                      : marmitariaOnly
                        ? "marmitaria"
                      : shoesOnly
                        ? "calcados"
                        : sportsOnly
                          ? "roupas_esportivas"
                            : trainingOnly
                              ? "roupas_treino"
                              : currentCategoryModule();
                    const jewelryCategoryByType: Record<string, string> = {
                      Anel: "aneis",
                      Aliança: "aliancas",
                      Colar: "colares",
                      Corrente: "correntes",
                      Brinco: "brincos",
                      Pulseira: "pulseiras",
                      Pingente: "pingentes",
                      Conjunto: "conjuntos",
                    };
                    const normalizeCategory = (value: string) =>
                      value
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLocaleLowerCase("pt-BR");
                    const matchingCategory = categories?.find((category) => {
                      const target = module === "joias" ? jewelryCategoryByType[label] : label;
                      return Boolean(
                        target && normalizeCategory(category.name).includes(normalizeCategory(target)),
                      );
                    });
                    setForm({
                      ...emptyForm,
                      module,
                      name: module === "joias" && label !== "Outro" ? label : "",
                      category_id: matchingCategory?.id ?? "none",
                      sports_product_type: module === "joias" ? "none" : label,
                    });
                    setEditing(null);
                    setVariants([]);
                    setOrderTiers([]);
                    setPhotos([]);
                    setGuidedOpen(false);
                    setOpen(true);
                  }}
                >
                  {icon}
                  <span>{label}</span>
                </button>
              ))}
          </div>
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setGuidedOpen(false);
                openNew();
              }}
            >
              ✍️ Cadastrar manualmente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={internetOpen} onOpenChange={setInternetOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>🌐 Buscar produto na Internet</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>O que você está procurando?</Label>
              <Textarea
                className="mt-1.5"
                rows={3}
                placeholder="Nike Air Force 1 branco, Camisa Flamengo 2026..."
                value={internetQuery}
                onChange={(event) => setInternetQuery(event.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                A busca mostra sugestões. Você escolherá o resultado e revisará tudo antes de
                salvar.
              </p>
            </div>
            <Button
              disabled={internetSearching || internetQuery.trim().length < 2}
              onClick={async () => {
                setInternetSearching(true);
                try {
                  const result = await discover({ data: { query: internetQuery } });
                  setInternetResults(result.results);
                  if (!result.results.length)
                    toast.info(
                      "Não encontramos uma correspondência confiável. Tente outra busca ou cadastre manualmente.",
                    );
                } catch {
                  toast.error("Não foi possível buscar agora. Tente novamente.");
                } finally {
                  setInternetSearching(false);
                }
              }}
            >
              {internetSearching ? "Buscando..." : "🔎 Buscar produto"}
            </Button>
            {internetResults.length ? (
              <div>
                <p className="mb-2 text-sm font-semibold">🔎 Encontramos estes produtos</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {internetResults.map((result) => (
                    <article key={result.id} className="rounded-xl border p-3">
                      <div className="flex gap-3">
                        {result.image ? (
                          <img
                            src={result.image}
                            alt=""
                            className="size-16 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-muted text-2xl">
                            📦
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium">{result.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.category ?? "Categoria a confirmar"}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Fonte: {result.sourceName}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">Sugestão editável</span>
                        <Button
                          size="sm"
                          onClick={() => {
                            const suggestion = interpretProductText(result.name, currentCategoryModule());
                            if (suggestion.module === "joias" && store?.plan !== "pro") {
                              toast.error("Joias e Semijoias é exclusivo do Vitrini PRO.");
                              return;
                            }
                            setEditing(null);
                            setImportedDiscovery(result);
                            setVariants([]);
                            setOrderTiers([]);
                            setPhotos(result.image ? [result.image] : []);
                            setForm({
                              ...emptyForm,
                              module: suggestion.module,
                              name: result.name,
                              description: result.description ?? "",
                              shoe_size: suggestion.size ?? "",
                              shoe_color: suggestion.color ?? "",
                              shoe_gender: suggestion.gender ?? "unissex",
                              shoe_authenticity: "original",
                            });
                            setManualShoeBrand("");
                            setManualShoeModel("");
                            setInternetOpen(false);
                            setOpen(true);
                            toast.success(
                              "Dados importados para revisão. Nada foi publicado automaticamente.",
                            );
                          }}
                        >
                          Usar este produto
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Imagens e informações encontradas na internet podem ter restrições de uso. Confira a
              fonte e prefira fotos próprias. O Vitrini não confirma autenticidade, preço ou
              autorização comercial.
            </p>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setInternetOpen(false);
                  openNew();
                }}
              >
                ✍️ Fazer manualmente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                          : smartSuggestion.module === "cafeteria"
                            ? "☕ Cafeteria"
                      : smartSuggestion.module === "marmitaria"
                              ? "🍱 Marmitaria"
                            : smartSuggestion.module === "joias"
                              ? "💎 Joias e Semijoias"
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
                  onClick={() => {
                    const suggestion = interpretProductText(smartText, currentCategoryModule());
                    if (suggestion.module === "joias" && store?.plan !== "pro") {
                      toast.error("Joias e Semijoias é exclusivo do Vitrini PRO.");
                      return;
                    }
                    setSmartSuggestion(suggestion);
                  }}
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
                {trainingOnly || shoesOnly || cafeteriaOnly || marmitariaOnly || jewelryOnly ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-sm font-medium">
                    {jewelryOnly
                      ? "💎 Joias e Semijoias"
                      : marmitariaOnly
                      ? "🍱 Marmitaria"
                      : cafeteriaOnly
                      ? "☕ Cafeteria"
                      : trainingOnly
                        ? "🏋️ Roupas de Treino / Academia"
                        : "👟 Calçados"}
                  </div>
                ) : (
                  <Select
                    value={form.module}
                    onValueChange={(
                      value:
                        | "roupas"
                        | "roupas_esportivas"
                        | "roupas_treino"
                        | "calcados"
                        | "cafeteria"
                        | "marmitaria"
                        | "joias",
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
                      <SelectItem value="cafeteria">☕ Cafeteria</SelectItem>
                      <SelectItem value="marmitaria">🍱 Marmitaria</SelectItem>
                      {store?.plan === "pro" ? <SelectItem value="joias">💎 Joias e Semijoias</SelectItem> : null}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  O produto aparecerá somente no módulo escolhido.
                </p>
              </div>
              {form.module === "marmitaria" || marmitariaOnly ? (
                <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                  <Label>🕐 Período da refeição</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["lunch", "☀️ Almoço"],
                      ["dinner", "🌙 Janta"],
                      ["both", "☀️🌙 Almoço e Janta"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, meal_period: value })}
                        className={`rounded-lg border p-2 text-xs ${form.meal_period === value ? "border-primary bg-primary/10 font-semibold" : ""}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
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
              {form.module === "joias" || jewelryOnly ? (
                <div className="space-y-3 rounded-xl border border-amber-300/60 bg-gradient-to-br from-amber-50/70 to-background p-4 dark:border-amber-900/60 dark:from-amber-950/20">
                  <div><p className="font-semibold">💎 Detalhes da joia</p><p className="text-xs text-muted-foreground">Material, banho, cor e pedra são opcionais.</p></div>
                  <div className="grid grid-cols-2 gap-3">
                    {([["jewelry_material", "Material", "Ouro, prata, aço"], ["jewelry_plating", "Banho", "Ouro 18K, ródio"], ["jewelry_color", "Cor", "Dourado, rosé"], ["jewelry_stone", "Pedra", "Zircônia, pérola"]] as const).map(([field, label, placeholder]) => <div key={field} className="space-y-1.5"><Label>{label}</Label><Input placeholder={placeholder} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} /></div>)}
                  </div>
                  <ToggleRow label="⭐ Exibir nos Lançamentos" checked={form.jewelry_is_new_release} onChange={(value) => setForm({ ...form, jewelry_is_new_release: value })} />
                  <ToggleRow label="🔥 Ativar oferta" checked={form.jewelry_offer_active} onChange={(value) => setForm({ ...form, jewelry_offer_active: value })} />
                  {form.jewelry_offer_active ? <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5"><Label>Preço original</Label><Input inputMode="decimal" value={form.jewelry_original_price} onChange={(event) => setForm({ ...form, jewelry_original_price: event.target.value })} /></div>
                    <div className="space-y-1.5"><Label>Preço promocional</Label><Input inputMode="decimal" value={form.jewelry_offer_price} onChange={(event) => setForm({ ...form, jewelry_offer_price: event.target.value })} /></div>
                    <div className="col-span-2 space-y-1.5"><Label>Validade (opcional)</Label><Input type="date" value={form.jewelry_offer_expires_at} onChange={(event) => setForm({ ...form, jewelry_offer_expires_at: event.target.value })} /></div>
                  </div> : null}
                </div>
              ) : null}
            </CollapsibleSection>
            {form.module === "calcados" ? (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                <p className="text-sm font-semibold">👟 Dados do Calçado</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="shoe-brand-input">Marca</Label>
                    <Input
                      id="shoe-brand-input"
                      list="shoe-brand-suggestions"
                      placeholder="Digite ou escolha uma sugestão"
                      value={manualShoeBrand}
                      onChange={(event) => {
                        const value = event.target.value;
                        const matchedBrand = (shoeBrands ?? []).find(
                          (brand) =>
                            brand.name.toLocaleLowerCase("pt-BR") ===
                            value.trim().toLocaleLowerCase("pt-BR"),
                        );
                        setManualShoeBrand(value);
                        setForm({
                          ...form,
                          shoe_brand_id: matchedBrand?.id ?? "none",
                          shoe_model_id: "none",
                        });
                        setManualShoeModel("");
                      }}
                    />
                    <datalist id="shoe-brand-suggestions">
                      {(shoeBrands ?? []).map((brand) => (
                        <option key={brand.id} value={brand.name} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="shoe-model-input">Modelo</Label>
                    <Input
                      id="shoe-model-input"
                      list="shoe-model-suggestions"
                      placeholder="Digite ou escolha uma sugestão"
                      value={manualShoeModel}
                      onChange={(event) => {
                        const value = event.target.value;
                        const matchedModel = (shoeModels ?? []).find(
                          (model) =>
                            model.name.toLocaleLowerCase("pt-BR") ===
                            value.trim().toLocaleLowerCase("pt-BR"),
                        );
                        setManualShoeModel(value);
                        const matchedBrand = matchedModel
                          ? (shoeBrands ?? []).find((brand) => brand.id === matchedModel.brand_id)
                          : undefined;
                        if (matchedBrand) setManualShoeBrand(matchedBrand.name);
                        setForm({
                          ...form,
                          shoe_brand_id: matchedBrand?.id ?? form.shoe_brand_id,
                          shoe_model_id: matchedModel?.id ?? "none",
                        });
                      }}
                    />
                    <datalist id="shoe-model-suggestions">
                      {(shoeModels ?? []).map((model) => (
                        <option key={model.id} value={model.name} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Novas marcas e modelos digitados ficam salvos como sugestões para os próximos cadastros.
                </p>
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
            {sportsCatalogEnabled && store?.plan === "pro" && sportsNodes?.length ? (
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
            {sportsCatalogEnabled && store?.plan === "pro" && sportsCollections?.length ? (
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
            {sportsCatalogEnabled && store?.plan === "pro" ? (
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
                  onClick={() => setVariants([...variants, { label: "", price: "", stock: "", sku: "", image_url: null }])}
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
                <div key={index} className="grid grid-cols-[1fr_84px_72px_auto] items-end gap-2 rounded-lg border p-2">
                  <div className="space-y-2">
                  <Input
                    placeholder="Opção"
                    value={variant.label}
                    onChange={(e) => {
                      const next = [...variants];
                      next[index] = { ...variant, label: e.target.value };
                      setVariants(next);
                    }}
                  />
                  <Input placeholder="SKU (opcional)" value={variant.sku} onChange={(e) => { const next = [...variants]; next[index] = { ...variant, sku: e.target.value }; setVariants(next); }} />
                  </div>
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
                  <label className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Imagem própria da variação">
                    <CategoryImagePreview path={variant.image_url} />
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadVariantImage(index, file); e.currentTarget.value = ""; }} />
                  </label>
                  <label className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Imagem própria da variação">
                    <CategoryImagePreview path={variant.image_url} />
                    <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadVariantImage(index, file); e.currentTarget.value = ""; }} />
                  </label>
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
              {form.module === "marmitaria" || marmitariaOnly ? (
                <ToggleRow
                  label="🚚 Habilitar entrega neste produto (solicita CEP e endereço)"
                  checked={form.delivery_enabled}
                  onChange={(v) => setForm({ ...form, delivery_enabled: v })}
                />
              ) : null}
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
