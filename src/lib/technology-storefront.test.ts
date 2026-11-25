import assert from "node:assert/strict";
import test from "node:test";
import { whatsappLink } from "./format.ts";
import type { StorefrontProduct } from "./storefront.functions";
import {
  buildTechnologyQuoteMessage,
  buildTechnologyReviewMessage,
  getTechnologyProductDisplayName,
  getStorefrontSeoMetadata,
  getTechnologyStorefrontCategories,
  groupTechnologyStorefrontProducts,
  shouldShowTechnologyCatalog,
  isTechnologyStorefront,
  technologyServicePriceLabel,
  TECHNOLOGY_CATALOG_VISIBILITY_KEY,
} from "./technology-storefront.ts";

function product(overrides: Partial<StorefrontProduct> = {}): StorefrontProduct {
  return {
    id: "service-1",
    module: "informatica",
    mealPeriod: "both",
    deliveryEnabled: false,
    name: "Upgrades e montagem",
    description: "Upgrade de hardware e montagem de computador.",
    price: 150,
    image: null,
    images: [],
    stock: 0,
    track_stock: false,
    is_available: true,
    is_featured: true,
    has_variants: false,
    category_id: null,
    options: [],
    variants: [],
    orderEnabled: false,
    orderUnitPrice: null,
    orderMinQuantity: 1,
    orderMaxQuantity: null,
    orderLeadTime: null,
    orderNotes: null,
    orderProgressivePricing: false,
    orderTiers: [],
    purchaseEnabled: true,
    quantityEnabled: true,
    priceVisible: true,
    showPriceFrom: false,
    quoteEnabled: false,
    sportsNodeIds: [],
    sportsProductType: null,
    sportsAudience: null,
    sportsIsRetro: false,
    sportsIsNewRelease: false,
    sportsIsCustomized: false,
    sportsOfferActive: false,
    sportsOriginalPrice: null,
    sportsOfferPrice: null,
    sportsOfferPercent: null,
    sportsCollectionNames: [],
    shoeBrand: null,
    shoeModel: null,
    jewelryMaterial: null,
    jewelryPlating: null,
    jewelryColor: null,
    jewelryStone: null,
    jewelryIsNewRelease: false,
    jewelryOfferActive: false,
    jewelryOriginalPrice: null,
    jewelryOfferPrice: null,
    jewelryOfferPercent: null,
    jewelryOfferExpiresAt: null,
    ...overrides,
  };
}

test("a página especializada é ativada apenas para o slug ti", () => {
  assert.equal(isTechnologyStorefront("ti"), true);
  assert.equal(isTechnologyStorefront("TI"), false);
  assert.equal(isTechnologyStorefront("camisas"), false);
  assert.equal(isTechnologyStorefront(null), false);
});

test("o catálogo TI é visível por padrão, pode ser ocultado e não altera outras lojas", () => {
  assert.equal(shouldShowTechnologyCatalog("ti", undefined), true);
  assert.equal(
    shouldShowTechnologyCatalog("ti", { [TECHNOLOGY_CATALOG_VISIBILITY_KEY]: "false" }),
    false,
  );
  assert.equal(
    shouldShowTechnologyCatalog("ti", { [TECHNOLOGY_CATALOG_VISIBILITY_KEY]: false }),
    false,
  );
  assert.equal(
    shouldShowTechnologyCatalog("ti", { [TECHNOLOGY_CATALOG_VISIBILITY_KEY]: "true" }),
    true,
  );
  assert.equal(
    shouldShowTechnologyCatalog("camisas", { [TECHNOLOGY_CATALOG_VISIBILITY_KEY]: "false" }),
    true,
  );
});

test("agrupa os produtos cadastrados sem perder registros nem duplicá-los", () => {
  const records = [
    product({ id: "p1", name: "Formatação e otimização", category_id: "cat-ti" }),
    product({
      id: "p2",
      name: "Vitrini",
      description: "Plataforma para lojas virtuais",
      category_id: "cat-digital",
    }),
    product({ id: "p3", name: "Cabo HDMI", category_id: "cat-geral" }),
  ];
  const groups = groupTechnologyStorefrontProducts(records, [
    { id: "cat-ti", name: "Informática" },
    { id: "cat-digital", name: "Soluções digitais" },
    { id: "cat-geral", name: "Geral" },
  ]);
  const groupedIds = groups.flatMap((group) => group.products.map((item) => item.id));

  assert.deepEqual([...groupedIds].sort(), ["p1", "p2", "p3"]);
  assert.equal(new Set(groupedIds).size, records.length);
  assert.deepEqual(
    groups.find((group) => group.id === "assistencia-tecnica")?.products.map((item) => item.id),
    ["p1"],
  );
  assert.deepEqual(
    groups.find((group) => group.id === "solucoes-digitais")?.products.map((item) => item.id),
    ["p2"],
  );
});

