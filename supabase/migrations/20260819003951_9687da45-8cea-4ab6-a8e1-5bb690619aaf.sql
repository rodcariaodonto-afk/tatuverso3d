-- 1) COST_PRICE: grants por coluna em product_variants
REVOKE ALL ON TABLE public.product_variants FROM anon, authenticated;

GRANT SELECT (
  id, product_id, weight_grams, grind_option, price, compare_at_price, sku,
  stock_quantity, is_default, created_at, updated_at, name, barcode,
  reserved_quantity, low_stock_threshold, dimensions_text, image_url,
  is_active, sort_order
) ON public.product_variants TO anon, authenticated;

GRANT INSERT (
  id, product_id, weight_grams, grind_option, price, compare_at_price, sku,
  stock_quantity, is_default, created_at, updated_at, name, barcode,
  reserved_quantity, low_stock_threshold, dimensions_text, image_url,
  is_active, sort_order
) ON public.product_variants TO authenticated;

GRANT UPDATE (
  product_id, weight_grams, grind_option, price, compare_at_price, sku,
  stock_quantity, updated_at, name, barcode, is_default,
  reserved_quantity, low_stock_threshold, dimensions_text, image_url,
  is_active, sort_order
) ON public.product_variants TO authenticated;

GRANT DELETE ON public.product_variants TO authenticated;
GRANT ALL ON public.product_variants TO service_role;

-- 2) SKU único em products e product_variants (ignora nulos/vazios) + checagem cruzada
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_unique_idx
  ON public.products (lower(btrim(sku))) WHERE sku IS NOT NULL AND btrim(sku) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS product_variants_sku_unique_idx
  ON public.product_variants (lower(btrim(sku))) WHERE sku IS NOT NULL AND btrim(sku) <> '';

CREATE OR REPLACE FUNCTION public.tg_sku_cross_unique()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_sku text := nullif(btrim(new.sku), '');
begin
  if v_sku is null then return new; end if;

  if tg_table_name = 'products' then
    if exists (
      select 1 from public.product_variants
      where sku is not null and lower(btrim(sku)) = lower(v_sku)
    ) then
      raise exception 'SKU % já está em uso por uma variação de produto', v_sku
        using errcode = 'unique_violation';
    end if;
  else
    if exists (
      select 1 from public.products
      where sku is not null and lower(btrim(sku)) = lower(v_sku)
    ) then
      raise exception 'SKU % já está em uso por um produto', v_sku
        using errcode = 'unique_violation';
    end if;
  end if;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS products_sku_cross_unique ON public.products;
CREATE TRIGGER products_sku_cross_unique
  BEFORE INSERT OR UPDATE OF sku ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.tg_sku_cross_unique();

DROP TRIGGER IF EXISTS product_variants_sku_cross_unique ON public.product_variants;
CREATE TRIGGER product_variants_sku_cross_unique
  BEFORE INSERT OR UPDATE OF sku ON public.product_variants
  FOR EACH ROW EXECUTE FUNCTION public.tg_sku_cross_unique();

-- 3) Políticas de storage idempotentes (buckets customization-uploads / product-images)
DROP POLICY IF EXISTS custom_uploads_own_select ON storage.objects;
CREATE POLICY custom_uploads_own_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'customization-uploads'
    AND (public.is_admin(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text)
  );

DROP POLICY IF EXISTS custom_uploads_own_insert ON storage.objects;
CREATE POLICY custom_uploads_own_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'customization-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) = ANY (ARRAY['png','jpg','jpeg','webp','pdf','stl'])
  );

DROP POLICY IF EXISTS custom_uploads_own_update ON storage.objects;
CREATE POLICY custom_uploads_own_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'customization-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'customization-uploads'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND lower(storage.extension(name)) = ANY (ARRAY['png','jpg','jpeg','webp','pdf','stl'])
  );

DROP POLICY IF EXISTS custom_uploads_own_delete ON storage.objects;
CREATE POLICY custom_uploads_own_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'customization-uploads'
    AND (public.is_admin(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text)
  );

DROP POLICY IF EXISTS product_images_public_select ON storage.objects;
CREATE POLICY product_images_public_select ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');
