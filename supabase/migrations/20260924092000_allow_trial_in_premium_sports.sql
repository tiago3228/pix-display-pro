-- O trial PRO deve permitir administrar e publicar o ecossistema esportivo completo.
DROP POLICY IF EXISTS "owners manage sports nodes on pro" ON public.sports_nodes;
CREATE POLICY "owners manage sports nodes on pro" ON public.sports_nodes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)));
DROP POLICY IF EXISTS "public reads active sports nodes" ON public.sports_nodes;
CREATE POLICY "public reads active sports nodes" ON public.sports_nodes FOR SELECT TO anon
  USING (is_active AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active AND public.store_has_pro_access(s.id)));

DROP POLICY IF EXISTS "owners manage sports settings on pro" ON public.sports_settings;
CREATE POLICY "owners manage sports settings on pro" ON public.sports_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)));
DROP POLICY IF EXISTS "public reads active sports settings" ON public.sports_settings;
CREATE POLICY "public reads active sports settings" ON public.sports_settings FOR SELECT TO anon
  USING (enabled AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active AND public.store_has_pro_access(s.id)));

DROP POLICY IF EXISTS "owners manage product sports on pro" ON public.product_sports;
CREATE POLICY "owners manage product sports on pro" ON public.product_sports FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)));
DROP POLICY IF EXISTS "public reads visible product sports" ON public.product_sports;
CREATE POLICY "public reads visible product sports" ON public.product_sports FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p JOIN public.stores s ON s.id = p.store_id WHERE p.id = product_id AND p.is_hidden = false AND s.is_active AND public.store_has_pro_access(s.id)));

DROP POLICY IF EXISTS "owners manage sports collections on pro" ON public.sports_collections;
CREATE POLICY "owners manage sports collections on pro" ON public.sports_collections FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)));
DROP POLICY IF EXISTS "public reads active sports collections" ON public.sports_collections;
CREATE POLICY "public reads active sports collections" ON public.sports_collections FOR SELECT TO anon
  USING (is_active AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.is_active AND public.store_has_pro_access(s.id)));

DROP POLICY IF EXISTS "owners manage sports collection products on pro" ON public.sports_collection_products;
CREATE POLICY "owners manage sports collection products on pro" ON public.sports_collection_products FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sports_collections c JOIN public.stores s ON s.id = c.store_id WHERE c.id = collection_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sports_collections c JOIN public.stores s ON s.id = c.store_id WHERE c.id = collection_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)));
DROP POLICY IF EXISTS "public reads sports collection products" ON public.sports_collection_products;
CREATE POLICY "public reads sports collection products" ON public.sports_collection_products FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.sports_collections c JOIN public.stores s ON s.id = c.store_id WHERE c.id = collection_id AND c.is_active AND s.is_active AND public.store_has_pro_access(s.id)));

DROP POLICY IF EXISTS "owners manage sports competitions on pro" ON public.sports_node_competitions;
CREATE POLICY "owners manage sports competitions on pro" ON public.sports_node_competitions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.sports_nodes n JOIN public.stores s ON s.id = n.store_id WHERE n.id = node_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.sports_nodes n JOIN public.stores s ON s.id = n.store_id WHERE n.id = node_id AND s.owner_id = auth.uid() AND public.store_has_pro_access(s.id)));
DROP POLICY IF EXISTS "public reads sports competitions" ON public.sports_node_competitions;
CREATE POLICY "public reads sports competitions" ON public.sports_node_competitions FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.sports_nodes n JOIN public.stores s ON s.id = n.store_id WHERE n.id = node_id AND n.is_active AND s.is_active AND public.store_has_pro_access(s.id)));