test("padroniza somente o rótulo público de Formatação para o nome da categoria", () => {
  assert.equal(getTechnologyProductDisplayName("Formatação"), "Formatação e otimização");
  assert.equal(getTechnologyProductDisplayName("Sites e sistemas"), "Sites e sistemas");
});

test("omite grupos sem cadastros sem perder os serviços publicados", () => {
  const records = [product({ id: "site", name: "Sites e sistemas" })];
  const groups = groupTechnologyStorefrontProducts(records);

  assert.deepEqual(
    groups.map((group) => group.id),
    ["solucoes-digitais"],
  );
  assert.deepEqual(
    groups.flatMap((group) => group.products.map((item) => item.id)),
    ["site"],
  );
});

test("classifica serviços de agendamento como soluções digitais", () => {
  const groups = groupTechnologyStorefrontProducts([
    product({ id: "booking", name: "Sistema de agendamento" }),
  ]);

  assert.deepEqual(
    groups.find((group) => group.id === "solucoes-digitais")?.products.map((item) => item.id),
    ["booking"],
  );
  assert.equal(
    groups.some((group) => group.id === "outros-itens"),
    false,
  );
});

test("deduplica categorias equivalentes, ignora categorias vazias e preserva os IDs", () => {
  const categories = [
    { id: "geral-1", name: "Geral", module: "informatica", image: null },
    { id: "geral-2", name: " geral ", module: "informatica", image: "category.jpg" },
    { id: "empty", name: "Sem produtos", module: "informatica", image: null },
  ];
  const products = [
    product({ id: "item-1", category_id: "geral-1" }),
    product({ id: "item-2", category_id: "geral-2" }),
  ];
  const result = getTechnologyStorefrontCategories(categories, products);

  assert.equal(result.length, 1);
  assert.deepEqual(result[0]?.categoryIds, ["geral-1", "geral-2"]);
  assert.equal(result[0]?.image, "category.jpg");
  assert.equal(result[0]?.name, "Geral");
});

test("usa rótulos de preço cadastrados sem esconder preço em lojas Básicas", () => {
  const registered = product();
  assert.equal(technologyServicePriceLabel(registered), "R$ 150,00");
  assert.equal(
    technologyServicePriceLabel(product({ showPriceFrom: true })),
    "A partir de R$ 150,00",
  );
  assert.equal(
    technologyServicePriceLabel(product({ priceVisible: false }), true),
    "Solicitar orçamento",
  );
  assert.equal(technologyServicePriceLabel(product({ priceVisible: false }), false), "R$ 150,00");
  assert.equal(technologyServicePriceLabel(product({ price: 0 })), "Solicitar orçamento");
  assert.equal(technologyServicePriceLabel(null), "Solicitar orçamento");
});

test("mensagem de orçamento inclui o serviço solicitado e forma link de WhatsApp válido", () => {
  const message = buildTechnologyQuoteMessage("Formatação e otimização");
  assert.equal(
    message,
    "Olá! Acessei sua vitrine e gostaria de solicitar um orçamento para o serviço de Formatação e otimização. Poderia me passar mais informações?",
  );
  const url = new URL(whatsappLink("(31) 99999-8888", message));
  assert.equal(url.host, "wa.me");
  assert.equal(url.pathname, "/5531999998888");
  assert.equal(url.searchParams.get("text"), message);
});

test("convite de avaliação usa o WhatsApp configurado sem alegar publicação automática", () => {
  const message = buildTechnologyReviewMessage();
  const url = new URL(whatsappLink("(31) 99999-8888", message));

  assert.match(message, /avaliação/i);
  assert.equal(url.host, "wa.me");
  assert.equal(url.pathname, "/5531999998888");
  assert.equal(url.searchParams.get("text"), message);
});

test("SEO específico não altera os metadados das demais lojas", () => {
  assert.equal(
    getStorefrontSeoMetadata({ slug: "ti", name: "Minha Loja", description: "Descrição" }).title,
    "Minha Loja | Assistência Técnica, Sites e Sistemas",
  );
  assert.deepEqual(
    getStorefrontSeoMetadata({
      slug: "camisas",
      name: "Camisas da Cidade",
      description: "Times e camisas",
    }),
    {
      title: "Camisas da Cidade | Loja Online",
      description: "Times e camisas",
    },
  );
});
