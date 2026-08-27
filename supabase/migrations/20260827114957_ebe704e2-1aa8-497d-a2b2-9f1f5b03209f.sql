
INSERT INTO public.stores (id, slug, name, seller_name, description, category, whatsapp, pix_key_type, pix_key, primary_color, welcome_message, onboarding_done, plan)
VALUES
 ('11111111-1111-1111-1111-111111111111','ana-doces','Ana Doces','Ana','Doces artesanais feitos com carinho','Doces','5511999990001','email','ana@email.com','#E0533D','Olá! Seja bem-vindo à minha loja. 😊',true,'free'),
 ('22222222-2222-2222-2222-222222222222','juliana-joias','Juliana Joias','Juliana','Joias e acessórios','Joias e acessórios','5511999990002','email','juliana@email.com','#0F766E','Olá! Seja bem-vinda. ✨',true,'pro'),
 ('33333333-3333-3333-3333-333333333333','carla-moda','Carla Moda','Carla','Moda feminina com preço justo','Roupas','5511999990003','telefone','5511999990003','#1E3A8A','Oi! Confira as novidades. 👗',true,'pro');

INSERT INTO public.products (id, store_id, name, description, price, stock, track_stock, is_available, is_featured, position)
VALUES
 (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','Brigadeiro','Brigadeiro gourmet tradicional',3.00,50,true,true,true,1),
 (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','Brownie Tradicional','Brownie artesanal de chocolate.',6.00,20,true,true,false,2),
 (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','Bolo de pote','Bolo de pote de ninho com morango',8.00,10,true,true,false,3),
 (gen_random_uuid(),'11111111-1111-1111-1111-111111111111','Cookie','Cookie recheado de chocolate',7.00,0,true,true,false,4),
 (gen_random_uuid(),'22222222-2222-2222-2222-222222222222','Brinco Dourado','Brinco banhado a ouro 18k',39.90,1,true,true,true,1),
 (gen_random_uuid(),'22222222-2222-2222-2222-222222222222','Colar Elegance','Colar delicado com pingente',59.90,3,true,true,false,2),
 (gen_random_uuid(),'22222222-2222-2222-2222-222222222222','Pulseira','Pulseira ajustável folheada',29.90,5,true,true,false,3),
 (gen_random_uuid(),'33333333-3333-3333-3333-333333333333','Calça Jeans','Calça jeans skinny',119.90,4,true,true,false,2),
 (gen_random_uuid(),'33333333-3333-3333-3333-333333333333','Vestido','Vestido midi floral',89.90,2,true,true,true,3);

WITH p AS (
  INSERT INTO public.products (store_id, name, description, price, track_stock, is_available, has_variants, position)
  VALUES ('33333333-3333-3333-3333-333333333333','Blusa Feminina','Blusa de viscose confortável',59.90,true,true,true,1)
  RETURNING id
), o1 AS (
  INSERT INTO public.product_options (product_id, name, position) SELECT id,'Tamanho',1 FROM p RETURNING id
), o2 AS (
  INSERT INTO public.product_options (product_id, name, position) SELECT id,'Cor',2 FROM p RETURNING id
), v1 AS (
  INSERT INTO public.product_option_values (option_id, value, position)
  SELECT id, v.value, v.pos FROM o1, (VALUES ('P',1),('M',2),('G',3),('GG',4)) AS v(value,pos) RETURNING id
), v2 AS (
  INSERT INTO public.product_option_values (option_id, value, position)
  SELECT id, v.value, v.pos FROM o2, (VALUES ('Preto',1),('Branco',2),('Azul',3)) AS v(value,pos) RETURNING id
)
INSERT INTO public.product_variants (product_id, label, stock)
SELECT p.id, x.label, x.stock FROM p, (VALUES ('Preto / P',2),('Preto / M',4),('Preto / G',1),('Branco / P',3),('Branco / M',2),('Branco / G',0),('Azul / M',2),('Azul / G',1)) AS x(label,stock);
