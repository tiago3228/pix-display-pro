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
  subtitle:
    "Comece na Básica por R$ 9,90/mês e ganhe 30 dias de PRO. Depois, escolha o PRO por R$ 19,90/mês para liberar todos os recursos.",
  ctaLabel: "Começar na Básica",
  ctaHref: "/signup",
  image: null,
};
