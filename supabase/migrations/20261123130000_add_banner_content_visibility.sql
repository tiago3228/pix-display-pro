-- Permite ocultar somente título, subtítulo e botão do banner, mantendo a imagem visível.
ALTER TABLE public.storefront_banners
  ADD COLUMN IF NOT EXISTS content_visible boolean NOT NULL DEFAULT true;
