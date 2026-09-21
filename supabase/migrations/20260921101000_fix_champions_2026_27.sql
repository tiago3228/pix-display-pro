-- Vitrini PRO: correção estrita da UEFA Champions League 2026/27.
-- Remove apenas vínculos incorretos; não exclui clubes nem produtos.

ALTER TABLE public.sports_node_competitions
  ADD COLUMN IF NOT EXISTS season text NOT NULL DEFAULT '2026/27',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Prepara o relacionamento para temporadas futuras, sem transformar a participação
-- em uma propriedade permanente do clube.
ALTER TABLE public.sports_node_competitions
  DROP CONSTRAINT IF EXISTS sports_node_competitions_pkey;
ALTER TABLE public.sports_node_competitions
  ADD CONSTRAINT sports_node_competitions_pkey PRIMARY KEY (node_id, competition_id, season);

CREATE INDEX IF NOT EXISTS sports_node_competitions_season_idx
  ON public.sports_node_competitions(competition_id, season, status);

CREATE OR REPLACE FUNCTION public.repair_champions_2026_27(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  football_id uuid;
  international_id uuid;
  champions_id uuid;
  club_id uuid;
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
  champions_id := public.seed_international_node(target_store_id, international_id, 'championship', 'UEFA Champions League', 120);

  -- Limpa somente a participação desta competição e temporada.
  DELETE FROM public.sports_node_competitions
    WHERE competition_id = champions_id AND season = '2026/27';

  -- Lista oficial fornecida para a fase de liga 2026/27, em ordem alfabética.
  FOREACH club_name IN ARRAY ARRAY[
    'AEK Athens','Arsenal','Aston Villa','Atlético de Madrid','Barcelona',
    'Bayern Munich','Bodø/Glimt','Borussia Dortmund','Club Brugge','Como',
    'Fenerbahçe','Feyenoord','Galatasaray','Inter','LASK','Lens','Lille',
    'Liverpool','Manchester City','Manchester United','Napoli','Paris Saint-Germain',
    'PSV','Real Betis','Real Madrid','Roma','Sabah','Shakhtar Donetsk',
    'Slavia Praha','Slovan Bratislava','Sporting CP','VfB Stuttgart',
    'Villarreal','Viking','RB Leipzig','Porto'
  ]::text[] LOOP
    -- Reutiliza o clube já cadastrado em qualquer liga. Só cria um nó novo
    -- quando o catálogo ainda não possui aquele clube.
    SELECT id INTO club_id FROM public.sports_nodes
      WHERE store_id = target_store_id AND node_type = 'club' AND name = club_name
      ORDER BY id LIMIT 1;
    IF club_id IS NULL THEN
      club_id := public.seed_international_node(target_store_id, champions_id, 'club', club_name, 0, 'Participante UEFA Champions League 2026/27.');
    END IF;
    INSERT INTO public.sports_node_competitions (node_id, competition_id, season, status)
      VALUES (club_id, champions_id, '2026/27', 'active')
      ON CONFLICT (node_id, competition_id, season)
      DO UPDATE SET status = EXCLUDED.status;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_champions_2026_27(uuid) TO authenticated, service_role;

-- Compatibilidade: qualquer chamada antiga passa a executar a regra estrita.
CREATE OR REPLACE FUNCTION public.repair_football_competitions(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.repair_champions_2026_27(target_store_id);
END;
$$;
GRANT EXECUTE ON FUNCTION public.repair_football_competitions(uuid) TO authenticated, service_role;

DO $$
DECLARE store_row record;
BEGIN
  FOR store_row IN SELECT id FROM public.stores LOOP
    PERFORM public.repair_champions_2026_27(store_row.id);
  END LOOP;
END $$;

COMMENT ON TABLE public.sports_node_competitions IS 'Participação explícita de clubes em campeonatos por temporada; não associa clubes automaticamente por país ou cadastro.';
COMMENT ON COLUMN public.sports_node_competitions.season IS 'Temporada da participação, por exemplo 2026/27.';
COMMENT ON COLUMN public.sports_node_competitions.status IS 'Status da participação na competição.';
