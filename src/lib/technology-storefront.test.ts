import assert from "node:assert/strict";
import test from "node:test";
import { whatsappLink } from "./format.ts";
import type { StorefrontProduct } from "./storefront.functions";
import {
  buildTechnologyQuoteMessage,
  findTechnologyServiceProduct,
  getStorefrontSeoMetadata,
  isTechnologyStorefront,
  technologyServicePriceLabel,
  technologyServices,
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

test("associa cards aos serviços cadastrados sem criar valores", () => {
  const upgrade = technologyServices.find((service) => service.id === "upgrade");
  assert.ok(upgrade);
  const registered = product();
  assert.equal(findTechnologyServiceProduct(upgrade, [registered])?.id, registered.id);
  assert.ok(technologyServicePriceLabel(registered).includes("150,00"));

  assert.equal(
    technologyServicePriceLabel(product({ showPriceFrom: true })),
    "A partir de R$ 150,00",
  );

  const hiddenPrice = product({ priceVisible: false });
  assert.equal(technologyServicePriceLabel(hiddenPrice), "Solicite um orçamento personalizado");
  assert.equal(technologyServicePriceLabel(null), "Solicite um orçamento personalizado");
  assert.equal(
    findTechnologyServiceProduct(upgrade, [product({ name: "Cabo HDMI", description: "1,5 m" })]),
    null,
  );
});

test("cada serviço das duas áreas apresenta um benefício descritivo", () => {
  assert.equal(technologyServices.filter((service) => service.group === "informatica").length, 6);
  assert.equal(
    technologyServices.filter((service) => service.group === "solucoes-digitais").length,
    6,
  );
  assert.ok(technologyServices.every((service) => service.benefit.trim().length > 0));
});

test("mensagem de orçamento inclui o serviço solicitado", () => {
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
