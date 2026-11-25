import type { StorefrontProduct } from "@/lib/storefront.functions";
import { storefrontPrice } from "./format.ts";

export const TECHNOLOGY_STOREFRONT_SLUG = "ti";
export const TECHNOLOGY_STOREFRONT_DESCRIPTION =
  "Assistência técnica, desenvolvimento de sites, sistemas e soluções digitais para pessoas e empresas.";

export type TechnologyProductGroupId = "informatica" | "solucoes-digitais" | "outros";
export type TechnologyProductGroup = {
  id: string;
  title: string;
  description: string;
  products: StorefrontProduct[];
};
export type TechnologyStorefrontCategory = {
  id: string;
  name: string;
  module?: string;
  image: string | null;
  categoryIds: string[];
};

const productGroupDefinitions: Omit<TechnologyProductGroup, "products">[] = [
  {
    id: "assistencia-tecnica",
    title: "Assistência técnica e informática",
    description: "Serviços e itens publicados no catálogo para informática e suporte técnico.",
  },
  {
    id: "solucoes-digitais",
    title: "Desenvolvimento e soluções digitais",
    description: "Serviços digitais publicados no catálogo da loja.",
  },
  {
    id: "outros-itens",
    title: "Outros serviços e itens",
    description: "Outros cadastros publicados no catálogo da loja.",
  },
];

const technologyKeywords = [
  "formatacao",
  "backup",
  "instalacao",
  "upgrade",
  "manutencao",
  "reparo",
  "rede",
  "conectividade",
  "peca",
  "acessorio",
  "informatica",
];
const digitalKeywords = [
  "site",
  "sistema",
  "agendamento",
  "planilha",
  "automacao",
  "consultoria",
  "suporte",
  "landing",
  "loja virtual",
  "ecommerce",
  "plataforma",
  "saas",
  "digital",
  "digitais",
  "software",
  "aplicativo",
  "app",
];

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function getTechnologyProductDisplayName(name: string): string {
  return normalizeSearchText(name) === "formatacao" ? "Formatação e otimização" : name;
}

function classifyTechnologyProduct(
  product: StorefrontProduct,
  categories: { id: string; name: string }[],
): TechnologyProductGroupId {
  const categoryName =
    categories.find((category) => category.id === product.category_id)?.name ?? "";
  const searchable = normalizeSearchText(`${categoryName} ${product.name}`);
  if (digitalKeywords.some((keyword) => searchable.includes(normalizeSearchText(keyword)))) {
    return "solucoes-digitais";
  }
  if (technologyKeywords.some((keyword) => searchable.includes(normalizeSearchText(keyword)))) {
    return "informatica";
  }
  return "outros";
}

export function groupTechnologyStorefrontProducts(
  products: StorefrontProduct[],
  categories: { id: string; name: string }[] = [],
): TechnologyProductGroup[] {
  const grouped = new Map<string, StorefrontProduct[]>(
    productGroupDefinitions.map((group) => [group.id, []]),
  );
  const definitionIdByGroup: Record<TechnologyProductGroupId, string> = {
    informatica: "assistencia-tecnica",
    "solucoes-digitais": "solucoes-digitais",
    outros: "outros-itens",
  };

  for (const product of products) {
    const groupId = definitionIdByGroup[classifyTechnologyProduct(product, categories)];
    grouped.get(groupId)?.push(product);
  }

  return productGroupDefinitions
    .map((group) => ({
      ...group,
      products: grouped.get(group.id) ?? [],
    }))
    .filter((group) => group.products.length > 0);
}

export function getTechnologyStorefrontCategories(
  categories: { id: string; name: string; module?: string; image: string | null }[],
  products: StorefrontProduct[],
): TechnologyStorefrontCategory[] {
  const grouped = new Map<string, TechnologyStorefrontCategory>();

  for (const category of categories) {
    if (!products.some((product) => product.category_id === category.id)) continue;

    const key = normalizeSearchText(category.name);
    const existing = grouped.get(key);
    if (existing) {
      if (!existing.categoryIds.includes(category.id)) existing.categoryIds.push(category.id);
      if (!existing.image && category.image) existing.image = category.image;
      continue;
    }

    grouped.set(key, { ...category, categoryIds: [category.id] });
  }

  return [...grouped.values()];
}

export function isTechnologyStorefront(slug: string | null | undefined): boolean {
  return slug === TECHNOLOGY_STOREFRONT_SLUG;
}

export function technologyServicePriceLabel(
  product: Pick<StorefrontProduct, "price" | "priceVisible" | "showPriceFrom"> | null,
  isPremium = true,
): string {
  if (
    !product ||
    (isPremium && !product.priceVisible) ||
    !Number.isFinite(product.price) ||
    product.price <= 0
  ) {
    return "Solicitar orçamento";
  }
  return storefrontPrice(product.price, product.showPriceFrom);
}

export function buildTechnologyQuoteMessage(serviceName: string): string {
  return `Olá! Acessei sua vitrine e gostaria de solicitar um orçamento para o serviço de ${serviceName}. Poderia me passar mais informações?`;
}

export function buildTechnologyReviewMessage(): string {
  return "Olá! Gostaria de compartilhar minha avaliação sobre o atendimento que recebi.";
}

export function getStorefrontSeoMetadata(store: {
  slug: string;
  name: string;
  description: string;
}): { title: string; description: string } {
  if (isTechnologyStorefront(store.slug)) {
    return {
      title: `${store.name} | Assistência Técnica, Sites e Sistemas`,
      description: TECHNOLOGY_STOREFRONT_DESCRIPTION,
    };
  }
  return {
    title: `${store.name} | Loja Online`,
    description: store.description || `Veja os produtos de ${store.name} e peça pelo WhatsApp.`,
  };
}
