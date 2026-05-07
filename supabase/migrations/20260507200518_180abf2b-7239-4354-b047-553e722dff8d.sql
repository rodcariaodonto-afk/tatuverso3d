
-- ============ ENUMS ============
create type public.app_role as enum ('customer', 'producer', 'admin', 'support');
create type public.producer_status as enum ('pending_review', 'active', 'suspended', 'rejected');
create type public.product_status as enum ('draft', 'pending_review', 'active', 'rejected', 'archived');
create type public.order_status as enum ('pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded');
create type public.payment_status as enum ('pending', 'authorized', 'paid', 'failed', 'refunded');
create type public.roast_level as enum ('light', 'medium_light', 'medium', 'medium_dark', 'dark');
create type public.grind_option as enum ('whole_bean', 'espresso', 'moka', 'filter', 'french_press', 'aeropress', 'cold_brew');
create type public.brew_method as enum ('espresso', 'filter', 'french_press', 'aeropress', 'moka', 'cold_brew', 'chemex', 'v60');
create type public.subscription_status as enum ('active', 'paused', 'cancelled', 'pending');

-- ============ HELPER: updated_at ============
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  document text,
  birth_date date,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create trigger trg_profiles_updated before update on public.profiles for each row execute function public.tg_set_updated_at();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict do nothing;
  return new;
end; $$;

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.is_admin(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','support'));
$$;

-- Trigger to create profile/role on signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ PRODUCER PLANS (B2B) ============
create table public.producer_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  monthly_price numeric(10,2) not null default 0,
  commission_rate numeric(5,2) not null default 12.00,
  features jsonb default '[]'::jsonb,
  max_products integer,
  is_featured boolean default false,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.producer_plans enable row level security;
create trigger trg_producer_plans_updated before update on public.producer_plans for each row execute function public.tg_set_updated_at();

-- ============ PRODUCERS ============
create table public.producers (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  story text,
  logo_url text,
  cover_url text,
  country text default 'Brasil',
  state text,
  city text,
  region text,
  document text,
  contact_email text,
  contact_phone text,
  social_links jsonb default '{}'::jsonb,
  certifications text[] default '{}',
  status producer_status not null default 'pending_review',
  plan_id uuid references public.producer_plans(id),
  commission_rate numeric(5,2) default 12.00,
  joined_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.producers enable row level security;
create trigger trg_producers_updated before update on public.producers for each row execute function public.tg_set_updated_at();
create index on public.producers (owner_user_id);
create index on public.producers (status);

-- ============ FARMS ============
create table public.farms (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.producers(id) on delete cascade,
  name text not null,
  region text,
  country text default 'Brasil',
  altitude_meters integer,
  description text,
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.farms enable row level security;
create trigger trg_farms_updated before update on public.farms for each row execute function public.tg_set_updated_at();

-- ============ CATEGORIES ============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  image_url text,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);
alter table public.categories enable row level security;

-- ============ SENSORY NOTES ============
create table public.sensory_notes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  family text,
  created_at timestamptz not null default now()
);
alter table public.sensory_notes enable row level security;

-- ============ PRODUCTS ============
create table public.products (
  id uuid primary key default gen_random_uuid(),
  producer_id uuid not null references public.producers(id) on delete cascade,
  farm_id uuid references public.farms(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price numeric(10,2) not null,
  compare_at_price numeric(10,2),
  stock_quantity integer not null default 0,
  sku text,
  weight_grams integer default 250,
  origin_country text default 'Brasil',
  origin_region text,
  altitude_meters integer,
  variety text,
  process text,
  roast_level roast_level,
  grind_options grind_option[] default '{whole_bean}',
  recommended_brew brew_method[] default '{}',
  tasting_notes_text text,
  acidity smallint check (acidity between 0 and 10),
  body smallint check (body between 0 and 10),
  sweetness smallint check (sweetness between 0 and 10),
  intensity smallint check (intensity between 0 and 10),
  score numeric(4,1),
  roast_date date,
  cover_url text,
  is_featured boolean default false,
  is_subscription_available boolean default false,
  badges text[] default '{}',
  status product_status not null default 'pending_review',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.products enable row level security;
create trigger trg_products_updated before update on public.products for each row execute function public.tg_set_updated_at();
create index on public.products (producer_id);
create index on public.products (status);
create index on public.products (is_featured);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text,
  sort_order integer default 0,
  created_at timestamptz not null default now()
);
alter table public.product_images enable row level security;

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);
alter table public.product_categories enable row level security;

create table public.product_sensory_notes (
  product_id uuid not null references public.products(id) on delete cascade,
  sensory_note_id uuid not null references public.sensory_notes(id) on delete cascade,
  primary key (product_id, sensory_note_id)
);
alter table public.product_sensory_notes enable row level security;

-- ============ ADDRESSES ============
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text,
  recipient text not null,
  postal_code text not null,
  street text not null,
  number text,
  complement text,
  neighborhood text,
  city text not null,
  state text not null,
  country text default 'Brasil',
  phone text,
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.addresses enable row level security;
create trigger trg_addresses_updated before update on public.addresses for each row execute function public.tg_set_updated_at();

-- ============ CARTS / FAVORITES ============
create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.carts enable row level security;
create trigger trg_carts_updated before update on public.carts for each row execute function public.tg_set_updated_at();

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  grind_option grind_option default 'whole_bean',
  created_at timestamptz not null default now()
);
alter table public.cart_items enable row level security;

