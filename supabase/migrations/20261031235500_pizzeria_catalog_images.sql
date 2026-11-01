-- Fotos do catálogo da pizzaria: upload próprio e imagens iniciais com licença identificada.
ALTER TABLE public.pizzeria_addons
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_credit text,
  ADD COLUMN IF NOT EXISTS image_source_url text;

ALTER TABLE public.pizzeria_flavors
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_credit text,
  ADD COLUMN IF NOT EXISTS image_source_url text;

-- Bucket público para exibição das fotos no cardápio; uploads ficam restritos ao dono da loja.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pizzeria-images',
  'pizzeria-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Public can view pizzeria catalog images" ON storage.objects;
CREATE POLICY "Public can view pizzeria catalog images"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'pizzeria-images');

DROP POLICY IF EXISTS "Store owners upload pizzeria catalog images" ON storage.objects;
CREATE POLICY "Store owners upload pizzeria catalog images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'pizzeria-images'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = split_part(name, '/', 1)
      AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Store owners update pizzeria catalog images" ON storage.objects;
CREATE POLICY "Store owners update pizzeria catalog images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'pizzeria-images'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = split_part(name, '/', 1)
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'pizzeria-images'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = split_part(name, '/', 1)
      AND s.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Store owners delete pizzeria catalog images" ON storage.objects;
CREATE POLICY "Store owners delete pizzeria catalog images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'pizzeria-images'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = split_part(name, '/', 1)
      AND s.owner_id = auth.uid()
  )
);

-- Imagens de referência encontradas no Wikimedia Commons.
-- Cada foto mantém crédito e página de origem para respeitar a licença.
UPDATE public.pizzeria_flavors
SET image_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/Pizza_Margarita.jpg',
    image_credit = 'PapiPijuan · CC BY-SA 4.0',
    image_source_url = 'https://commons.wikimedia.org/wiki/File:Pizza_Margarita.jpg'
WHERE name = 'Marguerita' AND image_url IS NULL;

UPDATE public.pizzeria_flavors
SET image_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/Pizza_de_calabresa_%285465192982%29.jpg',
    image_credit = 'Monica Kaneko · CC BY-SA 2.0',
    image_source_url = 'https://commons.wikimedia.org/wiki/File:Pizza_de_calabresa_(5465192982).jpg'
WHERE name = 'Calabresa' AND image_url IS NULL;

UPDATE public.pizzeria_addons
SET image_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/Coca-Cola_bottle.jpg',
    image_credit = 'Martin Abegglen · CC BY-SA 2.0',
    image_source_url = 'https://commons.wikimedia.org/wiki/File:Coca-Cola_bottle.jpg'
WHERE group_key = 'bebida' AND name = 'Coca-Cola 2L' AND image_url IS NULL;

UPDATE public.pizzeria_addons
SET image_url = 'https://commons.wikimedia.org/wiki/Special:FilePath/Coca-Cola_lata.jpg',
    image_credit = 'Alumnum · domínio público',
    image_source_url = 'https://commons.wikimedia.org/wiki/File:Coca-Cola_lata.jpg'
WHERE group_key = 'bebida' AND name = 'Coca-Cola lata 350ml' AND image_url IS NULL;

-- Aplica as mesmas imagens de referência aos catálogos criados futuramente.
CREATE OR REPLACE FUNCTION public.set_pizzeria_default_catalog_image()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.image_url IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'pizzeria_flavors' THEN
    IF NEW.name = 'Marguerita' THEN
      NEW.image_url := 'https://commons.wikimedia.org/wiki/Special:FilePath/Pizza_Margarita.jpg';
      NEW.image_credit := 'PapiPijuan · CC BY-SA 4.0';
      NEW.image_source_url := 'https://commons.wikimedia.org/wiki/File:Pizza_Margarita.jpg';
    ELSIF NEW.name = 'Calabresa' THEN
      NEW.image_url := 'https://commons.wikimedia.org/wiki/Special:FilePath/Pizza_de_calabresa_%285465192982%29.jpg';
      NEW.image_credit := 'Monica Kaneko · CC BY-SA 2.0';
      NEW.image_source_url := 'https://commons.wikimedia.org/wiki/File:Pizza_de_calabresa_(5465192982).jpg';
    END IF;
  ELSIF TG_TABLE_NAME = 'pizzeria_addons' AND NEW.group_key = 'bebida' THEN
    IF NEW.name = 'Coca-Cola 2L' THEN
      NEW.image_url := 'https://commons.wikimedia.org/wiki/Special:FilePath/Coca-Cola_bottle.jpg';
      NEW.image_credit := 'Martin Abegglen · CC BY-SA 2.0';
      NEW.image_source_url := 'https://commons.wikimedia.org/wiki/File:Coca-Cola_bottle.jpg';
    ELSIF NEW.name = 'Coca-Cola lata 350ml' THEN
      NEW.image_url := 'https://commons.wikimedia.org/wiki/Special:FilePath/Coca-Cola_lata.jpg';
      NEW.image_credit := 'Alumnum · domínio público';
      NEW.image_source_url := 'https://commons.wikimedia.org/wiki/File:Coca-Cola_lata.jpg';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pizzeria_flavors_default_image ON public.pizzeria_flavors;
CREATE TRIGGER pizzeria_flavors_default_image
BEFORE INSERT ON public.pizzeria_flavors
FOR EACH ROW EXECUTE FUNCTION public.set_pizzeria_default_catalog_image();

DROP TRIGGER IF EXISTS pizzeria_addons_default_image ON public.pizzeria_addons;
CREATE TRIGGER pizzeria_addons_default_image
BEFORE INSERT ON public.pizzeria_addons
FOR EACH ROW EXECUTE FUNCTION public.set_pizzeria_default_catalog_image();

COMMENT ON COLUMN public.pizzeria_flavors.image_url IS 'URL pública da foto do sabor da pizza.';
COMMENT ON COLUMN public.pizzeria_addons.image_url IS 'URL pública da foto da bebida, borda, molho ou adicional.';
