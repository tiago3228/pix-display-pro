-- Vitrini PRO: clubes iniciais das ligas nacionais e seleções.
-- Os registros são nós editáveis; esta migração não apaga nem substitui personalizações.

CREATE OR REPLACE FUNCTION public.seed_national_football(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  football_id uuid;
  national_id uuid;
  selections_id uuid;
  league_id uuid;
  club_name text;
  league_record record;
BEGIN
  PERFORM public.seed_sports_for_store(target_store_id);
  SELECT id INTO football_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id IS NULL AND name = 'Futebol' LIMIT 1;
  IF football_id IS NULL THEN RETURN; END IF;

  SELECT id INTO national_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id = football_id AND name = 'Nacional' LIMIT 1;
  IF national_id IS NULL THEN
    national_id := public.seed_international_node(target_store_id, football_id, 'category', 'Nacional', 10, 'Clubes e campeonatos nacionais.');
  END IF;

  FOR league_record IN SELECT * FROM (VALUES
    ('Série A', 10, ARRAY['Atlético-MG','Bahia','Botafogo','Bragantino','Ceará','Corinthians','Cruzeiro','Flamengo','Fluminense','Fortaleza','Grêmio','Internacional','Juventude','Mirassol','Palmeiras','Santos','São Paulo','Sport','Vasco da Gama','Vitória']::text[]),
    ('Série B', 20, ARRAY['Amazonas','América-MG','Athletic Club','Avaí','Botafogo-SP','Chapecoense','CRB','Criciúma','Cuiabá','Ferroviária','Goiás','Novorizontino','Operário-PR','Paysandu','Remo','São José-RS','Volta Redonda','Vila Nova','Brusque','Náutico']::text[])
  ) AS leagues(league_name, sort_order, club_names) LOOP
    league_id := public.seed_international_node(target_store_id, national_id, 'championship', league_record.league_name, league_record.sort_order);
    FOREACH club_name IN ARRAY league_record.club_names LOOP
      PERFORM public.seed_international_node(target_store_id, league_id, 'club', club_name, 0, 'Clube inicial editável pelo proprietário.');
    END LOOP;
  END LOOP;

  SELECT id INTO selections_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id = football_id AND name = 'Seleções' LIMIT 1;
  IF selections_id IS NULL THEN
    selections_id := public.seed_international_node(target_store_id, football_id, 'selection', 'Seleções', 30, 'Seleções nacionais e equipes internacionais.');
  END IF;
  FOREACH club_name IN ARRAY ARRAY['Alemanha','Argentina','Brasil','Bélgica','Espanha','Estados Unidos','França','Inglaterra','Itália','Japão','Países Baixos','Portugal']::text[] LOOP
    PERFORM public.seed_international_node(target_store_id, selections_id, 'selection', club_name, 0, 'Seleção inicial editável pelo proprietário.');
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_national_football(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seed_all_football_catalog(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_international_football(target_store_id);
  PERFORM public.seed_national_football(target_store_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_all_football_catalog(uuid) TO authenticated, service_role;

-- Novas lojas já recebem os dois catálogos; lojas existentes também são atualizadas de forma idempotente.
CREATE OR REPLACE FUNCTION public.seed_sports_after_store()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.seed_all_football_catalog(NEW.id);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS stores_seed_sports ON public.stores;
CREATE TRIGGER stores_seed_sports AFTER INSERT ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.seed_sports_after_store();

DO $$
DECLARE store_row record;
BEGIN
  FOR store_row IN SELECT id FROM public.stores LOOP
    PERFORM public.seed_all_football_catalog(store_row.id);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.seed_national_football(uuid) IS 'Seed idempotente de Série A, Série B e seleções; todos os nós permanecem editáveis.';
