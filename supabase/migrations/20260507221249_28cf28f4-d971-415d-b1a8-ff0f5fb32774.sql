-- PART 1: Seed Cafezeira producer
insert into public.producers (
  owner_user_id, name, slug, description, story, country,
  status, commission_rate, joined_at
)
values (
  null,
  'Cafezeira',
  'cafezeira',
  'Cafés especiais selecionados, torrefação artesanal e curadoria sensorial.',
  'A Cafezeira nasceu para conectar amantes de café com microlotes excepcionais de fazendas latino-americanas.',
  'Brasil',
  'active',
  0.00,
  now()
)
on conflict (slug) do nothing;

-- PART 2: Allow anonymous carts
alter table public.carts alter column user_id drop not null;
alter table public.carts add column if not exists session_token text;
create unique index if not exists carts_session_token_unique
  on public.carts (session_token)
  where session_token is not null;

create or replace function public.current_cart_session()
returns text
language sql
stable
as $$
  select nullif(current_setting('request.headers', true)::json->>'x-cart-session', '');
$$;

drop policy if exists "carts_owner_all" on public.carts;
create policy "carts_owner_or_anon"
  on public.carts
  for all
  using (
    (user_id is not null and user_id = auth.uid())
    or (user_id is null and session_token is not null and session_token = public.current_cart_session())
  )
  with check (
    (user_id is not null and user_id = auth.uid())
    or (user_id is null and session_token is not null and session_token = public.current_cart_session())
  );

drop policy if exists "cart_items_owner_all" on public.cart_items;
create policy "cart_items_owner_or_anon"
  on public.cart_items
  for all
  using (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and (
          (c.user_id is not null and c.user_id = auth.uid())
          or (c.user_id is null and c.session_token is not null and c.session_token = public.current_cart_session())
        )
    )
  )
  with check (
    exists (
      select 1 from public.carts c
      where c.id = cart_items.cart_id
        and (
          (c.user_id is not null and c.user_id = auth.uid())
          or (c.user_id is null and c.session_token is not null and c.session_token = public.current_cart_session())
        )
    )
  );

-- PART 9: product-images bucket
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_public_read" on storage.objects;
create policy "product_images_public_read"
  on storage.objects
  for select
  using (bucket_id = 'product-images');

drop policy if exists "product_images_admin_owner_insert" on storage.objects;
create policy "product_images_admin_owner_insert"
  on storage.objects
  for insert
  with check (
    bucket_id = 'product-images'
    and (
      public.is_admin(auth.uid())
      or (storage.foldername(storage.objects.name))[1] in (
        select pr.id::text
        from public.products pr
        join public.producers p on p.id = pr.producer_id
        where p.owner_user_id = auth.uid()
      )
    )
  );

drop policy if exists "product_images_admin_owner_update" on storage.objects;
create policy "product_images_admin_owner_update"
  on storage.objects
  for update
  using (
    bucket_id = 'product-images'
    and (
      public.is_admin(auth.uid())
      or (storage.foldername(storage.objects.name))[1] in (
        select pr.id::text
        from public.products pr
        join public.producers p on p.id = pr.producer_id
        where p.owner_user_id = auth.uid()
      )
    )
  );

drop policy if exists "product_images_admin_owner_delete" on storage.objects;
create policy "product_images_admin_owner_delete"
  on storage.objects
  for delete
  using (
    bucket_id = 'product-images'
    and (
      public.is_admin(auth.uid())
      or (storage.foldername(storage.objects.name))[1] in (
        select pr.id::text
        from public.products pr
        join public.producers p on p.id = pr.producer_id
        where p.owner_user_id = auth.uid()
      )
    )
  );
