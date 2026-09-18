/** Modelos de mensagem e utilidades para campanhas por WhatsApp (links wa.me). */

export type CampaignRecipient = {
  id: string;
  name: string;
  whatsapp: string;
};

export type CampaignField = {
  key: string;
  label: string;
  placeholder?: string;
};

export type CampaignTemplate = {
  value: string;
  label: string;
  text: string;
  /** Campos extras pedidos ao usuário para preencher a mensagem. */
  fields?: CampaignField[];
};

/** Substitui {chave} pelos valores informados (chaves vazias viram string vazia). */
export function fillTemplate(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_match, key: string) => vars[key] ?? "");
}

export const SELLER_TEMPLATES: CampaignTemplate[] = [
  {
    value: "restock",
    label: "Produto voltou ao estoque",
    text: [
      "Oi, {cliente}! 😊",
      "",
      "Boa notícia: *{produto}* voltou para o estoque da {loja}!",
      "",
      "Dá uma olhada na vitrine e garanta o seu:",
      "{link}",
    ].join("\n"),
  },
  {
    value: "promo",
    label: "Promoção / novidade",
    text: [
      "Oi, {cliente}! 😊",
      "",
      "Temos novidades na {loja}: {novidade}",
      "",
      "Confira aqui: {link}",
    ].join("\n"),
    fields: [
      { key: "novidade", label: "Novidade ou promoção", placeholder: "20% off em toda a coleção" },
    ],
  },
  {
    value: "custom",
    label: "Mensagem livre",
    text: "Oi, {cliente}! ",
  },
];

export const ADMIN_TEMPLATES: CampaignTemplate[] = [
  {
    value: "coupon",
    label: "Cupom de desconto",
    text: [
      "Olá, {lojista}! 👋",
      "",
      "Preparamos um cupom especial para a loja *{loja}* no Vitrini:",
      "",
      "🎟️ Cupom: *{cupom}*",
      "📅 Válido até: {validade}",
      "",
      "É só usar na hora de assinar o plano PRO. Qualquer dúvida, é só responder por aqui!",
    ].join("\n"),
    fields: [
      { key: "cupom", label: "Código do cupom", placeholder: "VITRINI10" },
      { key: "validade", label: "Válido até", placeholder: "30/09" },
    ],
  },
  {
    value: "share",
    label: "Compartilhe e ganhe",
    text: [
      "Olá, {lojista}! 👋",
      "",
      "Campanha *Compartilhe e ganhe* do Vitrini: indique outro vendedor e vocês dois ganham {beneficio}.",
      "",
      "É só compartilhar este link: {link}",
    ].join("\n"),
    fields: [
      { key: "beneficio", label: "Benefício", placeholder: "1 mês de PRO grátis" },
      {
        key: "link",
        label: "Link para compartilhar",
        placeholder: "https://cardosovitrini.lovable.app",
      },
    ],
  },
  {
    value: "notice",
    label: "Aviso / novidade da plataforma",
    text: [
      "Olá, {lojista}! 👋",
      "",
      "Novidade no Vitrini: {novidade}",
      "",
      "Qualquer dúvida, é só chamar por aqui. 💚",
    ].join("\n"),
    fields: [
      { key: "novidade", label: "Novidade", placeholder: "agora você pode parcelar vendas" },
    ],
  },
  {
    value: "custom",
    label: "Mensagem livre",
    text: "Olá, {lojista}! ",
  },
];
