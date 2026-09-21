-- Correção idempotente do catálogo internacional e nacional.
-- Executar depois de 20260921093000_seed_international_football.sql e
-- 20260921094500_seed_national_league_clubs.sql.

CREATE OR REPLACE FUNCTION public.repair_football_competitions(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  football_id uuid;
  international_id uuid;
  england_id uuid;
  premier_id uuid;
  national_id uuid;
  serie_a_id uuid;
  champions_id uuid;
  club_name text;
BEGIN
  PERFORM public.seed_sports_for_store(target_store_id);
  PERFORM public.seed_all_football_catalog(target_store_id);

  SELECT id INTO football_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id IS NULL AND name = 'Futebol' LIMIT 1;
  IF football_id IS NULL THEN RETURN; END IF;

  SELECT id INTO international_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id = football_id AND name = 'Internacional' LIMIT 1;
  IF international_id IS NULL THEN
    international_id := public.seed_international_node(target_store_id, football_id, 'category', 'Internacional', 20);
  END IF;

  SELECT id INTO england_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id = international_id AND name = 'Inglaterra' LIMIT 1;
  IF england_id IS NULL THEN
    england_id := public.seed_international_node(target_store_id, international_id, 'country', 'Inglaterra', 10);
  END IF;
  premier_id := public.seed_international_node(target_store_id, england_id, 'championship', 'Premier League', 10);

  FOREACH club_name IN ARRAY ARRAY[
    'Arsenal','Aston Villa','Bournemouth','Brentford','Brighton & Hove Albion',
    'Burnley','Chelsea','Crystal Palace','Everton','Fulham','Leeds United',
    'Liverpool','Manchester City','Manchester United','Newcastle United',
    'Nottingham Forest','Sunderland','Tottenham Hotspur','West Ham United',
    'Wolverhampton Wanderers'
  ]::text[] LOOP
    PERFORM public.seed_international_node(target_store_id, premier_id, 'club', club_name, 0, 'Clube inicial editável pelo proprietário.');
  END LOOP;

  SELECT id INTO national_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id = football_id AND name = 'Nacional' LIMIT 1;
  IF national_id IS NULL THEN
    national_id := public.seed_international_node(target_store_id, football_id, 'category', 'Nacional', 10);
  END IF;
  serie_a_id := public.seed_international_node(target_store_id, national_id, 'championship', 'Série A', 10);
  PERFORM public.seed_international_node(target_store_id, serie_a_id, 'club', 'Vasco da Gama', 0, 'Clube inicial editável pelo proprietário.');

  champions_id := public.seed_international_node(target_store_id, international_id, 'championship', 'UEFA Champions League', 120);
  INSERT INTO public.sports_node_competitions (node_id, competition_id)
    SELECT clubs.id, champions_id
    FROM public.sports_nodes clubs
    WHERE clubs.store_id = target_store_id
      AND clubs.node_type = 'club'
      AND clubs.id <> champions_id
    ON CONFLICT DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_football_competitions(uuid) TO authenticated, service_role;

DO $$
DECLARE store_row record;
BEGIN
  FOR store_row IN SELECT id FROM public.stores LOOP
    PERFORM public.repair_football_competitions(store_row.id);
  END LOOP;
END $$;

COMMENT ON FUNCTION public.repair_football_competitions(uuid) IS 'Garante Premier League, Vasco da Gama e vínculo dos clubes cadastrados à Champions League sem duplicação.';