create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);
alter table public.favorites enable row level security;

-- ============ COUPONS ============
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type text not null check (discount_type in ('percent','fixed')),
  discount_value numeric(10,2) not null,
  min_order_total numeric(10,2) default 0,
  max_uses integer,
  used_count integer default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean default true,
  created_at timestamptz not null default now()
);
alter table public.coupons enable row level security;

-- ============ ORDERS ============
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete restrict,
  status order_status not null default 'pending',
  payment_status payment_status not null default 'pending',
  subtotal numeric(10,2) not null default 0,
  discount_total numeric(10,2) not null default 0,
  shipping_total numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  coupon_id uuid references public.coupons(id),
  shipping_address jsonb,
  payment_provider text,
  payment_reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create trigger trg_orders_updated before update on public.orders for each row execute function public.tg_set_updated_at();
create index on public.orders (customer_id);
create index on public.orders (status);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  producer_id uuid not null references public.producers(id) on delete restrict,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null,
  grind_option grind_option,
  item_status order_status default 'pending',
  created_at timestamptz not null default now()
);
alter table public.order_items enable row level security;
create index on public.order_items (order_id);
create index on public.order_items (producer_id);

-- ============ REVIEWS ============
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text,
  is_approved boolean default true,
  created_at timestamptz not null default now(),
  unique (product_id, customer_id)
);
alter table public.reviews enable row level security;

-- ============ B2C SUBSCRIPTION PLANS ============
create table public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  monthly_price numeric(10,2) not null,
  packages_per_month integer not null default 1,
  cycle text not null default 'monthly',
  features jsonb default '[]'::jsonb,
  is_featured boolean default false,
  sort_order integer default 0,
  is_active boolean default true,
  created_at timestamptz not null default now()
);
alter table public.subscription_plans enable row level security;

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  status subscription_status not null default 'pending',
  preferences jsonb default '{}'::jsonb,
  next_delivery_at timestamptz,
  started_at timestamptz default now(),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
create trigger trg_subscriptions_updated before update on public.subscriptions for each row execute function public.tg_set_updated_at();

-- ============ QUIZ ============
create table public.quiz_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  answers jsonb not null,
  recommended_product_ids uuid[] default '{}',
  created_at timestamptz not null default now()
);
alter table public.quiz_responses enable row level security;

-- ============ BLOG ============
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body text,
  cover_url text,
  category text,
  author_name text,
  status text not null default 'published',
  published_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.blog_posts enable row level security;
create trigger trg_blog_updated before update on public.blog_posts for each row execute function public.tg_set_updated_at();

-- ============ BANNERS ============
create table public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  cta_label text,
  cta_url text,
  image_url text,
  placement text default 'home_hero',
  sort_order integer default 0,
  is_active boolean default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.banners enable row level security;

-- ============ AUDIT / SETTINGS ============
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;

