import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Eye,
  ImagePlus,
  Pencil,
  Plus,
  Rocket,
  Star,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CollapsibleSection } from "@/components/CollapsibleSection";
import { useIsAdmin } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DIGITAL_PRODUCT_ASSET_BUCKET,
  resolveDigitalProductAsset,
  uploadDigitalProductAsset,
} from "@/lib/images";
import {
  getDigitalProductAdminData,
  deleteDigitalProduct,
  saveDigitalProduct,
  saveDigitalProductCategory,
  updateDigitalProduct,
} from "@/lib/digital-products.functions";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProductRow = Database["public"]["Tables"]["digital_products"]["Row"];
type CategoryRow = Pick<
  Database["public"]["Tables"]["digital_product_categories"]["Row"],
  "id" | "name" | "slug" | "sort_order" | "is_active"
>;
const EMPTY_PRODUCTS: ProductRow[] = [];
const EMPTY_CATEGORIES: CategoryRow[] = [];
type PlanDraft = {
  name: string;
  price: string;
  description: string;
  features: string[];
  url: string;
};
type FaqDraft = { question: string; answer: string };
type ImageSlot = "mainImagePath" | "logoImagePath" | "bannerImagePath" | "shareImagePath";
type Draft = {
  id?: string;
  slug: string;
  name: string;
  productType: string;
  customProductType: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  mainImagePath: string | null;
  logoImagePath: string | null;
  galleryImagePaths: string[];
  bannerImagePath: string | null;
  shareImagePath: string | null;
  url: string;
  contractUrl: string;
  demoUrl: string;
  supportUrl: string;
  ctaLabel: string;
  contractCtaLabel: string;
  demoCtaLabel: string;
  supportCtaLabel: string;
  bannerTitle: string;
  bannerSubtitle: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  features: string[];
  benefits: string[];
  plans: PlanDraft[];
  faqs: FaqDraft[];
  videoUrl: string;
  seoTitle: string;
  seoDescription: string;
  cardClickable: boolean;
  openNewTab: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
};

const newDraft = (): Draft => ({
  slug: "",
  name: "",
  productType: "software",
  customProductType: "",
  categoryId: "",
  shortDescription: "",
  description: "",
  mainImagePath: null,
  logoImagePath: null,
  galleryImagePaths: [],
  bannerImagePath: null,
  shareImagePath: null,
  url: "",
  contractUrl: "",
  demoUrl: "",
  supportUrl: "",
  ctaLabel: "Conhecer software",
  contractCtaLabel: "Assinar",
  demoCtaLabel: "Ver demonstração",
  supportCtaLabel: "Suporte",
  bannerTitle: "",
  bannerSubtitle: "",
  primaryColor: "#2563EB",
  secondaryColor: "#0F172A",
  backgroundColor: "#FFFFFF",
  features: [],
  benefits: [],
  plans: [],
  faqs: [],
  videoUrl: "",
  seoTitle: "",
  seoDescription: "",
  cardClickable: true,
  openNewTab: true,
  isFeatured: false,
  isActive: false,
  sortOrder: 0,
});

const PRODUCT_TYPES = [
  ["software", "💻 Software"],
  ["app", "📱 Aplicativo"],
  ["saas", "☁️ SaaS"],
  ["course", "📚 Curso"],
  ["service", "🛠️ Serviço digital"],
  ["digital_product", "📦 Produto digital"],
  ["tool", "🧰 Ferramenta"],
  ["other", "➕ Personalizado"],
] as const;

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}
function isStoredDigitalAsset(path: string | null | undefined): path is string {
  return Boolean(path && !/^https?:\/\//i.test(path));
}
function rowToDraft(product: ProductRow): Draft {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    productType: product.product_type,
    customProductType: product.custom_type_label ?? "",
    categoryId: product.category_id ?? "",
    shortDescription: product.short_description,
    description: product.description,
    mainImagePath: product.main_image_path,
    logoImagePath: product.logo_image_path,
    galleryImagePaths: product.gallery_image_paths,
    bannerImagePath: product.banner_image_path,
    shareImagePath: product.share_image_path,
    url: product.url,
    contractUrl: product.contract_url ?? "",
    demoUrl: product.demo_url ?? "",
    supportUrl: product.support_url ?? "",
    ctaLabel: product.cta_label,
    contractCtaLabel: product.contract_cta_label,
    demoCtaLabel: product.demo_cta_label,
    supportCtaLabel: product.support_cta_label,
    bannerTitle: product.banner_title ?? "",
    bannerSubtitle: product.banner_subtitle ?? "",
    primaryColor: product.primary_color,
    secondaryColor: product.secondary_color,
    backgroundColor: product.background_color,
    features: product.features,
    benefits: product.benefits,
    plans: (product.plans as unknown as PlanDraft[]) ?? [],
    faqs: (product.faqs as unknown as FaqDraft[]) ?? [],
    videoUrl: product.video_url ?? "",
    seoTitle: product.seo_title ?? "",
    seoDescription: product.seo_description ?? "",
    cardClickable: product.card_clickable,
    openNewTab: product.open_new_tab,
    isFeatured: product.is_featured,
    isActive: product.is_active,
    sortOrder: product.sort_order,
  };
}

