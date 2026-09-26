-- Publica o LOTOLAB no catálogo público de softwares do Vitrini.
-- A imagem fica hospedada junto aos assets públicos do Vitrini em /lotolab.png.
-- Pode ser executada novamente: atualiza o produto existente pelo slug.

DO $seed$
DECLARE
  saas_category_id uuid;
  productivity_category_id uuid;
  other_category_id uuid;
  product_page_url text := 'https://vitrini-br.lovable.app/softwares/lotolab';
BEGIN
  INSERT INTO public.digital_product_categories (name, slug, sort_order, is_active)
  VALUES ('SaaS', 'saas', 10, true)
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, is_active = true
  RETURNING id INTO saas_category_id;

  INSERT INTO public.digital_product_categories (name, slug, sort_order, is_active)
  VALUES ('Produtividade', 'produtividade', 70, true)
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, is_active = true
  RETURNING id INTO productivity_category_id;

  INSERT INTO public.digital_product_categories (name, slug, sort_order, is_active)
  VALUES ('Outros', 'outros', 80, true)
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, is_active = true
  RETURNING id INTO other_category_id;

  INSERT INTO public.digital_products (
    slug, name, product_type, custom_type_label, category_id, category_ids,
    short_description, description, main_image_path, banner_image_path,
    share_image_path, url, cta_label, banner_title, banner_subtitle,
    primary_color, secondary_color, background_color, features, benefits,
    plans, faqs, seo_title, seo_description, card_clickable, open_new_tab,
    is_featured, is_active, sort_order
  )
  VALUES (
    'lotolab',
    'LOTOLAB',
    'saas',
    NULL,
    saas_category_id,
    ARRAY[saas_category_id, productivity_category_id, other_category_id],
    'Análise, estratégia e simulação para Lotofácil e Mega-Sena com estatísticas, filtros e geração organizada de jogos.',
    $lotolab_description$
O LOTOLAB é uma plataforma para analisar resultados históricos de loterias, explorar estatísticas e montar jogos de forma organizada.

Com suporte a Lotofácil e Mega-Sena, reúne análise estatística, gerador de combinações, laboratório de estratégias, score de equilíbrio, fechamentos, simulador histórico e conferência de jogos.

O usuário pode trabalhar com dezenas frequentes, atrasadas e menos frequentes, pares e ímpares, soma, distribuição, números consecutivos, repetições e filtros personalizados. As estratégias podem ser testadas em concursos anteriores por meio de back-tests descritivos.

O LOTOLAB utiliza dados históricos e critérios matemáticos para auxiliar na análise e organização das combinações. Estatísticas históricas não permitem prever resultados futuros, e a plataforma não promete premiação nem aumento das chances de ganhar.

LOTOLAB — transforme dados históricos em análise, estratégia e organização.
    $lotolab_description$,
    'https://vitrini-br.lovable.app/lotolab.png',
    'https://vitrini-br.lovable.app/lotolab.png',
    'https://vitrini-br.lovable.app/lotolab.png',
    product_page_url,
    'Conhecer LOTOLAB',
    'Transforme dados históricos em estratégia e organização.',
    'Analise resultados, teste estratégias e organize seus jogos com mais informação.',
    '#A855F7',
    '#08051F',
    '#0B0825',
    ARRAY[
      'Analise dezenas frequentes, atrasadas e menos frequentes.',
      'Gere jogos com dezenas fixas, excluídas e filtros personalizados.',
      'Monte estratégias com pares, soma, consecutivos e distribuição.',
      'Receba um score de equilíbrio de 0 a 100 para cada combinação.',
      'Teste estratégias em concursos anteriores com simulação histórica.',
      'Organize, salve e confira seus jogos e resultados.'
    ],
    ARRAY[
      'Tenha estatísticas históricas organizadas em gráficos e indicadores.',
      'Compare estratégias antes de usar uma combinação.',
      'Monte jogos de forma mais estruturada e personalizada.',
      'Acompanhe Lotofácil e Mega-Sena em uma interface responsiva.'
    ],
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'question', 'O LOTOLAB prevê os resultados das loterias?',
        'answer', 'Não. A plataforma usa dados históricos, estatísticas e simulações descritivas para auxiliar na análise e organização dos jogos, sem prever resultados futuros.'
      ),
      jsonb_build_object(
        'question', 'Quais modalidades estão disponíveis?',
        'answer', 'Atualmente, o LOTOLAB trabalha com Lotofácil e Mega-Sena.'
      )
    ),
    'LOTOLAB | Análise, estratégia e simulação para loterias',
    'Analise resultados históricos, crie estratégias e organize jogos para Lotofácil e Mega-Sena.',
    true,
    false,
    true,
    true,
    50
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    product_type = EXCLUDED.product_type,
    custom_type_label = EXCLUDED.custom_type_label,
    category_id = EXCLUDED.category_id,
    category_ids = EXCLUDED.category_ids,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description,
    main_image_path = EXCLUDED.main_image_path,
    banner_image_path = EXCLUDED.banner_image_path,
    share_image_path = EXCLUDED.share_image_path,
    url = EXCLUDED.url,
    cta_label = EXCLUDED.cta_label,
    banner_title = EXCLUDED.banner_title,
    banner_subtitle = EXCLUDED.banner_subtitle,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    background_color = EXCLUDED.background_color,
    features = EXCLUDED.features,
    benefits = EXCLUDED.benefits,
    plans = EXCLUDED.plans,
    faqs = EXCLUDED.faqs,
    seo_title = EXCLUDED.seo_title,
    seo_description = EXCLUDED.seo_description,
    card_clickable = EXCLUDED.card_clickable,
    open_new_tab = EXCLUDED.open_new_tab,
    is_featured = EXCLUDED.is_featured,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
END
$seed$;
