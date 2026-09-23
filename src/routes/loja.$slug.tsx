import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useLoaderData, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  Instagram,
  Minus,
  MessageCircle,
  Plus,
  PackageOpen,
  Share2,
  ShoppingBag,
  Store as StoreIcon,
  Trash2,
} from "lucide-react";
import {
  getStorefront,
  submitOrder,
  trackStoreEvent,
  uploadOrderReceipt,
  type StorefrontProduct,
} from "@/lib/storefront.functions";
import { useCart, buildOrderMessage, type CartItem } from "@/lib/cart";
import { brl, whatsappLink, installmentOptions, PIX_KEY_TYPES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EncomendaDialog } from "@/components/EncomendaDialog";

export const Route = createFileRoute("/loja/$slug")({
  loader: ({ params }) => getStorefront({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Loja não encontrada | Vitrini" }, { name: "robots", content: "noindex" }],
      };
    }
    const { store } = loaderData;
    const title = `${store.name} | Loja Online`;
    const description =
      store.description || `Veja os produtos de ${store.name} e peça pelo WhatsApp.`;
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
    ];
    return { meta };
  },
  errorComponent: () => (
    <EmptyState
      title="Não foi possível abrir esta loja"
      text="Tente novamente em alguns instantes."
    />
  ),
  notFoundComponent: () => (
    <EmptyState title="Loja não encontrada" text="Confira o link e tente novamente." />
  ),
  component: StorePage,
});

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
      <StoreIcon className="size-8 text-muted-foreground" />
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild variant="outline" className="mt-2">
        <Link to="/">Ir para o Vitrini</Link>
      </Button>
    </div>
  );
}

type Step = "cart" | "checkout";

