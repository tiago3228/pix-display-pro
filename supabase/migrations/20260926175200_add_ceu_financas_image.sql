-- Adiciona a imagem promocional do CEU Finanças ao catálogo público.
-- A imagem fica hospedada junto aos assets públicos do Vitrini em /ceu-financas.png.
-- Pode ser executada novamente sem duplicar ou criar registros.

UPDATE public.digital_products
SET main_image_path = 'https://vitrini-br.lovable.app/ceu-financas.png',
    banner_image_path = 'https://vitrini-br.lovable.app/ceu-financas.png',
    share_image_path = 'https://vitrini-br.lovable.app/ceu-financas.png',
    updated_at = now()
WHERE slug = 'ceu-financas';
