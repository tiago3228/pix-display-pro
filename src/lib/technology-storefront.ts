import type { StorefrontProduct } from "@/lib/storefront.functions";
import { storefrontPrice } from "./format.ts";

export const TECHNOLOGY_STOREFRONT_SLUG = "ti";
export const TECHNOLOGY_STOREFRONT_DESCRIPTION =
  "Assistência técnica, desenvolvimento de sites, sistemas e soluções digitais para pessoas e empresas.";

export type TechnologyServiceGroup = "informatica" | "solucoes-digitais";

export type TechnologyService = {
  id: string;
  group: TechnologyServiceGroup;
  name: string;
  description: string;
  benefit: string;
  keywords: string[];
};

export const technologyServices: TechnologyService[] = [
  {
    id: "formatacao",
    group: "informatica",
    name: "Formatação e otimização",
    description: "Reinstalação e ajustes de software conforme a necessidade do equipamento.",
    benefit: "Um sistema preparado para o uso e as necessidades do seu computador.",
    keywords: ["formatação", "formatacao", "otimização", "otimizacao"],
  },
  {
    id: "manutencao",
    group: "informatica",
    name: "Manutenção de computadores",
    description: "Avaliação do equipamento e orientação sobre o reparo indicado.",
    benefit: "Entenda as opções de reparo adequadas ao equipamento.",
    keywords: ["manutenção", "manutencao", "reparo", "conserto"],
  },
  {
    id: "upgrade",
    group: "informatica",
    name: "Upgrade de SSD e memória",
    description: "Opções de armazenamento e memória avaliadas para o seu computador.",
    benefit: "Escolha componentes compatíveis com a configuração do computador.",
    keywords: ["upgrade", "ssd", "memória", "memoria", "montagem"],
  },
  {
    id: "instalacao",
    group: "informatica",
    name: "Instalação e configuração",
    description: "Instalação de programas e configuração de sistemas e dispositivos.",
    benefit: "Deixe programas e dispositivos configurados para sua rotina.",
    keywords: ["instalação", "instalacao", "configuração", "configuracao"],
  },
  {
    id: "backup-suporte",
    group: "informatica",
    name: "Backup e recuperação",
    description:
      "Backup e recuperação de arquivos quando tecnicamente possível, com orientação para proteção dos dados.",
    benefit: "Proteja arquivos importantes e entenda as opções de recuperação disponíveis.",
    keywords: ["backup", "recuperação", "recuperacao", "suporte"],
  },
  {
    id: "redes",
    group: "informatica",
    name: "Redes e conectividade",
    description: "Configuração e suporte de redes para uso doméstico ou profissional.",
    benefit: "Conectividade configurada conforme o ambiente e os dispositivos utilizados.",
    keywords: ["rede", "redes", "conectividade", "infraestrutura"],
  },
  {
    id: "sites",
    group: "solucoes-digitais",
    name: "Sites profissionais",
    description: "Criação de sites alinhados às necessidades e aos objetivos do projeto.",
    benefit: "Apresente sua atividade em uma página feita para os objetivos do projeto.",
    keywords: ["site", "sites", "website", "web"],
  },
  {
    id: "landing-pages",
    group: "solucoes-digitais",
    name: "Landing pages",
    description: "Páginas digitais para apresentar um serviço, produto ou campanha.",
    benefit: "Concentre as informações e o convite à ação em uma página dedicada.",
    keywords: ["landing", "página de captura", "pagina de captura"],
  },
  {
    id: "lojas-virtuais",
    group: "solucoes-digitais",
    name: "Lojas virtuais",
    description: "Estrutura digital para apresentar produtos e receber pedidos online.",
    benefit: "Organize produtos e pedidos em uma experiência de compra online.",
    keywords: ["loja virtual", "e-commerce", "ecommerce"],
  },
  {
    id: "sistemas",
    group: "solucoes-digitais",
    name: "Sistemas personalizados",
    description: "Sistemas planejados de acordo com os fluxos e requisitos do projeto.",
    benefit: "Planeje fluxos digitais de acordo com os requisitos do seu negócio.",
    keywords: ["sistema", "sistemas", "personalizado"],
  },
  {
    id: "plataformas-saas",
    group: "solucoes-digitais",
    name: "Plataformas e SaaS",
    description: "Desenvolvimento de plataformas digitais sob demanda.",
    benefit: "Estruture uma plataforma com escopo definido para sua operação.",
    keywords: ["saas", "plataforma", "plataformas"],
  },
  {
    id: "automacao-planilhas",
    group: "solucoes-digitais",
    name: "Automação e planilhas inteligentes",
    description: "Planilhas e automações para organizar rotinas e informações.",
    benefit: "Organize informações e tarefas repetitivas em fluxos digitais.",
    keywords: ["automação", "automacao", "planilha", "planilhas"],
  },
];

export function isTechnologyStorefront(slug: string | null | undefined): boolean {
  return slug === TECHNOLOGY_STOREFRONT_SLUG;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function findTechnologyServiceProduct(
  service: TechnologyService,
  products: StorefrontProduct[],
  categories: { id: string; name: string }[] = [],
): StorefrontProduct | null {
  const sortedProducts = [...products].sort(
    (a, b) =>
      Number(b.is_available) - Number(a.is_available) ||
      Number(b.is_featured) - Number(a.is_featured),
  );

  for (const product of sortedProducts) {
    const categoryName =
      categories.find((category) => category.id === product.category_id)?.name ?? "";
    const searchable = normalizeSearchText(`${product.name} ${categoryName}`);
    if (service.keywords.some((keyword) => searchable.includes(normalizeSearchText(keyword)))) {
      return product;
    }
  }
  return null;
}

export function technologyServicePriceLabel(
  product: Pick<StorefrontProduct, "price" | "priceVisible" | "showPriceFrom"> | null,
): string {
  if (!product || !product.priceVisible || !Number.isFinite(product.price) || product.price <= 0) {
    return "Solicite um orçamento personalizado";
  }
  return storefrontPrice(product.price, product.showPriceFrom);
}

export function buildTechnologyQuoteMessage(serviceName: string): string {
  return `Olá! Acessei sua vitrine e gostaria de solicitar um orçamento para o serviço de ${serviceName}. Poderia me passar mais informações?`;
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
