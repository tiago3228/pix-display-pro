import assert from "node:assert/strict";
import test from "node:test";
import {
  isSafeStoreAssetPath,
  parsePremiumSection,
  projectPublicSection,
} from "./premium-storefront.schemas.ts";

const id = "a5f44d4a-3d94-4b21-9e94-cf5bd02a7fd5";

test("schemas aceitam conteúdos válidos e rejeitam propriedades inesperadas", () => {
  assert.ok(parsePremiumSection("intro", { title: "Sobre", description: "Texto comercial" }));
  assert.ok(
    parsePremiumSection("differentiators", {
      items: [{ id, title: "Atendimento", description: "Próximo", icon: "support" }],
    }),
  );
  assert.ok(
    parsePremiumSection("service_steps", {
      items: [{ id, title: "Contato", description: "Converse com a loja" }],
    }),
  );
  assert.ok(
    parsePremiumSection("faq", {
      items: [{ id, question: "Como funciona?", answer: "Entre em contato." }],
    }),
  );
  assert.equal(
    parsePremiumSection("intro", { title: "Sobre", description: "Texto", ownerId: "private" }),
    null,
  );
  assert.equal(parsePremiumSection("unknown", {}), null);
});

test("portfólio permite link opcional, mas aceita apenas HTTPS sem credenciais", () => {
  const base = { items: [{ id, title: "Projeto", description: "Descrição", image: null }] };
  assert.ok(parsePremiumSection("portfolio", base));
  assert.ok(
    parsePremiumSection("portfolio", {
      items: [{ ...base.items[0], href: "https://example.com/projeto" }],
    }),
  );
  assert.equal(
    parsePremiumSection("portfolio", {
      items: [{ ...base.items[0], href: "http://example.com" }],
    }),
    null,
  );
  assert.equal(
    parsePremiumSection("portfolio", {
      items: [{ ...base.items[0], href: "https://user:pass@example.com" }],
    }),
    null,
  );
});

test("depoimentos publicados exigem consentimento válido e a projeção remove metadados privados", () => {
  const content = {
    items: [
      {
        id,
        displayName: "Cliente",
        quote: "Atendimento aprovado.",
        consent: {
          granted: true,
          grantedAt: "2026-01-01T12:00:00.000Z",
          scope: ["quote", "name"],
          privateEvidenceRef: "private://consent-record",
        },
      },
    ],
  };
  assert.equal(
    parsePremiumSection("testimonials", { items: [{ ...content.items[0], consent: undefined }] }),
    null,
  );
  const projected = projectPublicSection("testimonials", content) as {
    items: Record<string, unknown>[];
  };
  assert.equal(projected.items.length, 1);
  assert.equal("consent" in projected.items[0]!, false);
  assert.equal("privateEvidenceRef" in projected.items[0]!, false);

  const quoteOnly = {
    items: [
      {
        ...content.items[0]!,
        displayName: "Nome privado",
        consent: { ...content.items[0]!.consent, scope: ["quote"] },
      },
    ],
  };
  const projectedQuoteOnly = projectPublicSection("testimonials", quoteOnly) as {
    items: { displayName: string }[];
  };
  assert.equal(projectedQuoteOnly.items[0]?.displayName, "Cliente");
});

test("imagens precisam estar sob o prefixo da loja e não podem escapar do diretório", () => {
  const ownerId = "owner-123";
  assert.equal(isSafeStoreAssetPath(`${ownerId}/portfolio/projeto.webp`, ownerId), true);
  assert.equal(isSafeStoreAssetPath("other-owner/portfolio/projeto.webp", ownerId), false);
  assert.equal(isSafeStoreAssetPath(`${ownerId}/../private.webp`, ownerId), false);
  assert.equal(isSafeStoreAssetPath(`${ownerId}/`, ownerId), false);
});
