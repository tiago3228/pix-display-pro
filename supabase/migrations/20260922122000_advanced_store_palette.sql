-- Premium Storefront: identidade visual avançada por loja.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS theme_palette jsonb NOT NULL DEFAULT '{
    "text_secondary": "#64748b",
    "header": "#111827",
    "menu": "#ffffff",
    "links": "#0f766e",
    "prices": "#111827",
    "offers": "#dc2626",
    "badges": "#f59e0b",
    "cards": "#ffffff",
    "borders": "#e2e8f0",
    "footer": "#111827",
    "filters": "#f1f5f9"
  }'::jsonb;
