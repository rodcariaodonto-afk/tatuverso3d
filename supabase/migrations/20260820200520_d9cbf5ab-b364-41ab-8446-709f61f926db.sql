-- Limpeza de dados de teste/mockup (Onda pós-3D)
delete from public.order_status_history;
delete from public.stock_reservations;
delete from public.inventory_movements;
delete from public.tracking_events;
delete from public.shipments;
delete from public.payments;
delete from public.payment_events;
delete from public.order_items;
delete from public.orders;
delete from public.shipping_quotes;
delete from public.cart_items;
delete from public.carts;
delete from public.quiz_responses;
delete from public.favorites;
delete from public.reviews;

-- Produto de teste E2E e suas dependências
delete from public.variant_option_values
  where variant_id in (select id from public.product_variants where product_id in (select id from public.products where slug = 'cubo-teste-e2e'));
delete from public.product_option_values
  where option_id in (select id from public.product_options where product_id in (select id from public.products where slug = 'cubo-teste-e2e'));
delete from public.product_options where product_id in (select id from public.products where slug = 'cubo-teste-e2e');
delete from public.product_customization_fields where product_id in (select id from public.products where slug = 'cubo-teste-e2e');
delete from public.product_images where product_id in (select id from public.products where slug = 'cubo-teste-e2e');
delete from public.product_categories where product_id in (select id from public.products where slug = 'cubo-teste-e2e');
delete from public.product_sensory_notes where product_id in (select id from public.products where slug = 'cubo-teste-e2e');
delete from public.product_variants where product_id in (select id from public.products where slug = 'cubo-teste-e2e');
delete from public.products where slug = 'cubo-teste-e2e';

-- Conta de teste E2E
delete from public.user_roles where user_id in (select id from auth.users where email like '%@tatuverso3d.test');
delete from public.profiles where id in (select id from auth.users where email like '%@tatuverso3d.test');
delete from auth.users where email like '%@tatuverso3d.test';