export type LandingBanner = {
  badge: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image: string | null;
};

export const DEFAULT_BANNER: LandingBanner = {
  badge: "Feito para quem vende pelo WhatsApp",
  title: "Venda seus produtos de um jeito mais simples.",
  subtitle: "Crie sua vitrine online, compartilhe seu QR Code, receba pedidos pelo WhatsApp e facilite o pagamento via Pix.",
  ctaLabel: "Criar minha loja grátis",
  ctaHref: "/signup",
  image: null,
};