function sportsBranchIds(
  nodes: { id: string; parent_id: string | null }[],
  rootId: string,
): string[] {
  const ids = [rootId];
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (node.parent_id && ids.includes(node.parent_id) && !ids.includes(node.id)) {
        ids.push(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function StorePage() {
  const data = useLoaderData({ strict: false }) as Awaited<ReturnType<typeof getStorefront>>;
  const params = useParams({ strict: false }) as { slug: string };
  const cart = useCart(params.slug);
  const track = useServerFn(trackStoreEvent);
  const sendOrder = useServerFn(submitOrder);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [activeSportsNode, setActiveSportsNode] = useState<string>("all");
  const [sportsTypeFilter, setSportsTypeFilter] = useState("all");
  const [sportsAudienceFilter, setSportsAudienceFilter] = useState("all");
  const [collectionFilter, setCollectionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<StorefrontProduct | null>(null);
  const [orderProduct, setOrderProduct] = useState<StorefrontProduct | null>(null);
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({});
  const [gallery, setGallery] = useState<StorefrontProduct | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [step, setStep] = useState<Step>("cart");
  const [paid, setPaid] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [customer, setCustomer] = useState({ name: "", whatsapp: "", note: "" });
  const [sending, setSending] = useState(false);
  const uploadReceipt = useServerFn(uploadOrderReceipt);
  const [receipt, setReceipt] = useState<{ name: string; path: string; url: string | null } | null>(
    null,
  );
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  function openGallery(product: StorefrontProduct, index = 0) {
    setGallery(product);
    setGalleryIndex(index);
  }

  useEffect(() => {
    if (!gallery || gallery.images.length < 2) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setGalleryIndex((current) => (current - 1 + gallery.images.length) % gallery.images.length);
      } else if (event.key === "ArrowRight") {
        setGalleryIndex((current) => (current + 1) % gallery.images.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [gallery]);

  const products = useMemo(() => {
    if (!data) return [];
    const moduleProducts =
      moduleFilter === "all"
        ? data.products
        : data.products.filter((product) => product.module === moduleFilter);
    const filtered =
      activeCategory === "all"
        ? moduleProducts
        : activeCategory === "featured"
          ? moduleProducts.filter((p) => p.is_featured)
          : activeCategory === "new-releases"
            ? moduleProducts.filter((p) => p.sportsIsNewRelease)
            : activeCategory === "offers"
              ? moduleProducts.filter((p) => p.sportsOfferActive)
              : activeCategory === "retro"
                ? moduleProducts.filter((p) => p.sportsIsRetro)
                : moduleProducts.filter((p) => p.category_id === activeCategory);
    const sportsFiltered =
      activeSportsNode === "all"
        ? filtered
        : filtered.filter((p) =>
            sportsBranchIds(data.sports.nodes, activeSportsNode).some((id) =>
              p.sportsNodeIds.includes(id),
            ),
          );
    const metadataFiltered = sportsFiltered.filter(
      (product) =>
        (sportsTypeFilter === "all" || product.sportsProductType === sportsTypeFilter) &&
        (sportsAudienceFilter === "all" || product.sportsAudience === sportsAudienceFilter) &&
        (collectionFilter === "all" || product.sportsCollectionNames.includes(collectionFilter)),
    );
    const term = search.trim().toLocaleLowerCase("pt-BR");
    const searched = term
      ? metadataFiltered.filter((product) => {
          const nodeNames = data.sports.nodes
            .filter((node) => product.sportsNodeIds.includes(node.id))
            .map((node) => node.name)
            .join(" ");
          return `${product.name} ${product.description} ${nodeNames} ${product.sportsProductType ?? ""} ${product.sportsCollectionNames.join(" ")}`
            .toLocaleLowerCase("pt-BR")
            .includes(term);
        })
      : metadataFiltered;
    return [...searched].sort((a, b) => {
      const stockA = a.track_stock ? stockOfProduct(a) : Number.POSITIVE_INFINITY;
      const stockB = b.track_stock ? stockOfProduct(b) : Number.POSITIVE_INFINITY;
      const availableA = a.is_available && (a.orderEnabled || stockA > 0);
      const availableB = b.is_available && (b.orderEnabled || stockB > 0);
      if (availableA !== availableB) return availableA ? -1 : 1;
      if (stockA !== stockB) return stockB - stockA;
      return a.name.localeCompare(b.name, "pt-BR");
    });
  }, [
    data,
    activeCategory,
    moduleFilter,
    activeSportsNode,
    sportsTypeFilter,
    sportsAudienceFilter,
    collectionFilter,
    search,
  ]);

  const availableSportsNodes = useMemo(() => {
    if (!data) return [];
    return data.sports.nodes.filter((node) =>
      data.products.some((product) =>
        sportsBranchIds(data.sports.nodes, node.id).some((id) =>
          product.sportsNodeIds.includes(id),
        ),
      ),
    );
  }, [data]);
  const availableSportsTypes = useMemo(
    () =>
      Array.from(
        new Set((data?.products ?? []).map((product) => product.sportsProductType).filter(Boolean)),
      ) as string[],
    [data],
  );
  const availableSportsAudiences = useMemo(
    () =>
      Array.from(
        new Set((data?.products ?? []).map((product) => product.sportsAudience).filter(Boolean)),
      ) as string[],
    [data],
  );
  const availableCollections = useMemo(
    () =>
      (data?.sports.collections ?? []).filter((collection) =>
        (data?.products ?? []).some((product) =>
          product.sportsCollectionNames.includes(collection.name),
        ),
      ),
    [data],
  );

  function stockOfProduct(product: StorefrontProduct) {
    if (!product.track_stock) return Number.POSITIVE_INFINITY;
    if (product.has_variants)
      return product.variants.reduce((sum, variant) => sum + Math.max(variant.stock, 0), 0);
    return Math.max(product.stock, 0);
  }

  const plans = useMemo(() => {
    if (!data?.store.allow_installments) return [];
    return installmentOptions(
      cart.total,
      data.store.max_installments,
      data.store.min_installment_amount,
    );
  }, [data, cart.total]);

  if (!data) {
    return (
      <EmptyState
        title="Esta loja não está disponível no momento."
        text="O link pode estar incorreto ou a loja foi desativada."
      />
    );
  }

  const { store } = data;

  function stockOf(product: StorefrontProduct) {
    if (!product.track_stock) return Infinity;
    if (product.has_variants)
      return product.variants.reduce((sum, v) => sum + Math.max(v.stock, 0), 0);
    return product.stock;
  }

  function statusOf(product: StorefrontProduct) {
    if (!product.is_available) return "unavailable" as const;
    const stock = stockOf(product);
    if (stock <= 0)
      return product.orderEnabled ? ("sold_out_with_order" as const) : ("sold_out" as const);
    if (stock === 1) return "last" as const;
    return "ok" as const;
  }

  function addSimple(product: StorefrontProduct, quantity = 1) {
    cart.add(
      {
        key: product.id,
        productId: product.id,
        name: product.name,
        description: product.description,
        unitPrice: product.price,
        imageUrl: product.image,
        maxQuantity: product.track_stock ? product.stock : null,
      },
      quantity,
    );
    setProductQuantities((current) => ({ ...current, [product.id]: 1 }));
    void track({ data: { storeId: store.id, type: "add_to_cart", productId: product.id } });
    toast.success(`${product.name} adicionado!`);
  }

  async function handleReceiptChange(file: File | null) {
    if (!file) return;
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
    type Allowed = (typeof allowed)[number];
    if (!allowed.includes(file.type as Allowed)) {
      toast.error("Envie o comprovante em PDF, JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("O comprovante deve ter no máximo 8 MB.");
      return;
    }
    setUploadingReceipt(true);
    try {
      const buffer = await file.arrayBuffer();
      let binary = "";
      const view = new Uint8Array(buffer);
      for (let i = 0; i < view.length; i += 8192) {
        binary += String.fromCharCode(...view.subarray(i, i + 8192));
      }
      const result = await uploadReceipt({
        data: {
          storeId: store.id,
          contentType: file.type as Allowed,
          base64: btoa(binary),
        },
      });
      setReceipt({ name: file.name, path: result.path, url: result.url });
      toast.success("Comprovante anexado!");
    } catch {
      toast.error("Não foi possível anexar o comprovante. Tente novamente.");
    }
    setUploadingReceipt(false);
  }

  async function handleSend() {
    if (!cart.items.length) return;
    setSending(true);
    const count = plans.some((p) => p.count === installments) ? installments : 1;
    const message = buildOrderMessage({
      sellerName: store.seller_name || store.name,
      items: cart.items,
      total: cart.total,
      paid: count > 1 ? false : paid,
      customerName: customer.name,
      note: customer.note,
      installments: count,
      receiptUrl: receipt?.url ?? null,
    });
    try {
      await sendOrder({
        data: {
          storeId: store.id,
          customerName: customer.name,
          customerWhatsapp: customer.whatsapp,
          note: customer.note,
          paymentDeclared: count > 1 ? false : paid,
          paymentMethod: count > 1 ? "parcelado" : "pix_avista",
          installments: count,
          receiptPath: receipt?.path ?? null,
          items: cart.items.map((i) => ({
            productId: i.productId,
            variantId: i.variantId ?? null,
            variantLabel: i.variantLabel ?? null,
            quantity: i.quantity,
          })),
        },
      });
    } catch {
      // The WhatsApp message is the core flow, so it should open even if the
      // order could not be recorded.
      toast.warning("Registramos seu pedido apenas no WhatsApp.");
    }
    setSending(false);
    window.open(whatsappLink(store.whatsapp, message), "_blank", "noopener");
    cart.clear();
    setCartOpen(false);
    setStep("cart");
    setPaid(false);
    setReceipt(null);
    setInstallments(1);
    toast.success("Pedido enviado para o WhatsApp da loja!");
  }

  const pixTypeLabel =
    PIX_KEY_TYPES.find((t) => t.value === store.pix_key_type)?.label ?? "Chave Pix";

  return (
    <div
      className="vitrini-storefront min-h-screen pb-28"
      style={{
        ["--brand" as string]: store.primary_color,
        ["--store-secondary" as string]: store.secondary_color,
        ["--store-accent" as string]: store.accent_color,
        ["--store-button" as string]: store.button_color,
        ["--store-text-secondary" as string]: store.theme_palette["text_secondary"] ?? "#64748b",
        ["--store-header" as string]: store.theme_palette["header"] ?? store.primary_color,
        ["--store-menu" as string]: store.theme_palette["menu"] ?? "#ffffff",
        ["--store-links" as string]: store.theme_palette["links"] ?? store.secondary_color,
        ["--store-prices" as string]: store.theme_palette["prices"] ?? store.primary_color,
        ["--store-offers" as string]: store.theme_palette["offers"] ?? "#dc2626",
        ["--store-badges" as string]: store.theme_palette["badges"] ?? store.accent_color,
        ["--store-cards" as string]: store.theme_palette["cards"] ?? "#ffffff",
        ["--store-borders" as string]: store.theme_palette["borders"] ?? "#e2e8f0",
        ["--store-footer" as string]: store.theme_palette["footer"] ?? store.primary_color,
        ["--store-filters" as string]: store.theme_palette["filters"] ?? "#f1f5f9",
        ["--sports-primary" as string]: store.primary_color,
        ["--sports-secondary" as string]: store.secondary_color,
        backgroundColor: store.background_color,
        color: store.text_color,
      }}
    >
      <header className="relative">
        <div
          className="h-36 w-full sm:h-52"
          style={{
            background:
              data.sports.settings?.banner_url || store.banner
                ? `center/cover url(${data.sports.settings?.banner_url || store.banner})`
                : "linear-gradient(120deg, #ffffff 0%, #f8fafc 52%, #e2e8f0 150%)",
          }}
        >
          {store.promo_banner ? (
            <div
              className="mx-auto flex h-full max-w-3xl items-center px-6 drop-shadow-lg"
              style={{ color: store.theme_palette.header ?? store.primary_color }}
            >
              <div>
                <p className="text-2xl font-black uppercase sm:text-4xl">
                  {store.promo_banner.title}
                </p>
                <p
                  className="mt-1 text-sm sm:text-base"
                  style={{ color: store.theme_palette.text_secondary ?? store.secondary_color }}
                >
                  {store.promo_banner.subtitle}
                </p>
                <a
                  href={store.promo_banner.cta_href || "#produtos"}
                  className="mt-3 inline-flex rounded-full px-4 py-2 text-xs font-bold"
                  style={{ backgroundColor: store.button_color }}
                >
                  {store.promo_banner.cta_label}
                </a>
              </div>
            </div>
          ) : null}
        </div>
        <div className="mx-auto max-w-3xl px-4">
          <div className="surface vitrini-glow -mt-12 flex items-start gap-4 p-4 sm:p-5">
            <div
              className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-2xl font-bold text-white sm:size-20"
              style={{
                backgroundColor: store.primary_color,
              }}
            >
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="size-full object-cover" />
              ) : (
                store.name.charAt(0)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em]"
                style={{ color: store.accent_color }}
              >
                VITRINI • LOJA ONLINE
              </p>
              <h1 className="truncate text-xl font-bold sm:text-2xl">{store.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{store.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <a
                  href={whatsappLink(store.whatsapp, `Olá, ${store.seller_name || store.name}!`)}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: store.button_color }}
                >
                  <MessageCircle className="size-3.5" /> WhatsApp
                </a>
                {store.instagram ? (
                  <a
                    href={`https://instagram.com/${store.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
                    style={{ borderColor: store.accent_color, color: store.secondary_color }}
                  >
                    <Instagram className="size-3.5" /> Instagram
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          {store.welcome_message ? (
            <p
              className="mt-3 text-center text-sm"
              style={{ color: store.theme_palette.text_secondary ?? store.secondary_color }}
            >
              {store.welcome_message}
            </p>
          ) : null}
        </div>
      </header>

      <div className="mx-auto mt-4 max-w-3xl px-4">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar produto, clube, esporte ou tipo..."
          aria-label="Buscar na loja"
        />
      </div>
      {data.sports.collections.length ? (
        <section className="mx-auto mt-4 max-w-3xl px-4">
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
            {data.sports.collections
              .filter((collection) => collection.is_featured)
              .map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  className="surface min-w-48 overflow-hidden text-left"
                  onClick={() => setSearch(collection.name)}
                >
                  {collection.image_url ? (
                    <img src={collection.image_url} alt="" className="h-20 w-full object-cover" />
                  ) : null}
                  <span className="block px-3 py-2 text-sm font-semibold">
                    🏷️ {collection.name}
                  </span>
                </button>
              ))}
          </div>
        </section>
      ) : null}

      <main className="mx-auto mt-5 max-w-3xl space-y-5 px-4">
        {data.products.some((product) => product.is_featured) ? (
          <StorefrontShelf
            title="⭐ Destaques"
            products={data.products.filter((product) => product.is_featured).slice(0, 6)}
            onSelect={setSelected}
          />
        ) : null}
        {data.products.some((product) => product.sportsIsNewRelease) ? (
          <StorefrontShelf
            title="🆕 Novidades"
            products={data.products.filter((product) => product.sportsIsNewRelease).slice(0, 6)}
            onSelect={setSelected}
          />
        ) : null}
        {data.products.some((product) => product.sportsOfferActive) ? (
          <StorefrontShelf
            title="🔥 Ofertas"
            products={data.products.filter((product) => product.sportsOfferActive).slice(0, 6)}
            onSelect={setSelected}
          />
        ) : null}
        {data.categories.length ? (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold">📂 Categorias</h2>
              <span className="text-xs text-muted-foreground">
                {data.categories.length} disponíveis
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {data.categories.slice(0, 12).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className="surface shrink-0 rounded-xl px-3 py-2 text-xs font-semibold transition"
                  style={{ borderColor: store.theme_palette.borders ?? "#e2e8f0" }}
                  onClick={() => {
                    setActiveCategory(category.id);
                    setModuleFilter(category.module ?? "all");
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <div
        className="sticky top-0 z-20 mt-4 border-y py-2 backdrop-blur"
        style={{
          backgroundColor: `${store.theme_palette.header ?? store.primary_color}eF`,
          borderColor: store.theme_palette.borders ?? "#e2e8f0",
        }}
      >
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto px-4 [scrollbar-width:none]">
          {(["roupas", "roupas_esportivas", "roupas_treino", "calcados"] as const).map((module) => {
            const labels = {
              roupas: "👕 Roupas",
              roupas_esportivas: "⚽ Roupas Esportivas",
              roupas_treino: "🏋️ Roupas de Treino / Academia",
              calcados: "👟 Calçados",
            };
            return data.products.some((product) => product.module === module) ? (
              <CategoryChip
                key={module}
                label={labels[module]}
                active={moduleFilter === module}
                onClick={() => {
                  setModuleFilter(module);
                  setActiveCategory("all");
                  setActiveSportsNode("all");
                }}
                color={data.sports.settings?.primary_color ?? store.primary_color}
              />
            ) : null;
          })}
          {moduleFilter !== "all" ? (
            <CategoryChip
              label="Todos os módulos"
              active={false}
              onClick={() => setModuleFilter("all")}
              color={store.primary_color}
            />
          ) : null}
          {data.sports.nodes.length &&
          (moduleFilter === "all" || moduleFilter === "roupas_esportivas") ? (
            <>
              <CategoryChip
                label={data.sports.settings?.name ?? "Esportes"}
                active={activeSportsNode === "all"}
                onClick={() => setActiveSportsNode("all")}
                color={data.sports.settings?.secondary_color ?? store.primary_color}
              />
              {data.sports.nodes
                .filter((node) => !node.parent_id)
                .map((node) => (
                  <CategoryChip
                    key={node.id}
                    label={node.name}
                    active={activeSportsNode === node.id}
                    onClick={() => setActiveSportsNode(node.id)}
                    color={
                      node.primary_color ??
                      data.sports.settings?.secondary_color ??
                      store.primary_color
                    }
                  />
                ))}
              {availableSportsNodes
                .filter((node) => node.parent_id)
                .map((node) => (
                  <CategoryChip
                    key={node.id}
                    label={node.name}
                    active={activeSportsNode === node.id}
                    onClick={() => setActiveSportsNode(node.id)}
                    color={
                      node.primary_color ??
                      data.sports.settings?.secondary_color ??
                      store.primary_color
                    }
                  />
                ))}
            </>
          ) : null}
          <CategoryChip
            label="Todos"
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            color={data.sports.settings?.primary_color ?? store.primary_color}
          />
          {data.products.some((p) => p.is_featured) ? (
            <CategoryChip
              label="Destaques"
              active={activeCategory === "featured"}
              onClick={() => setActiveCategory("featured")}
              color={data.sports.settings?.primary_color ?? store.primary_color}
            />
          ) : null}
          {data.products.some((p) => p.sportsIsNewRelease) ? (
            <CategoryChip
              label="🆕 Lançamentos"
              active={activeCategory === "new-releases"}
              onClick={() => setActiveCategory("new-releases")}
              color={store.primary_color}
            />
          ) : null}
          {data.products.some((p) => p.sportsOfferActive) ? (
            <CategoryChip
              label="🔥 Ofertas"
              active={activeCategory === "offers"}
              onClick={() => setActiveCategory("offers")}
              color={store.primary_color}
            />
          ) : null}
          {data.products.some((p) => p.sportsIsRetro) ? (
            <CategoryChip
              label="🕰️ Retrô"
              active={activeCategory === "retro"}
              onClick={() => setActiveCategory("retro")}
              color={store.primary_color}
            />
          ) : null}
          {availableSportsTypes.map((type) => (
            <CategoryChip
              key={`type-${type}`}
              label={type}
              active={sportsTypeFilter === type}
              onClick={() => setSportsTypeFilter(type)}
              color={data.sports.settings?.primary_color ?? store.primary_color}
            />
          ))}
          {availableSportsTypes.length ? (
            <CategoryChip
              label="Todos os tipos"
              active={sportsTypeFilter === "all"}
              onClick={() => setSportsTypeFilter("all")}
              color={data.sports.settings?.primary_color ?? store.primary_color}
            />
          ) : null}
          {availableSportsAudiences.map((audience) => (
            <CategoryChip
              key={`audience-${audience}`}
              label={audience}
              active={sportsAudienceFilter === audience}
              onClick={() => setSportsAudienceFilter(audience)}
              color={data.sports.settings?.secondary_color ?? store.primary_color}
            />
          ))}
          {availableSportsAudiences.length ? (
            <CategoryChip
              label="Todos os públicos"
              active={sportsAudienceFilter === "all"}
              onClick={() => setSportsAudienceFilter("all")}
              color={data.sports.settings?.secondary_color ?? store.primary_color}
            />
          ) : null}
          {availableCollections.map((collection) => (
            <CategoryChip
              key={`collection-${collection.id}`}
              label={collection.name}
              active={collectionFilter === collection.name}
              onClick={() => setCollectionFilter(collection.name)}
              color={data.sports.settings?.secondary_color ?? store.primary_color}
            />
          ))}
          {availableCollections.length ? (
            <CategoryChip
              label="Todas as coleções"
              active={collectionFilter === "all"}
              onClick={() => setCollectionFilter("all")}
              color={data.sports.settings?.secondary_color ?? store.primary_color}
            />
          ) : null}
          {data.categories
            .filter(
              (category) =>
                moduleFilter === "all" || !category.module || category.module === moduleFilter,
            )
            .map((c) => (
              <CategoryChip
                key={c.id}
                label={c.name}
                active={activeCategory === c.id}
                onClick={() => setActiveCategory(c.id)}
                color={store.primary_color}
              />
            ))}
        </div>
      </div>

      <main className="mx-auto mt-5 max-w-3xl px-4">
        {selected ? (
          <ProductDetail
            product={selected}
            categoryName={
              data.categories.find((category) => category.id === selected.category_id)?.name ?? ""
            }
            color={data.sports.settings?.primary_color ?? store.primary_color}
            onBack={() => setSelected(null)}
            onOrder={() => setOrderProduct(selected)}
            onOpenGallery={openGallery}
            onAdd={(item, quantity) => {
              cart.add(item, quantity);
              void track({
                data: { storeId: store.id, type: "add_to_cart", productId: item.productId },
              });
              toast.success("Adicionado ao carrinho!");
              setSelected(null);
            }}
          />
        ) : products.length === 0 ? (
          <div className="surface p-8 text-center text-sm text-muted-foreground">
            Nenhum produto por aqui ainda.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => {
              const status = statusOf(product);
              return (
                <article
                  key={product.id}
                  className="surface group flex gap-3 p-3 transition hover:-translate-y-0.5 hover:border-[var(--store-accent)]/50 sm:p-4"
                >
                  <button
                    type="button"
                    aria-label={`Ver fotos de ${product.name}`}
                    className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:size-28"
                    onClick={() => setSelected(product)}
                  >
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="size-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground">
                        <ShoppingBag className="size-6" />
                      </div>
                    )}
                    {product.images.length > 1 ? (
                      <span className="absolute bottom-1 right-1 rounded bg-background/90 px-1 text-[10px] font-semibold">
                        {product.images.length} fotos
                      </span>
                    ) : null}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h2 className="font-semibold">{product.name}</h2>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {product.description}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      {product.sportsOfferActive && product.sportsOfferPrice !== null ? (
                        <>
                          <span className="text-xs text-muted-foreground line-through">
                            {brl(product.sportsOriginalPrice ?? product.price)}
                          </span>
                          <span
                            className="text-base font-bold"
                            style={{ color: store.theme_palette.prices ?? store.primary_color }}
                          >
                            {brl(product.sportsOfferPrice)}
                          </span>
                          {product.sportsOfferPercent ? (
                            <Badge variant="secondary">{product.sportsOfferPercent}% OFF</Badge>
                          ) : null}
                        </>
                      ) : (
                        <span
                          className="text-base font-bold"
                          style={{ color: store.theme_palette.prices ?? store.primary_color }}
                        >
                          {brl(product.price)}
                        </span>
                      )}
                      {product.sportsIsNewRelease ? (
                        <Badge variant="secondary">🆕 Lançamento</Badge>
                      ) : null}
                      {status === "last" ? <Badge variant="secondary">Última unidade</Badge> : null}
                      {status === "ok" && product.track_stock ? (
                        <Badge variant="secondary">{stockOf(product)} unidades disponíveis</Badge>
                      ) : null}
                      {status === "sold_out_with_order" ? (
                        <Badge variant="secondary">📦 Disponível para encomenda</Badge>
                      ) : null}
                      {status === "sold_out" || status === "unavailable" ? (
                        <Badge variant="outline">Esgotado</Badge>
                      ) : null}
                    </div>

                    <div className="mt-auto pt-2">
                      {product.has_variants ? (
                        <div className="space-y-2">
                          <Button
                            size="sm"
                            className="w-full"
                            style={{ backgroundColor: store.primary_color }}
                            disabled={
                              status === "sold_out" ||
                              status === "sold_out_with_order" ||
                              status === "unavailable"
                            }
                            onClick={() => setSelected(product)}
                          >
                            Escolher opções
                          </Button>
                          {product.orderEnabled ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => setOrderProduct(product)}
                            >
                              <PackageOpen className="mr-1 size-4" /> Encomendar
                            </Button>
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <label className="sr-only" htmlFor={`quantity-${product.id}`}>
                            Quantidade de {product.name}
                          </label>
                          <select
                            id={`quantity-${product.id}`}
                            aria-label={`Quantidade de ${product.name}`}
                            value={productQuantities[product.id] ?? 1}
                            onChange={(event) =>
                              setProductQuantities((current) => ({
                                ...current,
                                [product.id]: Number(event.target.value),
                              }))
                            }
                            className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm font-medium"
                            disabled={
                              status === "sold_out" ||
                              status === "sold_out_with_order" ||
                              status === "unavailable"
                            }
                          >
                            {Array.from(
                              { length: product.track_stock ? Math.min(stockOf(product), 20) : 20 },
                              (_, index) => index + 1,
                            ).map((quantity) => (
                              <option key={quantity} value={quantity}>
                                {quantity}x
                              </option>
                            ))}
                          </select>
                          <Button
                            size="sm"
                            className="min-w-0 flex-1"
                            style={{ backgroundColor: store.primary_color }}
                            disabled={
                              status === "sold_out" ||
                              status === "sold_out_with_order" ||
                              status === "unavailable"
                            }
                            onClick={() => addSimple(product, productQuantities[product.id] ?? 1)}
                          >
                            Comprar
                          </Button>
                          {product.orderEnabled ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-w-0 flex-1"
                              onClick={() => setOrderProduct(product)}
                            >
                              <PackageOpen className="mr-1 size-4" /> Encomendar
                            </Button>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-2 rounded-2xl border border-border bg-card/60 p-3 text-center shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">
            Quer ter uma lojinha online como esta?
          </p>
          <div className="flex w-full gap-2">
            <Button
              asChild
              variant="secondary"
              size="sm"
              className="h-8 flex-1 gap-1.5 rounded-full text-xs"
            >
              <a
                href="https://vitrini-br.lovable.app"
                target="_blank"
                rel="noopener"
                aria-label="Conheça o Vitrini"
              >
                <ExternalLink className="size-3.5" /> Conheça o Vitrini
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 gap-1.5 rounded-full text-xs"
              onClick={async () => {
                const url = "https://vitrini-br.lovable.app";
                const text =
                  "Conhece alguém que tem lojinha ou vende algo e ainda não está automatizada? Indique o Vitrini:";
                try {
                  if (navigator.share) {
                    await navigator.share({ title: "Vitrini", text, url });
                  } else {
                    await navigator.clipboard.writeText(`${text} ${url}`);
                    toast.success("Link copiado! Cole no WhatsApp ou rede social.");
                  }
                } catch {
                  // Usuário cancelou ou share falhou silenciosamente.
                }
              }}
            >
              <Share2 className="size-3.5" /> Compartilhar
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Pagamento realizado diretamente para o vendedor via Pix.
        </p>
      </main>

      {cart.count > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="flex-1 text-sm">
              <p className="text-muted-foreground">
                {cart.count} {cart.count === 1 ? "item" : "itens"}
              </p>
              <p className="text-lg font-bold">{brl(cart.total)}</p>
            </div>
            <Button
              size="lg"
              className="h-12 flex-1"
              style={{ backgroundColor: store.primary_color }}
              onClick={() => {
                setCartOpen(true);
                void track({ data: { storeId: store.id, type: "checkout_started" } });
              }}
            >
              Ver carrinho
            </Button>
          </div>
        </div>
      ) : null}

      <EncomendaDialog product={orderProduct} onClose={() => setOrderProduct(null)} />
      <Dialog
        open={Boolean(gallery)}
        onOpenChange={(open) => {
          if (!open) {
            setGallery(null);
            setGalleryIndex(0);
          }
        }}
      >
        <DialogContent className="max-h-[94dvh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{gallery?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {gallery ? (
              <>
                <div className="relative flex min-h-[45dvh] items-center justify-center overflow-hidden rounded-xl bg-black/90 p-2 sm:min-h-[60dvh]">
                  <img
                    src={gallery.images[galleryIndex]}
                    alt={`${gallery.name} — foto ${galleryIndex + 1}`}
                    className="max-h-[58dvh] max-w-full object-contain"
                  />
                  {gallery.images.length > 1 ? (
                    <>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute left-3 top-1/2 size-10 -translate-y-1/2 rounded-full shadow-lg"
                        aria-label="Foto anterior"
                        onClick={() =>
                          setGalleryIndex(
                            (current) =>
                              (current - 1 + gallery.images.length) % gallery.images.length,
                          )
                        }
                      >
                        <ChevronLeft className="size-5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute right-3 top-1/2 size-10 -translate-y-1/2 rounded-full shadow-lg"
                        aria-label="Próxima foto"
                        onClick={() =>
                          setGalleryIndex((current) => (current + 1) % gallery.images.length)
                        }
                      >
                        <ChevronRight className="size-5" />
                      </Button>
                      <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                        {galleryIndex + 1} / {gallery.images.length}
                      </span>
                    </>
                  ) : null}
                </div>
                {gallery.images.length > 1 ? (
                  <div
                    className="flex gap-2 overflow-x-auto pb-1"
                    aria-label="Miniaturas das fotos"
                  >
                    {gallery.images.map((url, index) => (
                      <button
                        key={url}
                        type="button"
                        aria-label={`Abrir foto ${index + 1}`}
                        aria-current={galleryIndex === index}
                        onClick={() => setGalleryIndex(index)}
                        className={cn(
                          "size-20 shrink-0 overflow-hidden rounded-lg border-2 transition sm:size-24",
                          galleryIndex === index
                            ? "border-[var(--store-accent)]"
                            : "border-transparent opacity-70 hover:opacity-100",
                        )}
                      >
                        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
            {gallery?.description ? (
              <p className="text-sm text-muted-foreground">{gallery.description}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <Sheet
        open={cartOpen}
        onOpenChange={(open) => {
          setCartOpen(open);
          if (!open) setStep("cart");
        }}
      >
        <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{step === "cart" ? "Seu carrinho" : "Confira seu pedido"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-3 px-4">
            {cart.items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Seu carrinho está vazio.
              </p>
            ) : (
              cart.items.map((item) => (
                <div key={item.key} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    {item.variantLabel ? (
                      <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                    ) : null}
                    <p className="text-xs text-muted-foreground">
                      {brl(item.unitPrice)} · subtotal {brl(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                  {step === "cart" ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8"
                        aria-label="Diminuir"
                        onClick={() => cart.setQuantity(item.key, item.quantity - 1)}
                      >
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="size-8"
                        aria-label="Aumentar"
                        disabled={item.maxQuantity != null && item.quantity >= item.maxQuantity}
                        onClick={() => cart.setQuantity(item.key, item.quantity + 1)}
                      >
                        <Plus className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive"
                        aria-label="Remover"
                        onClick={() => cart.remove(item.key)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm font-semibold">
                      {item.quantity}x {brl(item.unitPrice * item.quantity)}
                    </span>
                  )}
                </div>
              ))
            )}

            {cart.items.length > 0 ? (
              <div className="flex items-center justify-between border-t pt-3">
                <span className="text-sm text-muted-foreground">TOTAL</span>
                <span className="text-xl font-bold">{brl(cart.total)}</span>
              </div>
            ) : null}

            {step === "checkout" && cart.items.length > 0 ? (
              <div className="space-y-4 pt-2">
                {plans.length > 0 ? (
                  <div className="rounded-xl border bg-card p-4">
                    <p className="text-sm font-semibold">Como você quer pagar?</p>
                    <div className="mt-3 space-y-2">
                      <button
                        type="button"
                        onClick={() => setInstallments(1)}
                        className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                          installments === 1 ? "border-foreground" : "border-border"
                        }`}
                      >
                        <span className="font-medium">Pix à vista</span>
                        <span className="block text-xs text-muted-foreground">
                          {brl(cart.total)}
                        </span>
                      </button>
                      {plans.map((plan) => (
                        <button
                          key={plan.count}
                          type="button"
                          onClick={() => setInstallments(plan.count)}
                          className={`w-full rounded-lg border p-3 text-left text-sm transition ${
                            installments === plan.count ? "border-foreground" : "border-border"
                          }`}
                        >
                          <span className="font-medium">{plan.label}</span>
                          <span className="block text-xs text-muted-foreground">
                            Total {brl(cart.total)} · sem juros
                          </span>
                        </button>
                      ))}
                    </div>
                    {installments > 1 ? (
                      <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                        Parcelamento combinado diretamente com o vendedor. Não é parcelamento
                        bancário nem cartão de crédito: você paga cada parcela por Pix nas datas
                        combinadas e recebe lembretes pelo WhatsApp.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold">
                    {installments > 1 ? "Pix das parcelas" : "Pagamento via Pix"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{pixTypeLabel} do vendedor</p>
                  <p className="mt-1 font-mono text-sm break-all">
                    {store.pix_key || "Chave Pix não cadastrada"}
                  </p>
                  <Button
                    variant="outline"
                    className="mt-3 h-11 w-full"
                    disabled={!store.pix_key}
                    onClick={async () => {
                      await navigator.clipboard.writeText(store.pix_key);
                      toast.success("Chave Pix copiada!");
                    }}
                  >
                    <Copy className="mr-2 size-4" /> Copiar chave Pix
                  </Button>
                  {installments === 1 ? (
                    <label className="mt-3 flex items-start gap-2 text-sm">
                      <Checkbox
                        checked={paid}
                        onCheckedChange={(value) => setPaid(value === true)}
                        className="mt-0.5"
                      />
                      <span>Já fiz o pagamento</span>
                    </label>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">
                      A primeira parcela vence hoje e as demais a cada 30 dias.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    O pagamento é feito diretamente para o vendedor. O Vitrini não recebe nem guarda
                    esse valor.
                  </p>

                  <div className="mt-4 border-t pt-3">
                    <p className="text-sm font-semibold">Comprovante de pagamento</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {paid
                        ? "Anexe o comprovante (PDF, JPG, PNG ou WEBP) para enviar o pedido."
                        : "Se já pagou, marque a opção acima e anexe o comprovante."}
                    </p>
                    <Label htmlFor="receipt" className="sr-only">
                      Anexar comprovante
                    </Label>
                    <Input
                      id="receipt"
                      type="file"
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      disabled={uploadingReceipt}
                      className="mt-2 h-11 py-2.5 file:mr-3 file:text-xs"
                      onChange={(e) => {
                        void handleReceiptChange(e.target.files?.[0] ?? null);
                      }}
                    />
                    {uploadingReceipt ? (
                      <p className="mt-2 text-xs text-muted-foreground">Enviando comprovante...</p>
                    ) : null}
                    {receipt ? (
                      <p className="mt-2 flex items-center gap-2 text-xs font-medium text-primary">
                        <Check className="size-4 shrink-0" />
                        <span className="truncate">{receipt.name}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cname">Seu nome (opcional)</Label>
                    <Input
                      id="cname"
                      value={customer.name}
                      onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cwhats">Seu WhatsApp (opcional)</Label>
                    <Input
                      id="cwhats"
                      inputMode="tel"
                      value={customer.whatsapp}
                      onChange={(e) => setCustomer((c) => ({ ...c, whatsapp: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cnote">Observação (opcional)</Label>
                    <Textarea
                      id="cnote"
                      rows={2}
                      value={customer.note}
                      onChange={(e) => setCustomer((c) => ({ ...c, note: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <SheetFooter className="gap-2">
            {cart.items.length > 0 ? (
              step === "cart" ? (
                <>
                  <Button
                    className="h-12"
                    style={{ backgroundColor: store.primary_color }}
                    onClick={() => setStep("checkout")}
                  >
                    Finalizar pedido
                  </Button>
                  <Button variant="ghost" onClick={() => setCartOpen(false)}>
                    Continuar comprando
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    className="h-12 bg-[var(--whatsapp)] text-[var(--whatsapp-foreground)] hover:bg-[var(--whatsapp)]/90"
                    disabled={sending || uploadingReceipt || (paid && !receipt)}
                    onClick={handleSend}
                  >
                    <MessageCircle className="mr-2 size-4" />
                    {sending
                      ? "Enviando..."
                      : paid && !receipt
                        ? "Anexe o comprovante"
                        : "Pedir pelo WhatsApp"}
                  </Button>
                  <Button variant="ghost" onClick={() => setStep("cart")}>
                    <ArrowLeft className="mr-2 size-4" /> Voltar ao carrinho
                  </Button>
                </>
              )
            ) : (
              <Button variant="outline" onClick={() => setCartOpen(false)}>
                Ver produtos
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition",
        active ? "border-transparent text-white" : "border-border bg-card text-foreground",
      )}
      style={active ? { backgroundColor: color } : undefined}
    >
      {label}
    </button>
  );
}

function StorefrontShelf({
  title,
  products,
  onSelect,
}: {
  title: string;
  products: StorefrontProduct[];
  onSelect: (product: StorefrontProduct) => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold">{title}</h2>
        <span className="text-xs text-muted-foreground">Ver todos</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            className="surface group w-36 shrink-0 overflow-hidden text-left transition hover:-translate-y-0.5 sm:w-40"
            onClick={() => onSelect(product)}
          >
            <div className="aspect-square bg-muted">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  className="size-full object-cover transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-muted-foreground">
                  <ShoppingBag className="size-6" />
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="truncate text-xs font-semibold">{product.name}</p>
              <p className="mt-1 text-sm font-bold">{brl(product.price)}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProductDetail({
  product,
  categoryName,
  color,
  onBack,
  onOrder,
  onOpenGallery,
  onAdd,
}: {
  product: StorefrontProduct;
  categoryName?: string;
  color: string;
  onBack: () => void;
  onOrder: () => void;
  onOpenGallery: (product: StorefrontProduct, index?: number) => void;
  onAdd: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const images = product.images.length ? product.images : product.image ? [product.image] : [];
  const label = product.options
    .map((option) => choices[option.name])
    .filter(Boolean)
    .join(" / ");
  const variant = product.variants.find((item) => item.label === label) ?? null;
  const complete = product.options.every((option) => choices[option.name]);
  const simpleProduct = product.options.length === 0;
  const outOfStock =
    !product.is_available ||
    (simpleProduct
      ? product.track_stock && product.stock <= 0
      : !complete || !variant || variant.stock <= 0 || !variant.is_available);
  const unitPrice =
    variant?.price ??
    (product.sportsOfferActive && product.sportsOfferPrice !== null
      ? product.sportsOfferPrice
      : product.price);
  const maxQuantity = simpleProduct && product.track_stock ? product.stock : (variant?.stock ?? 99);

  function addToCart() {
    if (outOfStock || (!simpleProduct && !variant)) return;
    onAdd(
      {
        key: simpleProduct ? product.id : `${product.id}:${variant!.id}`,
        productId: product.id,
        variantId: simpleProduct ? null : variant!.id,
        variantLabel: simpleProduct ? null : variant!.label,
        name: product.name,
        description: product.description,
        unitPrice,
        imageUrl: product.image,
        maxQuantity: product.track_stock || !simpleProduct ? maxQuantity : null,
      },
      quantity,
    );
  }

  return (
    <section className="space-y-5">
      <Button type="button" variant="ghost" className="-ml-3 gap-2" onClick={onBack}>
        <ArrowLeft className="size-4" /> Voltar para os produtos
      </Button>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <div className="space-y-3">
          <button
            type="button"
            className="group relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted text-left"
            onClick={() => images.length > 0 && onOpenGallery(product, 0)}
            aria-label={`Ampliar foto de ${product.name}`}
          >
            {images[0] ? (
              <img
                src={images[0]}
                alt={product.name}
                className="size-full object-cover transition duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <ShoppingBag className="size-12" />
              </div>
            )}
            {images.length > 1 ? (
              <span className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white">
                {images.length} fotos · ampliar
              </span>
            ) : null}
          </button>
          {images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Fotos do produto">
              {images.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => onOpenGallery(product, index)}
                  className="size-20 shrink-0 overflow-hidden rounded-lg border-2 border-transparent transition hover:border-[var(--store-accent)] sm:size-24"
                >
                  <img
                    src={url}
                    alt={`${product.name} — foto ${index + 1}`}
                    className="size-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-5 lg:pt-2">
          <div className="flex flex-wrap gap-2">
            {product.is_available && (!product.track_stock || product.stock > 0) ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Em estoque</Badge>
            ) : (
              <Badge variant="outline">Esgotado</Badge>
            )}
            {product.sportsIsNewRelease ? <Badge variant="secondary">🆕 Lançamento</Badge> : null}
            {product.sportsOfferActive ? <Badge variant="secondary">🔥 Oferta</Badge> : null}
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              {product.sportsOfferActive && product.sportsOfferPrice !== null ? (
                <>
                  <span className="text-2xl font-bold">{brl(product.sportsOfferPrice)}</span>
                  <span className="text-sm text-muted-foreground line-through">
                    {brl(product.sportsOriginalPrice ?? product.price)}
                  </span>
                </>
              ) : (
                <span className="text-2xl font-bold">{brl(unitPrice)}</span>
              )}
            </div>
          </div>
          {categoryName ? (
            <p className="text-sm">
              <strong>Categoria:</strong> {categoryName}
            </p>
          ) : null}
          {product.description ? (
            <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {product.description}
            </p>
          ) : null}

          {product.options.map((option) => (
            <div key={option.id} className="space-y-2">
              <p className="text-sm font-semibold">{option.name}</p>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setChoices((current) => ({ ...current, [option.name]: value }))}
                    className={cn(
                      "min-w-14 rounded-lg border px-4 py-2.5 text-sm font-medium transition",
                      choices[option.name] === value
                        ? "border-transparent text-white"
                        : "border-border bg-card hover:border-foreground",
                    )}
                    style={choices[option.name] === value ? { backgroundColor: color } : undefined}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between rounded-xl border p-3">
            <span className="text-sm font-semibold">Quantidade</span>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-9"
                disabled={quantity <= 1}
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-7 text-center font-semibold">{quantity}</span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-9"
                disabled={quantity >= maxQuantity}
                onClick={() => setQuantity((current) => Math.min(maxQuantity, current + 1))}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>
          <Button
            type="button"
            className="h-12 w-full text-sm uppercase tracking-wide"
            style={{ backgroundColor: color }}
            disabled={outOfStock}
            onClick={addToCart}
          >
            {simpleProduct || complete ? "Adicionar ao carrinho" : "Escolha as opções"}
          </Button>
          {product.orderEnabled ? (
            <Button type="button" variant="outline" className="h-11 w-full" onClick={onOrder}>
              <PackageOpen className="mr-2 size-4" /> Encomendar pelo WhatsApp
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function VariantDialog({
  product,
  color,
  onClose,
  onOpenGallery,
  onAdd,
}: {
  product: StorefrontProduct | null;
  color: string;
  onClose: () => void;
  onOpenGallery: (product: StorefrontProduct, index?: number) => void;
  onAdd: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
}) {
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const label = product
    ? product.options
        .map((o) => choices[o.name])
        .filter(Boolean)
        .join(" / ")
    : "";
  const variant = product?.variants.find((v) => v.label === label) ?? null;
  const complete = product ? product.options.every((o) => choices[o.name]) : false;
  const outOfStock = complete && (!variant || variant.stock <= 0 || !variant.is_available);

  return (
    <Dialog
      open={Boolean(product)}
      onOpenChange={(open) => {
        if (!open) {
          setChoices({});
          setQuantity(1);
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product?.name}</DialogTitle>
        </DialogHeader>
        {product ? (
          <div className="space-y-4">
            {product.images.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {product.images.map((url, index) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => onOpenGallery(product, index)}
                    aria-label={`Abrir foto ${index + 1} de ${product.name}`}
                    className="size-24 shrink-0 overflow-hidden rounded-lg border-2 border-transparent transition hover:border-[var(--store-accent)]"
                  >
                    <img
                      src={url}
                      alt={`${product.name} — foto ${index + 1}`}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
            {product.options.map((option) => (
              <div key={option.id}>
                <p className="mb-2 text-sm font-medium">{option.name}</p>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const active = choices[option.name] === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setChoices((c) => ({ ...c, [option.name]: value }))}
                        className={cn(
                          "min-w-12 rounded-lg border px-3 py-2 text-sm font-medium",
                          active ? "border-transparent text-white" : "border-border bg-card",
                        )}
                        style={active ? { backgroundColor: color } : undefined}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-lg font-bold">{brl(variant?.price ?? product.price)}</span>
              {complete ? (
                outOfStock ? (
                  <Badge variant="outline">Esgotado</Badge>
                ) : variant && variant.stock === 1 ? (
                  <Badge variant="secondary">Última unidade</Badge>
                ) : (
                  <Badge variant="secondary">
                    <Check className="mr-1 size-3" /> Disponível
                  </Badge>
                )
              ) : null}
            </div>
            {complete && !outOfStock ? (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Quantidade</span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-9"
                    aria-label="Diminuir quantidade"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold" aria-live="polite">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="size-9"
                    aria-label="Aumentar quantidade"
                    disabled={!variant || quantity >= variant.stock}
                    onClick={() =>
                      setQuantity((current) => Math.min(variant?.stock ?? current, current + 1))
                    }
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}
            <Button
              className="h-12 w-full"
              style={{ backgroundColor: color }}
              disabled={!complete || outOfStock}
              onClick={() => {
                if (!variant) return;
                onAdd(
                  {
                    key: `${product.id}:${variant.id}`,
                    productId: product.id,
                    variantId: variant.id,
                    variantLabel: variant.label,
                    name: product.name,
                    description: product.description,
                    unitPrice: variant.price ?? product.price,
                    imageUrl: product.image,
                    maxQuantity: variant.stock,
                  },
                  quantity,
                );
                setChoices({});
                setQuantity(1);
              }}
            >
              {complete ? "Adicionar ao carrinho" : "Escolha as opções"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
