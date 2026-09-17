-- Mensagem individual usada ao compartilhar a vitrine pelo WhatsApp.
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS share_message text;

COMMENT ON COLUMN public.stores.share_message IS
  'Mensagem personalizada pelo proprietário para compartilhar a vitrine. Quando nula, a aplicação usa uma mensagem padrão.';
