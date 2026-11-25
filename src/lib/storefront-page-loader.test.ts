import assert from "node:assert/strict";
import test from "node:test";
import type { DigitalProductView } from "./digital-products.functions";
import type { Storefront } from "./storefront.functions";
import { createPublicStorefrontLoader } from "./storefront-page-loader.ts";

function storefront(slug: string): Storefront {
  return { store: { slug } } as unknown as Storefront;
}

test("inclui os softwares publicados nos dados da vitrine de Informática", async () => {
  const product = { id: "software-1", product_type: "software" } as DigitalProductView;
  let catalogRequests = 0;
  const loadStorefront = createPublicStorefrontLoader({
    getStorefront: async () => storefront("ti"),
    listPublicDigitalProducts: async () => {
      catalogRequests += 1;
      return [product];
    },
  });

  const result = await loadStorefront("ti");

  assert.equal(catalogRequests, 1);
  assert.deepEqual(result?.digitalProducts, [product]);
});

test("vitrines de outros segmentos recebem uma lista vazia sem consultar o catálogo digital", async () => {
  let catalogRequests = 0;
  const loadStorefront = createPublicStorefrontLoader({
    getStorefront: async () => storefront("camisas"),
    listPublicDigitalProducts: async () => {
      catalogRequests += 1;
      return [];
    },
  });

  const result = await loadStorefront("camisas");

  assert.equal(catalogRequests, 0);
  assert.deepEqual(result?.digitalProducts, []);
});

test("mantém a vitrine acessível se a consulta do catálogo falhar", async () => {
  const originalConsoleError = console.error;
  console.error = () => undefined;
  try {
    const loadStorefront = createPublicStorefrontLoader({
      getStorefront: async () => storefront("ti"),
      listPublicDigitalProducts: async () => {
        throw new Error("catalog unavailable");
      },
    });

    const result = await loadStorefront("ti");

    assert.deepEqual(result?.digitalProducts, []);
  } finally {
    console.error = originalConsoleError;
  }
});
