-- Configuracoes de obrigatoriedade do montador e catalogo inicial ampliado de bebidas.
ALTER TABLE public.pizzeria_settings
  ADD COLUMN IF NOT EXISTS require_size boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_flavors boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_border boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_drink boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_sauce boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_additional boolean NOT NULL DEFAULT false;

-- Catalogo sugerido com marcas e apresentacoes populares no Brasil.
-- Todos os itens permanecem editaveis e podem ser ativados/desativados no painel.
CREATE OR REPLACE FUNCTION public.seed_pizzeria_drinks_for_store(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.pizzeria_addons(store_id,group_key,name,description,price,sort_order)
  SELECT target_store_id, 'bebida', d.name, d.description, d.price, d.position
  FROM (VALUES
    ('Coca-Cola 2L','Refrigerante · Original · 2 litros',14.00,10),
    ('Coca-Cola Zero 2L','Refrigerante · Zero açúcar · 2 litros',14.00,20),
    ('Coca-Cola 1L','Refrigerante · Original · 1 litro',9.00,30),
    ('Coca-Cola lata 350ml','Refrigerante · Original · Lata 350 ml',6.00,40),
    ('Coca-Cola Zero lata 350ml','Refrigerante · Zero açúcar · Lata 350 ml',6.00,50),
    ('Guaraná Antarctica 2L','Refrigerante · 2 litros',12.00,60),
    ('Guaraná Antarctica lata 350ml','Refrigerante · Lata 350 ml',5.00,70),
    ('Pepsi 2L','Refrigerante · 2 litros',12.00,80),
    ('Pepsi Black lata 350ml','Refrigerante · Zero açúcar · Lata 350 ml',5.00,90),
    ('Fanta Laranja 2L','Refrigerante · 2 litros',12.00,100),
    ('Fanta Uva 2L','Refrigerante · 2 litros',12.00,110),
    ('Sprite 2L','Refrigerante · 2 litros',12.00,120),
    ('Suco Del Valle 1L','Suco pronto · sabores variados · 1 litro',12.00,130),
    ('Suco Del Valle lata 290ml','Suco pronto · lata 290 ml',5.00,140),
    ('Suco Natural One 900ml','Suco integral · 900 ml',14.00,150),
    ('Suco de laranja 1L','Suco · 1 litro',12.00,160),
    ('Água mineral 500ml','Água sem gás · 500 ml',3.00,170),
    ('Água mineral com gás 500ml','Água com gás · 500 ml',4.00,180),
    ('Água mineral 1,5L','Água sem gás · 1,5 litro',6.00,190),
    ('Água de coco 1L','Água de coco · 1 litro',12.00,200)
  ) AS d(name,description,price,position)
  ON CONFLICT (store_id,group_key,name) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_pizzeria_drinks_for_store(uuid) TO authenticated, service_role;

-- Completa o catálogo das lojas que já possuem configuração.
DO $$
DECLARE store_row record;
BEGIN
  FOR store_row IN SELECT store_id FROM public.pizzeria_settings LOOP
    PERFORM public.seed_pizzeria_drinks_for_store(store_row.store_id);
  END LOOP;
END;
$$;

-- Garante bebidas iniciais quando a configuração da pizzaria for criada no futuro.
CREATE OR REPLACE FUNCTION public.seed_pizzeria_drinks_after_settings_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.seed_pizzeria_drinks_for_store(NEW.store_id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS seed_pizzeria_drinks_after_settings_insert ON public.pizzeria_settings;
CREATE TRIGGER seed_pizzeria_drinks_after_settings_insert
AFTER INSERT ON public.pizzeria_settings
FOR EACH ROW EXECUTE FUNCTION public.seed_pizzeria_drinks_after_settings_insert();

COMMENT ON COLUMN public.pizzeria_settings.require_size IS 'Exige que o cliente selecione um tamanho no montador público.';
COMMENT ON COLUMN public.pizzeria_settings.require_flavors IS 'Exige que o cliente selecione ao menos um sabor no montador público.';
COMMENT ON COLUMN public.pizzeria_settings.require_border IS 'Exige que o cliente escolha uma borda no montador público.';
COMMENT ON COLUMN public.pizzeria_settings.require_drink IS 'Exige que o cliente selecione ao menos uma bebida no montador público.';
COMMENT ON COLUMN public.pizzeria_settings.require_sauce IS 'Exige que o cliente selecione ao menos um molho no montador público.';
COMMENT ON COLUMN public.pizzeria_settings.require_additional IS 'Exige que o cliente selecione ao menos um adicional no montador público.';
