-- Mensagem individual usada ao compartilhar a vitrine pelo WhatsApp.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS share_message text;

COMMENT ON COLUMN public.stores.share_message IS
  'Mensagem personalizada para compartilhar a loja; NULL usa o texto padrão genérico.';
