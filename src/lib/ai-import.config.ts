/** Configuração central do Cadastro Inteligente de Produtos com IA. */

/** Limite mensal de PÁGINAS analisadas por plano (não é por produto). */
export const AI_PAGE_LIMITS = {
  free: 5,
  pro: 100,
} as const;

/** Máximo de páginas enviadas em uma única análise. */
export const AI_MAX_PAGES_PER_RUN = 5;

/** Máximo de fotos por produto (cadastro manual e por IA). */
export const MAX_PRODUCT_IMAGES = 5;

/** Tipos de imagem aceitos no upload. */
export const AI_ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

/** Tamanho máximo por arquivo enviado (antes da compressão). */
export const AI_MAX_FILE_BYTES = 12 * 1024 * 1024;

/** Maior dimensão da imagem depois da compressão feita no navegador. */
export const AI_COMPRESS_MAX_SIDE = 1600;
export const AI_COMPRESS_QUALITY = 0.82;

export function aiPageLimitFor(isPro: boolean) {
  return isPro ? AI_PAGE_LIMITS.pro : AI_PAGE_LIMITS.free;
}