create table public.platform_settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz not null default now()
);
alter table public.platform_settings enable row level security;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
create policy "profiles_select_own_or_admin" on public.profiles for select using (auth.uid() = id or public.is_admin(auth.uid()));
create policy "profiles_insert_self" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_self_or_admin" on public.profiles for update using (auth.uid() = id or public.is_admin(auth.uid()));

-- user_roles: only admins can manage; users can read their own
create policy "user_roles_select_self_or_admin" on public.user_roles for select using (auth.uid() = user_id or public.is_admin(auth.uid()));
create policy "user_roles_admin_write" on public.user_roles for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- producer_plans: public read of active plans; admin manages
create policy "producer_plans_public_read" on public.producer_plans for select using (is_active = true or public.is_admin(auth.uid()));
create policy "producer_plans_admin_write" on public.producer_plans for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- producers: anyone can read active producers; owner can read/update their own; admin all
create policy "producers_public_read_active" on public.producers for select using (status = 'active' or owner_user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "producers_owner_insert" on public.producers for insert with check (owner_user_id = auth.uid());
create policy "producers_owner_update" on public.producers for update using (owner_user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "producers_admin_delete" on public.producers for delete using (public.is_admin(auth.uid()));

-- farms: public read; owner manage
create policy "farms_public_read" on public.farms for select using (true);
create policy "farms_owner_write" on public.farms for all
  using (exists (select 1 from public.producers p where p.id = farms.producer_id and (p.owner_user_id = auth.uid() or public.is_admin(auth.uid()))))
  with check (exists (select 1 from public.producers p where p.id = farms.producer_id and (p.owner_user_id = auth.uid() or public.is_admin(auth.uid()))));

-- categories / sensory_notes: public read; admin write
create policy "categories_public_read" on public.categories for select using (true);
create policy "categories_admin_write" on public.categories for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
create policy "sensory_notes_public_read" on public.sensory_notes for select using (true);
create policy "sensory_notes_admin_write" on public.sensory_notes for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- products: public read of active; producer owner read/write own; admin all
create policy "products_public_read_active" on public.products for select using (
  status = 'active'
  or public.is_admin(auth.uid())
  or exists (select 1 from public.producers p where p.id = products.producer_id and p.owner_user_id = auth.uid())
);
create policy "products_owner_insert" on public.products for insert with check (
  exists (select 1 from public.producers p where p.id = products.producer_id and p.owner_user_id = auth.uid())
  or public.is_admin(auth.uid())
);
create policy "products_owner_update" on public.products for update using (
  exists (select 1 from public.producers p where p.id = products.producer_id and p.owner_user_id = auth.uid())
  or public.is_admin(auth.uid())
);
create policy "products_admin_delete" on public.products for delete using (public.is_admin(auth.uid()));

-- product_images / product_categories / product_sensory_notes: public read; producer owner write
create policy "product_images_public_read" on public.product_images for select using (true);
create policy "product_images_owner_write" on public.product_images for all using (
  exists (select 1 from public.products pr join public.producers p on p.id = pr.producer_id where pr.id = product_images.product_id and (p.owner_user_id = auth.uid() or public.is_admin(auth.uid())))
) with check (
  exists (select 1 from public.products pr join public.producers p on p.id = pr.producer_id where pr.id = product_images.product_id and (p.owner_user_id = auth.uid() or public.is_admin(auth.uid())))
);

create policy "product_categories_public_read" on public.product_categories for select using (true);
create policy "product_categories_owner_write" on public.product_categories for all using (
  exists (select 1 from public.products pr join public.producers p on p.id = pr.producer_id where pr.id = product_categories.product_id and (p.owner_user_id = auth.uid() or public.is_admin(auth.uid())))
) with check (
  exists (select 1 from public.products pr join public.producers p on p.id = pr.producer_id where pr.id = product_categories.product_id and (p.owner_user_id = auth.uid() or public.is_admin(auth.uid())))
);

create policy "product_sensory_notes_public_read" on public.product_sensory_notes for select using (true);
create policy "product_sensory_notes_owner_write" on public.product_sensory_notes for all using (
  exists (select 1 from public.products pr join public.producers p on p.id = pr.producer_id where pr.id = product_sensory_notes.product_id and (p.owner_user_id = auth.uid() or public.is_admin(auth.uid())))
) with check (
  exists (select 1 from public.products pr join public.producers p on p.id = pr.producer_id where pr.id = product_sensory_notes.product_id and (p.owner_user_id = auth.uid() or public.is_admin(auth.uid())))
);

-- addresses
create policy "addresses_owner_all" on public.addresses for all using (user_id = auth.uid() or public.is_admin(auth.uid())) with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- carts / cart_items
create policy "carts_owner_all" on public.carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items_owner_all" on public.cart_items for all using (
  exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.carts c where c.id = cart_items.cart_id and c.user_id = auth.uid())
);

