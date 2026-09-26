-- Publica o CEU Finanças no catálogo público sem imagem inicial.
-- Pode ser executada novamente: atualiza o produto existente pelo slug.
ALTER TABLE public.digital_products
  ADD COLUMN IF NOT EXISTS category_ids uuid[] NOT NULL DEFAULT '{}';

UPDATE public.digital_products
SET category_ids = ARRAY[category_id]
WHERE category_id IS NOT NULL
  AND cardinality(category_ids) = 0;

CREATE INDEX IF NOT EXISTS digital_products_category_ids_gin_idx
  ON public.digital_products USING gin (category_ids);

DO $seed$
DECLARE
  finance_category_id uuid;
BEGIN
  INSERT INTO public.digital_product_categories (name, slug, sort_order, is_active)
  VALUES ('Finanças', 'financas', 40, true)
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name,
        is_active = true
  RETURNING id INTO finance_category_id;

  INSERT INTO public.digital_products (
    slug,
    name,
    product_type,
    custom_type_label,
    category_id,
    category_ids,
    short_description,
    description,
    url,
    cta_label,
    banner_title,
    banner_subtitle,
    primary_color,
    secondary_color,
    background_color,
    features,
    benefits,
    plans,
    faqs,
    seo_title,
    seo_description,
    card_clickable,
    open_new_tab,
    is_featured,
    is_active,
    sort_order
  )
  VALUES (
    'ceu-financas',
    'CEU Finanças',
    'saas',
    NULL,
    finance_category_id,
    ARRAY[finance_category_id],
    'Plataforma gratuita para organizar receitas, despesas, parcelamentos e investimentos, com gráficos e recursos informativos de análise.',
    $ceu_description$
Sua vida financeira organizada em um só lugar. 💰

O CEU Finanças é uma plataforma gratuita criada para ajudar você a organizar, acompanhar e entender melhor sua vida financeira de forma simples e intuitiva.

Tenha uma visão completa das suas receitas, despesas, saldo e movimentações. Acompanhe seus gastos por gráficos e indicadores e descubra para onde seu dinheiro está indo.

CONTROLE FINANCEIRO
Registre entradas e saídas, organize movimentações por categorias e acompanhe sua evolução financeira em um painel simples de entender. Consulte indicadores, gráficos de despesas e informações do período para tomar decisões com mais clareza.

MOVIMENTAÇÕES E PARCELAMENTOS
Mantenha o histórico financeiro organizado e acompanhe receitas e despesas em um só lugar. O sistema também permite trabalhar com parcelamentos para facilitar o controle de compras e compromissos financeiros.

INVESTIMENTOS
Use a área de investimentos para acompanhar sua evolução e organizar objetivos. O CEU Finanças também oferece recursos de análise e informações sobre investimentos, além de conteúdos educativos sobre o mercado.

DÓLAR E RECURSOS INTELIGENTES
Consulte informações relacionadas ao dólar e use dados atualizados como apoio para acompanhar investimentos e entender o cenário financeiro. Recursos de inteligência artificial podem auxiliar na análise de investimentos, com informações e insights para ajudar a compreender os dados.

SIMPLES, MODERNO E ACESSÍVEL
Acesse pelo computador ou celular e mantenha suas informações financeiras organizadas em uma interface moderna e intuitiva.

GRATUITO
O CEU Finanças é gratuito e permite organizar sua vida financeira sem mensalidade para usar seus principais recursos.

Organize suas finanças. Entenda seus gastos. Acompanhe seus investimentos. Tome decisões com mais informação.

As informações apresentadas têm caráter educativo e informativo e não constituem recomendação de investimento.

CEU Finanças — Seu dinheiro. Sua organização. Seu controle.
$ceu_description$,
    'https://fin-wise-lite.lovable.app/',
    'Acessar CEU Finanças',
    'Seu dinheiro. Sua organização. Seu controle.',
    'Sua vida financeira organizada em um só lugar — gratuitamente.',
    '#0F766E',
    '#0F172A',
    '#F8FAFC',
    ARRAY[
      'Controle receitas, despesas, saldo e movimentações.',
      'Organize lançamentos por categorias e acompanhe gráficos e indicadores.',
      'Gerencie parcelamentos, compras e compromissos financeiros.',
      'Acompanhe investimentos e organize seus objetivos.',
      'Consulte informações sobre o dólar e conteúdos educativos.',
      'Use recursos inteligentes como apoio informativo para analisar investimentos.',
      'Acesse pelo computador ou celular.',
      'Use os principais recursos sem mensalidade.'
    ],
    ARRAY[
      'Tenha suas receitas e despesas em um só lugar.',
      'Entenda melhor para onde seu dinheiro está indo.',
      'Acompanhe sua evolução financeira com gráficos e indicadores.',
      'Organize investimentos e objetivos com mais informação.',
      'Plataforma gratuita e acessível pelo computador ou celular.'
    ],
    jsonb_build_array(
      jsonb_build_object(
        'name', 'Gratuito',
        'price', 'Gratuito',
        'description', 'Organize sua vida financeira sem mensalidade para usar os principais recursos.',
        'features', jsonb_build_array(
          'Controle de receitas e despesas',
          'Gráficos, indicadores e parcelamentos',
          'Área de investimentos e informações sobre o dólar',
          'Acesso pelo computador e celular'
        ),
        'url', 'https://fin-wise-lite.lovable.app/'
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'question', 'As informações de investimento são recomendações?',
        'answer', 'Não. As informações apresentadas têm caráter educativo e informativo e não constituem recomendação de investimento.'
      )
    ),
    'CEU Finanças | Organize sua vida financeira gratuitamente',
    'Organize receitas, despesas, parcelamentos e investimentos com gráficos, indicadores e recursos informativos gratuitos.',
    true,
    true,
    true,
    true,
    40
  )
  ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    product_type = EXCLUDED.product_type,
    custom_type_label = EXCLUDED.custom_type_label,
    category_id = EXCLUDED.category_id,
    category_ids = EXCLUDED.category_ids,
    short_description = EXCLUDED.short_description,
    description = EXCLUDED.description,
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
