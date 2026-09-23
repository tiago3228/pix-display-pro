-- Paleta padrão clean do Vitrini: grafite, ardósia, teal discreto e fundo claro.
ALTER TABLE public.stores
  ALTER COLUMN secondary_color SET DEFAULT '#475569',
  ALTER COLUMN accent_color SET DEFAULT '#0f9f9a',
  ALTER COLUMN background_color SET DEFAULT '#f8fafc',
  ALTER COLUMN text_color SET DEFAULT '#0f172a',
  ALTER COLUMN button_color SET DEFAULT '#0f172a';

ALTER TABLE public.stores
  ALTER COLUMN theme_palette SET DEFAULT '{
    "text_secondary": "#64748b",
    "header": "#0f172a",
    "menu": "#ffffff",
    "links": "#0f9f9a",
    "prices": "#0f172a",
    "offers": "#e11d48",
    "badges": "#0f9f9a",
    "cards": "#ffffff",
    "borders": "#e2e8f0",
    "footer": "#0f172a",
    "filters": "#f1f5f9"
  }'::jsonb;
