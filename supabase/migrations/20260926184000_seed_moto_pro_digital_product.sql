-- Publica o Moto PRO no catálogo público de softwares do Vitrini.
-- A imagem promocional fica hospedada junto aos assets públicos do Vitrini em /moto-pro.png.
-- Pode ser executada novamente: atualiza o produto existente pelo slug.

DO $seed$
DECLARE
  saas_category_id uuid;
  management_category_id uuid;
  other_category_id uuid;
  product_page_url text := 'https://vitrini-br.lovable.app/softwares/moto-pro';
BEGIN
  INSERT INTO public.digital_product_categories (name, slug, sort_order, is_active)
  VALUES ('SaaS', 'saas', 10, true)
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, is_active = true
  RETURNING id INTO saas_category_id;

  INSERT INTO public.digital_product_categories (name, slug, sort_order, is_active)
  VALUES ('Gestão', 'gestao', 20, true)
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, is_active = true
  RETURNING id INTO management_category_id;

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
    'moto-pro',
    'Moto PRO',
    'saas',
    NULL,
    saas_category_id,
    ARRAY[saas_category_id, management_category_id, other_category_id],
    'Organize motos, manutenções, abastecimentos, gastos, documentos e lembretes em um único painel.',
    $moto_pro_description$
O Moto PRO é uma plataforma completa para motociclistas que querem cuidar da moto como um profissional e ter mais controle sobre sua rotina.

Cadastre uma ou mais motocicletas e mantenha marca, modelo, ano, cilindrada, placa, cor, quilometragem e data de aquisição organizados em uma garagem digital.

Acompanhe a saúde da moto, consulte próximas manutenções e registre abastecimentos para entender o consumo médio, os gastos com combustível e o custo por quilômetro.

O painel também reúne despesas, documentos, vencimentos e lembretes, oferecendo uma visão rápida do que precisa de atenção. O Assistente ajuda a organizar informações e acompanhar os registros da motocicleta.

No plano Premium, o Moto PRO oferece busca de peças por modelo e CEP, com anúncios, lojas, localização, comparação de preços e possibilidade de salvar valores nos gastos.

Moto PRO — sua moto, seus gastos e sua manutenção organizados em um só lugar.
    $moto_pro_description$,
    'https://vitrini-br.lovable.app/moto-pro.png',
    'https://vitrini-br.lovable.app/moto-pro.png',
    'https://vitrini-br.lovable.app/moto-pro.png',
    'https://moto-pro-control.lovable.app',
    'Conhecer Moto PRO',
    'Cuide da sua moto como um profissional.',
    'Gestão, manutenção e controle para deixar sua moto sempre em ordem.',
    '#F97316',
    '#0B1117',
    '#0B1117',
    ARRAY[
      'Cadastre e gerencie uma ou mais motocicletas.',
      'Acompanhe a saúde da moto e as próximas manutenções.',
      'Registre abastecimentos, consumo e custo por quilômetro.',
      'Organize gastos, documentos, vencimentos e lembretes.',
      'Use o Assistente para auxiliar no acompanhamento da moto.',
      'Pesquise peças e compare preços no plano Premium.'
    ],
    ARRAY[
      'Tenha sua garagem digital organizada.',
      'Saiba quais itens precisam de atenção antes de esquecer.',
      'Entenda quanto sua moto realmente custa para rodar.',
      'Mantenha documentos e compromissos importantes sob controle.',
      'Acesse uma experiência simples e pensada para motociclistas.'
    ],
    jsonb_build_array(
      jsonb_build_object(
        'name', 'Gratuito',
        'price', 'Gratuito',
        'description', 'Organize sua moto e acompanhe os principais registros do dia a dia.',
        'features', jsonb_build_array(
          'Garagem digital',
          'Manutenções, abastecimentos e gastos',
          'Documentos e lembretes',
          'Painel de saúde da moto'
        ),
        'url', 'https://moto-pro-control.lovable.app'
      ),
      jsonb_build_object(
        'name', 'Premium',
        'price', 'R$ 9,90/mês',
        'description', 'Mais recursos para acompanhar sua moto com ainda mais controle.',
        'features', jsonb_build_array(
          'Busca de peças por modelo e CEP',
          'Mais relatórios e histórico',
          'Funcionalidades exclusivas'
        ),
        'url', 'https://moto-pro-control.lovable.app'
      )
    ),
    jsonb_build_array(
      jsonb_build_object(
        'question', 'O Moto PRO é apenas para registrar manutenções?',
        'answer', 'Não. Além das manutenções, você pode organizar motos, abastecimentos, gastos, documentos, lembretes e acompanhar o custo por quilômetro.'
      ),
      jsonb_build_object(
        'question', 'O Moto PRO funciona no celular?',
        'answer', 'Sim. A plataforma foi pensada para uma experiência simples e prática no celular e no computador.'
      ),
      jsonb_build_object(
        'question', 'O que está disponível no Premium?',
        'answer', 'O plano Premium inclui busca de peças por modelo e CEP, comparação de preços, mais relatórios e funcionalidades exclusivas.'
      )
    ),
    'Moto PRO | Gestão completa da sua moto',
    'Organize manutenções, abastecimentos, gastos, documentos e lembretes da sua motocicleta em um só lugar.',
    true,
    false,
    false,
    true,
    60
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