-- favorites
create policy "favorites_owner_all" on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- coupons: public read of active; admin write
create policy "coupons_public_read" on public.coupons for select using (is_active = true or public.is_admin(auth.uid()));
create policy "coupons_admin_write" on public.coupons for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- orders: customer reads own; producer reads orders that contain their items; admin all
create policy "orders_select_customer_or_producer_or_admin" on public.orders for select using (
  customer_id = auth.uid()
  or public.is_admin(auth.uid())
  or exists (
    select 1 from public.order_items oi
    join public.producers p on p.id = oi.producer_id
    where oi.order_id = orders.id and p.owner_user_id = auth.uid()
  )
);
create policy "orders_insert_customer" on public.orders for insert with check (customer_id = auth.uid());
create policy "orders_update_admin" on public.orders for update using (public.is_admin(auth.uid()));

-- order_items: same as orders
create policy "order_items_select" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_items.order_id and (o.customer_id = auth.uid() or public.is_admin(auth.uid())))
  or exists (select 1 from public.producers p where p.id = order_items.producer_id and p.owner_user_id = auth.uid())
);
create policy "order_items_insert_customer" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_items.order_id and o.customer_id = auth.uid())
);
create policy "order_items_update_owner_admin" on public.order_items for update using (
  public.is_admin(auth.uid())
  or exists (select 1 from public.producers p where p.id = order_items.producer_id and p.owner_user_id = auth.uid())
);

-- reviews: public read approved; customer writes own
create policy "reviews_public_read" on public.reviews for select using (is_approved = true or customer_id = auth.uid() or public.is_admin(auth.uid()));
create policy "reviews_customer_insert" on public.reviews for insert with check (customer_id = auth.uid());
create policy "reviews_customer_update" on public.reviews for update using (customer_id = auth.uid() or public.is_admin(auth.uid()));
create policy "reviews_admin_delete" on public.reviews for delete using (public.is_admin(auth.uid()) or customer_id = auth.uid());

-- subscription_plans: public read; admin write
create policy "subscription_plans_public_read" on public.subscription_plans for select using (is_active = true or public.is_admin(auth.uid()));
create policy "subscription_plans_admin_write" on public.subscription_plans for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- subscriptions: customer manages own
create policy "subscriptions_owner_all" on public.subscriptions for all using (customer_id = auth.uid() or public.is_admin(auth.uid())) with check (customer_id = auth.uid() or public.is_admin(auth.uid()));

-- quiz_responses
create policy "quiz_responses_owner_select" on public.quiz_responses for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy "quiz_responses_insert" on public.quiz_responses for insert with check (user_id is null or user_id = auth.uid());

-- blog: public read published; admin write
create policy "blog_public_read_published" on public.blog_posts for select using (status = 'published' or public.is_admin(auth.uid()));
create policy "blog_admin_write" on public.blog_posts for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- banners: public read active; admin write
create policy "banners_public_read" on public.banners for select using (is_active = true or public.is_admin(auth.uid()));
create policy "banners_admin_write" on public.banners for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- audit_logs: admin only
create policy "audit_admin_select" on public.audit_logs for select using (public.is_admin(auth.uid()));
create policy "audit_authenticated_insert" on public.audit_logs for insert with check (auth.uid() is not null);

-- platform_settings: public read; admin write
create policy "settings_public_read" on public.platform_settings for select using (true);
create policy "settings_admin_write" on public.platform_settings for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));
