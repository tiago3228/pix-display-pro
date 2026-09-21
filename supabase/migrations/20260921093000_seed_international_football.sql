-- Vitrini PRO: base inicial editável de futebol internacional.
-- Este seed é idempotente: não apaga nem substitui itens já personalizados pelo proprietário.
-- Os dados inseridos são nós normais de sports_nodes e podem ser editados/excluídos no painel.

CREATE TABLE IF NOT EXISTS public.sports_node_competitions (
  node_id uuid NOT NULL REFERENCES public.sports_nodes(id) ON DELETE CASCADE,
  competition_id uuid NOT NULL REFERENCES public.sports_nodes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (node_id, competition_id),
  CHECK (node_id <> competition_id)
);
CREATE INDEX IF NOT EXISTS sports_node_competitions_competition_idx
  ON public.sports_node_competitions(competition_id, node_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sports_node_competitions TO authenticated;
GRANT SELECT ON public.sports_node_competitions TO anon;
GRANT ALL ON public.sports_node_competitions TO service_role;
ALTER TABLE public.sports_node_competitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "owners manage sports competitions on pro" ON public.sports_node_competitions;
CREATE POLICY "owners manage sports competitions on pro" ON public.sports_node_competitions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM public.sports_nodes n
    JOIN public.sports_nodes c ON c.id = competition_id AND c.store_id = n.store_id
    JOIN public.stores s ON s.id = n.store_id
    WHERE n.id = node_id AND s.owner_id = auth.uid() AND s.plan = 'pro'
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.sports_nodes n
    JOIN public.sports_nodes c ON c.id = competition_id AND c.store_id = n.store_id
    JOIN public.stores s ON s.id = n.store_id
    WHERE n.id = node_id AND s.owner_id = auth.uid() AND s.plan = 'pro'
  ));
DROP POLICY IF EXISTS "public reads sports competitions" ON public.sports_node_competitions;
CREATE POLICY "public reads sports competitions" ON public.sports_node_competitions FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.sports_nodes n JOIN public.stores s ON s.id = n.store_id
    WHERE n.id = node_id AND n.is_active AND s.is_active AND s.plan = 'pro'
  ));

