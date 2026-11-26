import { z } from "zod";

const plainText = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) =>
        !value.includes("<") &&
        !value.includes(">") &&
        ![...value].some((character) => {
          const code = character.charCodeAt(0);
          return code < 0x09 || (code > 0x0d && code < 0x20) || code === 0x7f;
        }),
      "Use texto simples, sem HTML.",
    );

const assetPath = z
  .string()
  .trim()
  .min(3)
  .max(500)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("..") &&
      !/^(?:https?:|data:|javascript:|blob:)/i.test(value),
    "Imagem deve apontar para um arquivo gerenciado pela loja.",
  );

const safeHttpsUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "https:" && !parsed.username && !parsed.password;
    } catch {
      return false;
    }
  }, "O link deve usar HTTPS e não pode conter credenciais.");

const optionalAsset = assetPath.nullable().optional();
const optionalAlt = z.string().trim().max(180).optional().default("");

export const introSectionSchema = z
  .object({
    title: plainText(120),
    description: plainText(1200),
    image: optionalAsset,
    imageAlt: optionalAlt,
  })
  .strict();

export const differentiatorsSectionSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            title: plainText(80),
            description: plainText(400),
            icon: z.enum(["quality", "speed", "care", "support", "custom"]),
          })
          .strict(),
      )
      .max(12),
  })
  .strict();

export const serviceStepsSectionSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            title: plainText(80),
            description: plainText(400),
          })
          .strict(),
      )
      .min(1)
      .max(10),
  })
  .strict();

export const portfolioSectionSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            title: plainText(100),
            description: plainText(500),
            image: optionalAsset,
            imageAlt: optionalAlt,
            href: safeHttpsUrl.nullable().optional(),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();

export const faqSectionSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            question: plainText(200),
            answer: plainText(1200),
          })
          .strict(),
      )
      .max(30),
  })
  .strict();

export const testimonialsSectionSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            id: z.string().uuid(),
            displayName: plainText(100),
            quote: plainText(700),
            consent: z
              .object({
                granted: z.literal(true),
                grantedAt: z.string().datetime(),
                scope: z
                  .array(z.enum(["quote", "name", "image"]))
                  .min(1)
                  .max(3),
                privateEvidenceRef: z.string().max(500).optional(),
              })
              .strict(),
            image: optionalAsset,
            imageAlt: optionalAlt,
          })
          .strict()
          .superRefine((item, ctx) => {
            if (item.image && !item.consent.scope.includes("image")) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["consent", "scope"],
                message: "A autorização deve incluir o uso da imagem.",
              });
            }
            if (!item.consent.scope.includes("quote")) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["consent", "scope"],
                message: "A autorização deve incluir a publicação do depoimento.",
              });
            }
          }),
      )
      .max(20),
  })
  .strict();

export const premiumSectionSchemas = {
  intro: introSectionSchema,
  differentiators: differentiatorsSectionSchema,
  service_steps: serviceStepsSectionSchema,
  portfolio: portfolioSectionSchema,
  faq: faqSectionSchema,
  testimonials: testimonialsSectionSchema,
} as const;

export type PremiumSectionKey = keyof typeof premiumSectionSchemas;
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type PremiumSectionContent<K extends PremiumSectionKey> = z.infer<
  (typeof premiumSectionSchemas)[K]
>;

export function isPremiumSectionKey(key: string): key is PremiumSectionKey {
  return Object.hasOwn(premiumSectionSchemas, key);
}

export function parsePremiumSection(key: string, content: unknown) {
  if (!isPremiumSectionKey(key)) return null;
  const schema = premiumSectionSchemas[key as PremiumSectionKey];
  const result = schema.safeParse(content);
  return result.success ? result.data : null;
}

/** Removes private authorization metadata before any public projection. */
function asSerializableJson(value: unknown): JsonValue {
  const serialized = JSON.stringify(value);
  return serialized === undefined ? null : (JSON.parse(serialized) as JsonValue);
}

export function projectPublicSection(key: PremiumSectionKey, content: unknown): JsonValue | null {
  const parsed = parsePremiumSection(key, content);
  if (!parsed) return null;
  if (key !== "testimonials") return asSerializableJson(parsed);

  const testimonials = parsed as z.infer<typeof testimonialsSectionSchema>;
  return asSerializableJson({
    items: testimonials.items.map(({ consent, displayName, ...publicItem }) => ({
      ...publicItem,
      displayName: consent.scope.includes("name") ? displayName : "Cliente",
    })),
  });
}

export function isSafeStoreAssetPath(path: string, ownerId: string) {
  const [ownerPrefix, ...rest] = path.split("/");
  return (
    ownerPrefix === ownerId &&
    rest.length > 0 &&
    rest.every((part) => part.length > 0 && part !== "." && part !== "..")
  );
}