export const Route = createFileRoute("/_authenticated/admin_/softwares")({
  head: () => ({
    meta: [
      { title: "Meus Softwares | Vitrini" },
      {
        name: "description",
        content: "Administre o catálogo público de softwares e produtos digitais.",
      },
    ],
  }),
  component: AdminDigitalProducts,
});

function AdminDigitalProducts() {
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const queryClient = useQueryClient();
  const getData = useServerFn(getDigitalProductAdminData);
  const saveProduct = useServerFn(saveDigitalProduct);
  const createCategory = useServerFn(saveDigitalProductCategory);
  const updateProduct = useServerFn(updateDigitalProduct);
  const removeProduct = useServerFn(deleteDigitalProduct);
  const { data, isLoading, error } = useQuery({
    queryKey: ["digital-product-admin"],
    enabled: isAdmin === true,
    queryFn: () => getData(),
  });
  const products = data?.products ?? EMPTY_PRODUCTS;
  const categories = data?.categories ?? EMPTY_CATEGORIES;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(newDraft());
  const [originalAssetPaths, setOriginalAssetPaths] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<Record<ImageSlot, File | null>>({
    mainImagePath: null,
    logoImagePath: null,
    bannerImagePath: null,
    shareImagePath: null,
  });
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryEditingId, setCategoryEditingId] = useState<string | null>(null);

  const orderedProducts = useMemo(
    () => [...products].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [products],
  );
  const featuredCount = products.filter((product) => product.is_featured).length;

  function openNew() {
    setDraft({ ...newDraft(), sortOrder: products.length * 10 });
    setOriginalAssetPaths([]);
    setImageFiles({
      mainImagePath: null,
      logoImagePath: null,
      bannerImagePath: null,
      shareImagePath: null,
    });
    setGalleryFiles([]);
    setDialogOpen(true);
  }
  function openEdit(product: ProductRow) {
    setDraft(rowToDraft(product));
    setOriginalAssetPaths(
      [
        ...product.gallery_image_paths,
        product.main_image_path,
        product.logo_image_path,
        product.banner_image_path,
        product.share_image_path,
      ].filter((path): path is string => Boolean(path)),
    );
    setImageFiles({
      mainImagePath: null,
      logoImagePath: null,
      bannerImagePath: null,
      shareImagePath: null,
    });
    setGalleryFiles([]);
    setDialogOpen(true);
  }
  function patch<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function setName(name: string) {
    setDraft((current) => ({ ...current, name, slug: current.id ? current.slug : slugify(name) }));
  }
  function addLines(key: "features" | "benefits", text: string) {
    patch(
      key,
      text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    );
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error("Sua sessão expirou. Entre novamente.");
      const paths: Record<ImageSlot, string | null> = {
        mainImagePath: draft.mainImagePath,
        logoImagePath: draft.logoImagePath,
        bannerImagePath: draft.bannerImagePath,
        shareImagePath: draft.shareImagePath,
      };
      const galleryImagePaths = [...draft.galleryImagePaths];
      const uploadedPaths: string[] = [];
      const saved = await (async () => {
        try {
          for (const slot of Object.keys(imageFiles) as ImageSlot[]) {
            const file = imageFiles[slot];
            if (file) {
              const path = await uploadDigitalProductAsset(authData.user.id, file);
              paths[slot] = path;
              uploadedPaths.push(path);
            }
          }
          for (const file of galleryFiles) {
            const path = await uploadDigitalProductAsset(authData.user.id, file);
            galleryImagePaths.push(path);
            uploadedPaths.push(path);
          }
          return await saveProduct({
            data: {
              ...draft,
              categoryId: draft.categoryId || null,
              mainImagePath: paths.mainImagePath,
              logoImagePath: paths.logoImagePath,
              bannerImagePath: paths.bannerImagePath,
              shareImagePath: paths.shareImagePath,
              galleryImagePaths,
              sortOrder: Math.max(0, draft.sortOrder),
            },
          });
        } catch (error) {
          if (uploadedPaths.length) {
            const { error: cleanupError } = await supabase.storage
              .from(DIGITAL_PRODUCT_ASSET_BUCKET)
              .remove(uploadedPaths);
            if (cleanupError)
              console.warn(
                "[digital-products] não foi possível limpar upload rejeitado",
                cleanupError.message,
              );
          }
          throw error;
        }
      })();
      const retained = new Set(
        [
          ...galleryImagePaths,
          paths.mainImagePath,
          paths.logoImagePath,
          paths.bannerImagePath,
          paths.shareImagePath,
        ].filter(isStoredDigitalAsset),
      );
      const candidates = originalAssetPaths.filter(
        (path) => isStoredDigitalAsset(path) && !retained.has(path),
      );
      if (candidates.length) {
        const { data: others, error: lookupError } = await supabase
          .from("digital_products")
          .select(
            "id, main_image_path, logo_image_path, banner_image_path, share_image_path, gallery_image_paths",
          )
          .neq("id", saved.id);
        if (lookupError)
          console.warn(
            "[digital-products] não foi possível conferir imagens antigas",
            lookupError.message,
          );
        else {
          const stillReferenced = new Set<string>();
          for (const other of others ?? []) {
            for (const path of [
              other.main_image_path,
              other.logo_image_path,
              other.banner_image_path,
              other.share_image_path,
              ...other.gallery_image_paths,
            ]) {
              if (path) stillReferenced.add(path);
            }
          }
          const safeToRemove = candidates.filter((path) => !stillReferenced.has(path));
          if (safeToRemove.length) {
            const { error: removeError } = await supabase.storage
              .from(DIGITAL_PRODUCT_ASSET_BUCKET)
              .remove(safeToRemove);
            if (removeError)
              console.warn(
                "[digital-products] não foi possível remover imagens antigas",
                removeError.message,
              );
          }
        }
      }
      return saved;
    },
    onSuccess: () => {
      toast.success(
        draft.isActive ? "Software salvo e publicado." : "Software salvo como rascunho.",
      );
      setDialogOpen(false);
      setImageFiles({
        mainImagePath: null,
        logoImagePath: null,
        bannerImagePath: null,
        shareImagePath: null,
      });
      setGalleryFiles([]);
      void queryClient.invalidateQueries({ queryKey: ["digital-product-admin"] });
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar."),
  });

  const categoryMutation = useMutation({
    mutationFn: () =>
      createCategory({
        data: {
          ...(categoryEditingId ? { id: categoryEditingId } : {}),
          name: categoryName.trim(),
          slug: categorySlug || slugify(categoryName),
        },
      }),
    onSuccess: (category) => {
      toast.success(categoryEditingId ? "Categoria atualizada." : "Categoria criada.");
      setCategoryName("");
      setCategorySlug("");
      setCategoryEditingId(null);
      void queryClient.invalidateQueries({ queryKey: ["digital-product-admin"] });
      patch("categoryId", category.id);
    },
    onError: (error: unknown) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a categoria."),
  });

  async function changeOrder(product: ProductRow, direction: -1 | 1) {
    const index = orderedProducts.findIndex((item) => item.id === product.id);
    const sibling = orderedProducts[index + direction];
    if (!sibling) return;
    const results = await Promise.all([
      updateProduct({ data: { id: product.id, changes: { sort_order: sibling.sort_order } } }),
      updateProduct({ data: { id: sibling.id, changes: { sort_order: product.sort_order } } }),
    ]);
    void results;
    await queryClient.invalidateQueries({ queryKey: ["digital-product-admin"] });
  }

  function toggleProduct(product: ProductRow, key: "is_active" | "is_featured", value: boolean) {
    void updateProduct({ data: { id: product.id, changes: { [key]: value } } })
      .then(() => queryClient.invalidateQueries({ queryKey: ["digital-product-admin"] }))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : "Não foi possível atualizar."),
      );
  }

  async function deleteProduct(product: ProductRow) {
    if (
      !window.confirm(`Excluir permanentemente “${product.name}”? Esta ação não pode ser desfeita.`)
    )
      return;
    try {
      await removeProduct({ data: { id: product.id } });
      const candidates = [
        ...product.gallery_image_paths,
        product.main_image_path,
        product.logo_image_path,
        product.banner_image_path,
        product.share_image_path,
      ].filter(isStoredDigitalAsset);
      if (candidates.length) {
        const { data: others, error: lookupError } = await supabase
          .from("digital_products")
          .select(
            "main_image_path, logo_image_path, banner_image_path, share_image_path, gallery_image_paths",
          );
        if (lookupError)
          console.warn(
            "[digital-products] não foi possível conferir imagens após a exclusão",
            lookupError.message,
          );
        else {
          const referenced = new Set<string>();
          for (const other of others ?? [])
            for (const path of [
              other.main_image_path,
              other.logo_image_path,
              other.banner_image_path,
              other.share_image_path,
              ...other.gallery_image_paths,
            ])
              if (path) referenced.add(path);
          const unused = candidates.filter((path) => !referenced.has(path));
          if (unused.length) {
            const { error: removeError } = await supabase.storage
              .from(DIGITAL_PRODUCT_ASSET_BUCKET)
              .remove(unused);
            if (removeError)
              console.warn(
                "[digital-products] não foi possível remover assets órfãos",
                removeError.message,
              );
          }
        }
      }
      toast.success("Software excluído.");
      void queryClient.invalidateQueries({ queryKey: ["digital-product-admin"] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
  }

  if (adminLoading || (isAdmin && isLoading))
    return (
      <AppShell title="Meus Softwares">
        <p className="text-sm text-muted-foreground">Carregando catálogo...</p>
      </AppShell>
    );
  if (!isAdmin)
    return (
      <AppShell title="Meus Softwares">
        <div className="surface p-10 text-center text-sm text-muted-foreground">
          Você não tem acesso a esta área.
        </div>
      </AppShell>
    );

  return (
    <AppShell
      title="🚀 Meus Softwares"
      description="Vitrine pública de softwares e produtos digitais"
      action={
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/softwares" target="_blank" rel="noopener noreferrer">
              <Eye className="size-4 sm:mr-1" />
              <span className="hidden sm:inline">Abrir vitrine</span>
            </a>
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="size-4 sm:mr-1" />
            <span className="hidden sm:inline">Adicionar software</span>
          </Button>
        </div>
      }
    >
      {error ? (
        <div className="surface mb-4 p-4 text-sm text-destructive">
          Não foi possível carregar o catálogo. Verifique se a migration SQL foi aplicada.
        </div>
      ) : null}
      <section className="surface mb-5 flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <h2 className="font-semibold">Sua vitrine digital</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie apresentações públicas sem misturar com o catálogo de produtos físicos.
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Badge variant="secondary">{products.length} cadastrados</Badge>
          <Badge>{products.filter((item) => item.is_active).length} publicados</Badge>
          {featuredCount ? <Badge variant="outline">⭐ {featuredCount} destaque(s)</Badge> : null}
        </div>
      </section>

      <CollapsibleSection
        title="Categorias"
        description={`${categories.length} categorias · clique para gerenciar`}
        className="mb-5"
      >
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-wrap items-center gap-2">
              <Badge variant={category.is_active ? "secondary" : "outline"}>
                {category.name}
                {category.is_active ? "" : " · Inativa"}
              </Badge>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setCategoryEditingId(category.id);
                  setCategoryName(category.name);
                  setCategorySlug(category.slug);
                }}
              >
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  void createCategory({
                    data: {
                      id: category.id,
                      name: category.name,
                      slug: category.slug,
                      isActive: !category.is_active,
                    },
                  })
                    .then(() =>
                      queryClient.invalidateQueries({ queryKey: ["digital-product-admin"] }),
                    )
                    .catch((error: unknown) =>
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : "Não foi possível atualizar a categoria.",
                      ),
                    )
                }
              >
                {category.is_active ? "Desativar" : "Ativar"}
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Nome da categoria"
            value={categoryName}
            onChange={(event) => {
              setCategoryName(event.target.value);
              setCategorySlug(slugify(event.target.value));
            }}
          />
          <Input
            placeholder="Slug"
            value={categorySlug}
            onChange={(event) => setCategorySlug(slugify(event.target.value))}
          />
          {categoryEditingId ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setCategoryEditingId(null);
                setCategoryName("");
                setCategorySlug("");
              }}
            >
              Cancelar edição
            </Button>
          ) : null}
          <Button
            variant="outline"
            disabled={!categoryName.trim() || categoryMutation.isPending}
            onClick={() => categoryMutation.mutate()}
          >
            {categoryEditingId ? "Salvar categoria" : "Adicionar categoria"}
          </Button>
        </div>
      </CollapsibleSection>

      {orderedProducts.length ? (
        <div className="space-y-3">
          {orderedProducts.map((product, index) => (
            <DigitalProductAdminCard
              key={product.id}
              product={product}
              category={categories.find((item) => item.id === product.category_id)}
              first={index === 0}
              last={index === orderedProducts.length - 1}
              onEdit={() => openEdit(product)}
              onMove={(direction) => void changeOrder(product, direction)}
              onDelete={() => void deleteProduct(product)}
              onToggleActive={(value) => toggleProduct(product, "is_active", value)}
              onToggleFeatured={(value) => toggleProduct(product, "is_featured", value)}
            />
          ))}
        </div>
      ) : (
        <div className="surface p-12 text-center">
          <Rocket className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Comece sua vitrine digital</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cadastre o primeiro software, aplicativo ou serviço digital.
          </p>
          <Button className="mt-4" onClick={openNew}>
            <Plus className="mr-2 size-4" />
            Adicionar software
          </Button>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar software" : "Adicionar software"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
            <div className="space-y-5">
              <section className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Informações principais
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Nome do software">
                    <Input
                      value={draft.name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ex.: Vitrini"
                    />
                  </Field>
                  <Field label="Tipo">
                    <select
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={draft.productType}
                      onChange={(event) => patch("productType", event.target.value)}
                    >
                      {PRODUCT_TYPES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {draft.productType === "other" ? (
                    <Field label="Nome do tipo personalizado">
                      <Input
                        maxLength={80}
                        value={draft.customProductType}
                        onChange={(event) => patch("customProductType", event.target.value)}
                        placeholder="Ex.: Plataforma de pagamentos"
                      />
                    </Field>
                  ) : null}
                </div>
                <Field label="Endereço da página pública">
                  <Input
                    value={draft.slug}
                    onChange={(event) => patch("slug", slugify(event.target.value))}
                    placeholder="vitrini"
                  />
                  <p className="text-xs text-muted-foreground">
                    /softwares/{draft.slug || "seu-software"}
                  </p>
                </Field>
                <Field label="Categoria">
                  <select
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={draft.categoryId}
                    onChange={(event) => patch("categoryId", event.target.value)}
                  >
                    <option value="">Sem categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Descrição curta">
                  <Input
                    maxLength={240}
                    value={draft.shortDescription}
                    onChange={(event) => patch("shortDescription", event.target.value)}
                    placeholder="Uma frase para apresentar a solução"
                  />
                </Field>
                <Field label="Descrição completa">
                  <Textarea
                    rows={5}
                    value={draft.description}
                    onChange={(event) => patch("description", event.target.value)}
                    placeholder="Explique como o produto funciona e para quem foi criado."
                  />
                </Field>
                <Field label="Link principal (obrigatório)">
                  <Input
                    type="url"
                    value={draft.url}
                    onChange={(event) => patch("url", event.target.value)}
                    placeholder="https://seusoftware.com.br"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Texto do CTA principal">
                    <Input
                      value={draft.ctaLabel}
                      onChange={(event) => patch("ctaLabel", event.target.value)}
                    />
                  </Field>
                  <Field label="Ordem">
                    <Input
                      type="number"
                      min="0"
                      value={draft.sortOrder}
                      onChange={(event) => patch("sortOrder", Number(event.target.value))}
                    />
                  </Field>
                </div>
              </section>

              <CollapsibleSection
                title="Imagens e identidade"
                description="Capa, logo, banner e galeria de imagens"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <ImageUploadField
                    label="Imagem principal"
                    path={draft.mainImagePath}
                    file={imageFiles.mainImagePath}
                    onFile={(file) =>
                      setImageFiles((current) => ({ ...current, mainImagePath: file ?? null }))
                    }
                    onRemove={() => {
                      patch("mainImagePath", null);
                      setImageFiles((current) => ({ ...current, mainImagePath: null }));
                    }}
                  />
                  <ImageUploadField
                    label="Logo"
                    path={draft.logoImagePath}
                    file={imageFiles.logoImagePath}
                    onFile={(file) =>
                      setImageFiles((current) => ({ ...current, logoImagePath: file ?? null }))
                    }
                    onRemove={() => {
                      patch("logoImagePath", null);
                      setImageFiles((current) => ({ ...current, logoImagePath: null }));
                    }}
                  />
                  <ImageUploadField
                    label="Banner"
                    path={draft.bannerImagePath}
                    file={imageFiles.bannerImagePath}
                    onFile={(file) =>
                      setImageFiles((current) => ({ ...current, bannerImagePath: file ?? null }))
                    }
                    onRemove={() => {
                      patch("bannerImagePath", null);
                      setImageFiles((current) => ({ ...current, bannerImagePath: null }));
                    }}
                  />
                  <ImageUploadField
                    label="Imagem de compartilhamento"
                    path={draft.shareImagePath || draft.mainImagePath}
                    file={imageFiles.shareImagePath}
                    onFile={(file) =>
                      setImageFiles((current) => ({ ...current, shareImagePath: file ?? null }))
                    }
                    onRemove={() => {
                      patch("shareImagePath", null);
                      setImageFiles((current) => ({ ...current, shareImagePath: null }));
                    }}
                  />
                </div>
                <Field label="Imagens adicionais">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      setGalleryFiles((files) => [
                        ...files,
                        ...Array.from(event.target.files ?? []),
                      ]);
                      event.currentTarget.value = "";
                    }}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draft.galleryImagePaths.map((path, index) => (
                      <div key={`${path}-${index}`} className="relative">
                        <AssetThumb path={path} />
                        <button
                          type="button"
                          onClick={() =>
                            patch(
                              "galleryImagePaths",
                              draft.galleryImagePaths.filter((_, i) => i !== index),
                            )
                          }
                          aria-label="Remover imagem da galeria"
                          className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-white"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))}
                    {galleryFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex size-16 items-center justify-center rounded-lg border text-xs"
                      >
                        {file.name.slice(0, 10)}
                      </div>
                    ))}
                  </div>
                </Field>
              </CollapsibleSection>

              <CollapsibleSection
                title="Links e botões opcionais"
                description="Contratação, demonstração e suporte"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Link de contratação">
                    <Input
                      type="url"
                      value={draft.contractUrl}
                      onChange={(event) => patch("contractUrl", event.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Texto do botão">
                    <Input
                      value={draft.contractCtaLabel}
                      onChange={(event) => patch("contractCtaLabel", event.target.value)}
                    />
                  </Field>
                  <Field label="Link da demonstração">
                    <Input
                      type="url"
                      value={draft.demoUrl}
                      onChange={(event) => patch("demoUrl", event.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Texto do botão">
                    <Input
                      value={draft.demoCtaLabel}
                      onChange={(event) => patch("demoCtaLabel", event.target.value)}
                    />
                  </Field>
                  <Field label="Link de suporte">
                    <Input
                      type="url"
                      value={draft.supportUrl}
                      onChange={(event) => patch("supportUrl", event.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Texto do botão">
                    <Input
                      value={draft.supportCtaLabel}
                      onChange={(event) => patch("supportCtaLabel", event.target.value)}
                    />
                  </Field>
                  <Field label="Link de vídeo">
                    <Input
                      type="url"
                      value={draft.videoUrl}
                      onChange={(event) => patch("videoUrl", event.target.value)}
                      placeholder="https://..."
                    />
                  </Field>
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Conteúdo da página"
                description="Banner, recursos, benefícios, planos e perguntas frequentes"
              >
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Título do banner">
                      <Input
                        value={draft.bannerTitle}
                        onChange={(event) => patch("bannerTitle", event.target.value)}
                      />
                    </Field>
                    <Field label="Subtítulo do banner">
                      <Input
                        value={draft.bannerSubtitle}
                        onChange={(event) => patch("bannerSubtitle", event.target.value)}
                      />
                    </Field>
                  </div>
                  <Field label="Funcionalidades (uma por linha)">
                    <Textarea
                      rows={4}
                      value={draft.features.join("\n")}
                      onChange={(event) => addLines("features", event.target.value)}
                      placeholder="Organize seus produtos\nReceba pedidos pelo WhatsApp"
                    />
                  </Field>
                  <Field label="Benefícios (um por linha)">
                    <Textarea
                      rows={3}
                      value={draft.benefits.join("\n")}
                      onChange={(event) => addLines("benefits", event.target.value)}
                    />
                  </Field>
                  <PlanEditor plans={draft.plans} onChange={(plans) => patch("plans", plans)} />
                  <FaqEditor faqs={draft.faqs} onChange={(faqs) => patch("faqs", faqs)} />
                </div>
              </CollapsibleSection>

              <CollapsibleSection
                title="Personalização e SEO"
                description="Cores, compartilhamento e busca"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  {(["primaryColor", "secondaryColor", "backgroundColor"] as const).map((key) => (
                    <label key={key} className="flex items-center gap-2 text-xs">
                      <input
                        type="color"
                        value={draft[key]}
                        onChange={(event) => patch(key, event.target.value)}
                        className="size-10 cursor-pointer rounded border border-border bg-transparent"
                      />
                      <span>
                        {key === "primaryColor"
                          ? "Principal"
                          : key === "secondaryColor"
                            ? "Secundária"
                            : "Fundo"}
                        <Input
                          className="mt-1 h-8 uppercase"
                          value={draft[key]}
                          onChange={(event) => patch(key, event.target.value.toUpperCase())}
                        />
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Título para Google e redes sociais">
                    <Input
                      maxLength={180}
                      value={draft.seoTitle}
                      onChange={(event) => patch("seoTitle", event.target.value)}
                    />
                  </Field>
                  <Field label="Descrição para compartilhamento">
                    <Textarea
                      rows={2}
                      maxLength={320}
                      value={draft.seoDescription}
                      onChange={(event) => patch("seoDescription", event.target.value)}
                    />
                  </Field>
                </div>
              </CollapsibleSection>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Prévia</h3>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewOpen(true)}
                >
                  <Eye className="mr-2 size-4" />
                  Visualizar página
                </Button>
              </div>
              <DigitalPreview draft={draft} imageFile={imageFiles.mainImagePath} />
              <div className="space-y-3 rounded-xl border border-border p-4">
                <ToggleRow
                  label="Publicado"
                  description="Visível na página pública"
                  checked={draft.isActive}
                  onChange={(checked) => patch("isActive", checked)}
                />
                <ToggleRow
                  label="Destaque"
                  description="Aparece primeiro no catálogo"
                  checked={draft.isFeatured}
                  onChange={(checked) => patch("isFeatured", checked)}
                />
                <ToggleRow
                  label="Card clicável"
                  description="Área vazia do card abre o link"
                  checked={draft.cardClickable}
                  onChange={(checked) => patch("cardClickable", checked)}
                />
                <ToggleRow
                  label="Abrir link em nova aba"
                  description="Recomendado para sites externos"
                  checked={draft.openNewTab}
                  onChange={(checked) => patch("openNewTab", checked)}
                />
              </div>
            </aside>
          </div>
          <DialogFooter className="sticky bottom-0 bg-background pt-3">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending
                ? "Salvando..."
                : draft.isActive
                  ? "Salvar e publicar"
                  : "Salvar rascunho"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-5xl">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>Prévia da página pública</DialogTitle>
          </DialogHeader>
          <DraftFullPreview draft={draft} />
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function DigitalProductAdminCard({
  product,
  category,
  first,
  last,
  onEdit,
  onMove,
  onDelete,
  onToggleActive,
  onToggleFeatured,
}: {
  product: ProductRow;
  category: CategoryRow | undefined;
  first: boolean;
  last: boolean;
  onEdit: () => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
  onToggleFeatured: (featured: boolean) => void;
}) {
  return (
    <article className="surface flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <AssetThumb path={product.main_image_path} className="h-24 w-full shrink-0 sm:w-36" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">{product.name}</h3>
          {product.is_featured ? <Badge variant="outline">⭐ Destaque</Badge> : null}
          <Badge variant={product.is_active ? "default" : "secondary"}>
            {product.is_active ? "Publicado" : "Rascunho"}
          </Badge>
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {product.short_description || "Sem descrição curta."}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {product.custom_type_label ||
            PRODUCT_TYPES.find(([value]) => value === product.product_type)?.[1] ||
            "Produto digital"}{" "}
          · {category?.name || "Sem categoria"} · /softwares/{product.slug}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1 sm:justify-end">
        <Button
          size="icon"
          variant="ghost"
          title="Mover para cima"
          disabled={first}
          onClick={() => onMove(-1)}
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Mover para baixo"
          disabled={last}
          onClick={() => onMove(1)}
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="mr-1.5 size-4" />
          Editar
        </Button>
        <Button
          size="sm"
          variant={product.is_active ? "secondary" : "default"}
          onClick={() => onToggleActive(!product.is_active)}
        >
          {product.is_active ? "Despublicar" : "Publicar"}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title={product.is_featured ? "Remover destaque" : "Destacar"}
          onClick={() => onToggleFeatured(!product.is_featured)}
        >
          <Star
            className={`size-4 ${product.is_featured ? "fill-amber-400 text-amber-500" : ""}`}
          />
        </Button>
        <Button asChild size="icon" variant="ghost" title="Abrir software">
          <a href={product.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" />
          </a>
        </Button>
        <Button asChild size="icon" variant="ghost" title="Abrir página pública">
          <a href={`/softwares/${product.slug}`} target="_blank" rel="noopener noreferrer">
            <Eye className="size-4" />
          </a>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Excluir permanentemente"
          aria-label="Excluir permanentemente"
          onClick={onDelete}
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>
    </article>
  );
}

function AssetThumb({ path, className = "size-16" }: { path: string | null; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    setUrl(resolveDigitalProductAsset(path));
  }, [path]);
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted ${className}`}
    >
      {url ? (
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <ImagePlus className="size-5 text-muted-foreground" />
      )}
    </div>
  );
}

function ImageUploadField({
  label,
  path,
  file,
  onFile,
  onRemove,
}: {
  label: string;
  path: string | null;
  file: File | null;
  onFile: (file?: File) => void;
  onRemove: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (file) {
      const local = URL.createObjectURL(file);
      setUrl(local);
      return () => URL.revokeObjectURL(local);
    }
    setUrl(resolveDigitalProductAsset(path));
    return;
  }, [file, path]);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
          {url ? (
            <img src={url} alt={`Prévia: ${label}`} className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0">
          <Input
            type="file"
            accept="image/*"
            onChange={(event) => {
              onFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <p className="mt-1 text-xs text-muted-foreground">Enviar ou substituir imagem.</p>
          {path || file ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-1 h-7 px-2 text-destructive"
              onClick={onRemove}
            >
              Remover imagem
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DraftFullPreview({ draft }: { draft: Draft }) {
  return (
    <div
      className="overflow-hidden rounded-b-xl border-t border-border"
      style={{ backgroundColor: draft.backgroundColor }}
    >
      <section
        className="relative isolate overflow-hidden px-6 py-10 text-white"
        style={{ backgroundColor: draft.secondaryColor }}
      >
        {draft.bannerImagePath ? (
          <AssetThumb
            path={draft.bannerImagePath}
            className="absolute inset-0 -z-10 size-full rounded-none border-0 opacity-30"
          />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/70 to-black/20" />
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-3">
            {draft.logoImagePath ? (
              <AssetThumb path={draft.logoImagePath} className="size-12 rounded-xl bg-white" />
            ) : (
              <span className="grid size-12 place-items-center rounded-xl bg-white/15">
                <Rocket className="size-6" />
              </span>
            )}
            <Badge className="border-white/20 bg-white/10 text-white">
              {draft.productType === "other" && draft.customProductType.trim()
                ? draft.customProductType
                : PRODUCT_TYPES.find(([value]) => value === draft.productType)?.[1] ||
                  "Produto digital"}
            </Badge>
          </div>
          <h2 className="mt-5 text-3xl font-bold">
            {draft.bannerTitle || draft.name || "Nome do software"}
          </h2>
          <p className="mt-3 text-sm text-white/80">
            {draft.bannerSubtitle || draft.shortDescription || "Descrição do produto digital"}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: draft.primaryColor }}
            >
              {draft.ctaLabel}
            </span>
            {draft.demoUrl ? (
              <span className="rounded-lg border border-white/40 px-4 py-2 text-sm">
                {draft.demoCtaLabel}
              </span>
            ) : null}
          </div>
        </div>
      </section>
      <div className="grid gap-6 p-5 sm:grid-cols-[1fr_0.7fr] sm:p-7">
        <div className="space-y-5">
          <div>
            <h3 className="text-lg font-bold">Sobre {draft.name || "o produto"}</h3>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {draft.description ||
                draft.shortDescription ||
                "A descrição completa aparecerá nesta área."}
            </p>
          </div>
          {draft.features.length ? (
            <div>
              <h4 className="font-semibold">Funcionalidades</h4>
              <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {draft.features.map((item, index) => (
                  <li
                    key={`${item}-${index}`}
                    className="rounded-lg border border-border bg-card p-3 text-sm"
                  >
                    ✓ {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {draft.benefits.length ? (
            <div>
              <h4 className="font-semibold">Benefícios</h4>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {draft.benefits.map((item, index) => (
                  <li key={`${item}-${index}`}>✓ {item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {draft.faqs.length ? (
            <div>
              <h4 className="font-semibold">Perguntas frequentes</h4>
              <div className="mt-2 space-y-2">
                {draft.faqs.map((faq, index) => (
                  <div
                    key={`${faq.question}-${index}`}
                    className="rounded-lg border border-border bg-card p-3"
                  >
                    <p className="text-sm font-medium">{faq.question || "Pergunta"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{faq.answer || "Resposta"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <aside>
          {draft.plans.length ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <h4 className="font-bold">Planos</h4>
              <div className="mt-3 space-y-3">
                {draft.plans.map((plan, index) => (
                  <div
                    key={`${plan.name}-${index}`}
                    className="rounded-lg border border-border p-3"
                  >
                    <p className="font-semibold">{plan.name || "Nome do plano"}</p>
                    <p className="mt-1 text-xl font-bold" style={{ color: draft.primaryColor }}>
                      {plan.price || "Preço"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {plan.description || "Descrição"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              Seus planos aparecerão aqui, se cadastrados.
            </p>
          )}
        </aside>
      </div>
      <div className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
        Prévia não publicada · /softwares/{draft.slug || "seu-software"}
      </div>
    </div>
  );
}

function DigitalPreview({ draft, imageFile }: { draft: Draft; imageFile: File | null }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (imageFile) {
      const local = URL.createObjectURL(imageFile);
      setImageUrl(local);
      return () => URL.revokeObjectURL(local);
    }
    setImageUrl(resolveDigitalProductAsset(draft.mainImagePath));
    return;
  }, [imageFile, draft.mainImagePath]);
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative aspect-[16/10] bg-muted">
        {imageUrl ? (
          <img src={imageUrl} alt="Prévia do software" className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center">
            <Rocket className="size-10 text-muted-foreground" />
          </div>
        )}
        {draft.isFeatured ? <Badge className="absolute left-3 top-3">⭐ Destaque</Badge> : null}
      </div>
      <div className="p-4">
        <h4 className="font-bold">{draft.name || "Nome do software"}</h4>
        <p className="mt-2 min-h-10 text-sm text-muted-foreground">
          {draft.shortDescription || "A descrição curta aparece aqui."}
        </p>
        <span
          className="mt-4 inline-flex rounded-lg px-3 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: draft.primaryColor }}
        >
          {draft.ctaLabel || "Conhecer software"}
        </span>
      </div>
    </article>
  );
}

function PlanEditor({
  plans,
  onChange,
}: {
  plans: PlanDraft[];
  onChange: (plans: PlanDraft[]) => void;
}) {
  function update(index: number, key: keyof PlanDraft, value: string | string[]) {
    onChange(plans.map((plan, i) => (i === index ? { ...plan, [key]: value } : plan)));
  }
  return (
    <section className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Planos</h4>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([...plans, { name: "", price: "", description: "", features: [], url: "" }])
          }
        >
          <Plus className="mr-1 size-4" />
          Adicionar
        </Button>
      </div>
      {plans.map((plan, index) => (
        <div key={index} className="space-y-2 rounded-lg bg-muted/40 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="Nome do plano"
              value={plan.name}
              onChange={(e) => update(index, "name", e.target.value)}
            />
            <Input
              placeholder="Preço (ex.: R$ 29/mês)"
              value={plan.price}
              onChange={(e) => update(index, "price", e.target.value)}
            />
          </div>
          <Input
            placeholder="Descrição do plano"
            value={plan.description}
            onChange={(e) => update(index, "description", e.target.value)}
          />
          <Textarea
            rows={2}
            placeholder="Recursos, um por linha"
            value={plan.features.join("\n")}
            onChange={(e) =>
              update(
                index,
                "features",
                e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean),
              )
            }
          />
          <Input
            type="url"
            placeholder="Link para contratar este plano (opcional)"
            value={plan.url}
            onChange={(e) => update(index, "url", e.target.value)}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => onChange(plans.filter((_, i) => i !== index))}
          >
            <Trash2 className="mr-1 size-4" />
            Remover plano
          </Button>
        </div>
      ))}
    </section>
  );
}
function FaqEditor({ faqs, onChange }: { faqs: FaqDraft[]; onChange: (faqs: FaqDraft[]) => void }) {
  return (
    <section className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Perguntas frequentes</h4>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...faqs, { question: "", answer: "" }])}
        >
          <Plus className="mr-1 size-4" />
          Adicionar
        </Button>
      </div>
      {faqs.map((faq, index) => (
        <div key={index} className="space-y-2 rounded-lg bg-muted/40 p-3">
          <Input
            placeholder="Pergunta"
            value={faq.question}
            onChange={(e) =>
              onChange(
                faqs.map((item, i) => (i === index ? { ...item, question: e.target.value } : item)),
              )
            }
          />
          <Textarea
            rows={3}
            placeholder="Resposta"
            value={faq.answer}
            onChange={(e) =>
              onChange(
                faqs.map((item, i) => (i === index ? { ...item, answer: e.target.value } : item)),
              )
            }
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => onChange(faqs.filter((_, i) => i !== index))}
          >
            <Trash2 className="mr-1 size-4" />
            Remover pergunta
          </Button>
        </div>
      ))}
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