CREATE OR REPLACE FUNCTION public.seed_international_node(
  target_store_id uuid,
  target_parent_id uuid,
  target_type text,
  target_name text,
  target_sort integer DEFAULT 0,
  target_description text DEFAULT ''
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE result_id uuid;
BEGIN
  SELECT id INTO result_id FROM public.sports_nodes
    WHERE store_id = target_store_id AND parent_id IS NOT DISTINCT FROM target_parent_id AND name = target_name
    ORDER BY id LIMIT 1;
  IF result_id IS NULL THEN
    INSERT INTO public.sports_nodes (store_id, parent_id, node_type, name, short_name, description, sort_order)
      VALUES (target_store_id, target_parent_id, target_type, target_name, target_name, target_description, target_sort)
      RETURNING id INTO result_id;
  END IF;
  RETURN result_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_international_node(uuid, uuid, text, text, integer, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.seed_international_football(target_store_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  football_id uuid;
  international_id uuid;
  other_countries_id uuid;
  country_id uuid;
  league_id uuid;
  club_name text;
  club_id uuid;
  league_record record;
BEGIN
  PERFORM public.seed_sports_for_store(target_store_id);
  SELECT id INTO football_id FROM public.sports_nodes WHERE store_id = target_store_id AND parent_id IS NULL AND name = 'Futebol' LIMIT 1;
  IF football_id IS NULL THEN RETURN; END IF;
  SELECT id INTO international_id FROM public.sports_nodes WHERE store_id = target_store_id AND parent_id = football_id AND name = 'Internacional' LIMIT 1;
  IF international_id IS NULL THEN
    international_id := public.seed_international_node(target_store_id, football_id, 'category', 'Internacional', 20, 'Futebol internacional, clubes e campeonatos.');
  END IF;
  PERFORM public.seed_international_node(target_store_id, international_id, 'country', 'Inglaterra', 10);
  PERFORM public.seed_international_node(target_store_id, international_id, 'country', 'Espanha', 20);
  PERFORM public.seed_international_node(target_store_id, international_id, 'country', 'Itália', 30);
  PERFORM public.seed_international_node(target_store_id, international_id, 'country', 'França', 40);
  PERFORM public.seed_international_node(target_store_id, international_id, 'country', 'Alemanha', 50);
  PERFORM public.seed_international_node(target_store_id, international_id, 'country', 'Países Baixos', 60);
  PERFORM public.seed_international_node(target_store_id, international_id, 'country', 'Bélgica', 70);
  PERFORM public.seed_international_node(target_store_id, international_id, 'country', 'Argentina', 80);
  PERFORM public.seed_international_node(target_store_id, international_id, 'country', 'Portugal', 90);
  PERFORM public.seed_international_node(target_store_id, international_id, 'country', 'Estados Unidos', 100);
  other_countries_id := public.seed_international_node(target_store_id, international_id, 'category', 'Outros', 110, 'Outros países adicionados pelo proprietário.');
  PERFORM public.seed_international_node(target_store_id, other_countries_id, 'country', 'Rússia', 10);
  PERFORM public.seed_international_node(target_store_id, other_countries_id, 'country', 'Turquia', 20);
  PERFORM public.seed_international_node(target_store_id, other_countries_id, 'country', 'Japão', 30);

  -- Países e ligas principais. Se já existirem, apenas reutiliza os nós.
  FOR league_record IN SELECT * FROM (VALUES
    ('Inglaterra','Premier League',10), ('Espanha','La Liga',20), ('Itália','Serie A',30),
    ('França','Ligue 1',40), ('Alemanha','Bundesliga',50), ('Países Baixos','Eredivisie',60),
    ('Bélgica','Jupiler Pro League',70), ('Estados Unidos','Major League Soccer — MLS',100)
  ) AS leagues(country_name, league_name, sort_order) LOOP
    SELECT id INTO country_id FROM public.sports_nodes WHERE store_id = target_store_id AND parent_id = international_id AND name = league_record.country_name LIMIT 1;
    IF country_id IS NULL THEN
      SELECT id INTO country_id FROM public.sports_nodes WHERE store_id = target_store_id AND parent_id = other_countries_id AND name = league_record.country_name LIMIT 1;
    END IF;
    IF country_id IS NOT NULL THEN
      PERFORM public.seed_international_node(target_store_id, country_id, 'championship', league_record.league_name, league_record.sort_order);
    END IF;
  END LOOP;

  -- Clubes iniciais de ligas novas e listas pedidas. A ordenação padrão é alfabética.
  FOR league_record IN SELECT * FROM (VALUES
    ('Países Baixos','Eredivisie',ARRAY['Ajax','AZ','Feyenoord','PSV','FC Twente']::text[]),
    ('Bélgica','Jupiler Pro League',ARRAY['Anderlecht','Club Brugge','KAA Gent','KRC Genk','Royale Union Saint-Gilloise']::text[]),
    ('Estados Unidos','Major League Soccer — MLS',ARRAY['Atlanta United FC','Inter Miami CF','LA Galaxy','Los Angeles FC','Seattle Sounders FC']::text[]),
    ('Espanha','La Liga',ARRAY['Athletic Club','Atlético de Madrid','Barcelona','Real Madrid','Villarreal']::text[]),
    ('Itália','Serie A',ARRAY['Inter','Juventus','Milan','Napoli','Roma']::text[]),
    ('França','Ligue 1',ARRAY['Lille','Lyon','Marseille','Monaco','Paris Saint-Germain']::text[]),
    ('Alemanha','Bundesliga',ARRAY['Bayern Munich','Bayer Leverkusen','Borussia Dortmund','RB Leipzig','VfB Stuttgart']::text[]),
    ('Argentina','',ARRAY['Boca Juniors','Independiente','Racing Club','River Plate','San Lorenzo']::text[]),
    ('Portugal','',ARRAY['Benfica','Braga','Porto','Sporting CP','Vitória SC']::text[]),
    ('Rússia','',ARRAY['CSKA Moscow','Dynamo Moscow','Krasnodar','Spartak Moscow','Zenit']::text[]),
    ('Turquia','',ARRAY['Beşiktaş','Fenerbahçe','Galatasaray','İstanbul Başakşehir','Trabzonspor']::text[]),
    ('Japão','',ARRAY['Gamba Osaka','Kashima Antlers','Kawasaki Frontale','Urawa Reds','Vissel Kobe']::text[])
  ) AS clubs(country_name, league_name, club_names) LOOP
    SELECT id INTO country_id FROM public.sports_nodes WHERE store_id = target_store_id AND parent_id = international_id AND name = league_record.country_name LIMIT 1;
    IF country_id IS NULL THEN SELECT id INTO country_id FROM public.sports_nodes WHERE store_id = target_store_id AND parent_id = other_countries_id AND name = league_record.country_name LIMIT 1; END IF;
    league_id := country_id;
    IF league_record.league_name <> '' THEN
      SELECT id INTO league_id FROM public.sports_nodes WHERE store_id = target_store_id AND parent_id = country_id AND name = league_record.league_name LIMIT 1;
    END IF;
    IF league_id IS NOT NULL THEN
      FOREACH club_name IN ARRAY league_record.club_names LOOP
        PERFORM public.seed_international_node(target_store_id, league_id, 'club', club_name, 0, 'Clube inicial editável pelo proprietário.');
      END LOOP;
    END IF;
  END LOOP;

  -- A Champions League é um campeonato independente; clubes podem participar sem duplicar nós.
  league_id := public.seed_international_node(target_store_id, international_id, 'championship', 'UEFA Champions League', 120);
  FOR club_name IN SELECT unnest(ARRAY['Real Madrid','Inter','Paris Saint-Germain']) LOOP
    SELECT id INTO club_id FROM public.sports_nodes WHERE store_id = target_store_id AND node_type = 'club' AND name = club_name LIMIT 1;
    IF club_id IS NOT NULL THEN
      INSERT INTO public.sports_node_competitions (node_id, competition_id) VALUES (club_id, league_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END;
$$;
GRANT EXECUTE ON FUNCTION public.seed_international_football(uuid) TO authenticated, service_role;

DO $$
DECLARE store_row record;
BEGIN
  FOR store_row IN SELECT id FROM public.stores LOOP
    PERFORM public.seed_international_football(store_row.id);
  END LOOP;
END $$;

COMMENT ON TABLE public.sports_node_competitions IS 'Relacionamento editável muitos-para-muitos entre clubes e campeonatos, sem duplicar clubes.';
COMMENT ON FUNCTION public.seed_international_football(uuid) IS 'Seed inicial idempotente de futebol internacional; os nós resultantes são editáveis pelo proprietário PRO.';
