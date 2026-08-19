-- Storage: customization-uploads (privado, prefixo = auth.uid())
drop policy if exists custom_uploads_own_select on storage.objects;
create policy custom_uploads_own_select on storage.objects for select to authenticated
  using (bucket_id = 'customization-uploads'
    and (public.is_admin(auth.uid()) or (storage.foldername(name))[1] = auth.uid()::text));

drop policy if exists custom_uploads_own_insert on storage.objects;
create policy custom_uploads_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'customization-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists custom_uploads_own_update on storage.objects;
create policy custom_uploads_own_update on storage.objects for update to authenticated
  using (bucket_id = 'customization-uploads' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'customization-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists custom_uploads_own_delete on storage.objects;
create policy custom_uploads_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'customization-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- Storage: product-images (leitura pública, escrita admin)
drop policy if exists product_images_public_select on storage.objects;
create policy product_images_public_select on storage.objects for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists product_images_admin_insert on storage.objects;
create policy product_images_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

drop policy if exists product_images_admin_update on storage.objects;
create policy product_images_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()))
  with check (bucket_id = 'product-images' and public.is_admin(auth.uid()));

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin(auth.uid()));

-- Funções de gatilho não devem ser executáveis pela API pública
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.tg_set_updated_at() from public, anon, authenticated;
revoke execute on function public.tg_order_items_immutability() from public, anon, authenticated;
revoke execute on function public.tg_order_status_history() from public, anon, authenticated;
revoke execute on function public.tg_subscriptions_status_guard() from public, anon, authenticated;
revoke execute on function public.current_cart_session() from anon, authenticated;

-- has_role/is_admin continuam disponíveis para uso dentro das políticas RLS
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_admin(uuid) to authenticated, anon;