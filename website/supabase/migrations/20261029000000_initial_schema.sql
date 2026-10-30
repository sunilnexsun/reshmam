-- RESHMAM Natural Goodness — initial schema
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- All tables have Row Level Security enabled. The storefront server uses the
-- service-role key (server-only) for orders and enquiries; the browser uses
-- the anon key only for public catalogue/blog reads and the signed-in user's
-- own wishlist and cart.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- catalogue
create table public.categories (
  slug        text primary key,
  name        text not null,
  description text,
  sort_order  int  not null default 0
);

create table public.products (
  slug          text primary key,
  name          text not null,
  short_name    text not null,
  category_slug text not null references public.categories (slug),
  kind          text not null check (kind in ('single', 'pack', 'combo')),
  edible        boolean not null default true,
  summary       text,
  image         text,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- Variants carry price and live inventory (stock).
create table public.product_variants (
  id           text primary key,                 -- SKU, e.g. GIN-1L
  product_slug text not null references public.products (slug) on delete cascade,
  label        text not null,                     -- "1 L", "500 ml x 4"
  price_inr    int  not null check (price_inr > 0),
  stock        int  not null default 0 check (stock >= 0),
  active       boolean not null default true,
  sort_order   int  not null default 0
);
create index on public.product_variants (product_slug);

-- Audit trail for every stock change.
create table public.inventory_movements (
  id          bigint generated always as identity primary key,
  variant_id  text not null references public.product_variants (id),
  change      int  not null,
  reason      text not null,                      -- 'order', 'restock', 'adjustment'
  order_id    uuid,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- customers
create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users (id) on delete set null,
  name         text not null,
  email        text not null,
  phone        text,
  created_at   timestamptz not null default now()
);
create index on public.customers (email);
create index on public.customers (auth_user_id);

create table public.addresses (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  line1       text not null,
  line2       text,
  city        text not null,
  state       text not null,
  pincode     text not null check (pincode ~ '^[0-9]{6}$'),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------- orders
create table public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text not null unique,
  access_token        text not null,               -- unguessable token for the confirmation link
  customer_id         uuid not null references public.customers (id),
  address_id          uuid not null references public.addresses (id),
  status              text not null default 'pending_payment' check (status in
                        ('pending_payment', 'payment_failed', 'placed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')),
  payment_method      text not null check (payment_method in ('online', 'cod')),
  payment_status      text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'cod_pending', 'refunded')),
  subtotal_inr        int  not null,
  shipping_inr        int  not null,
  total_inr           int  not null,
  razorpay_order_id   text unique,
  razorpay_payment_id text,
  stock_committed     boolean not null default false,
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);
create index on public.orders (customer_id);

create table public.order_items (
  id             bigint generated always as identity primary key,
  order_id       uuid not null references public.orders (id) on delete cascade,
  variant_id     text not null references public.product_variants (id),
  product_name   text not null,
  variant_label  text not null,
  unit_price_inr int  not null,
  quantity       int  not null check (quantity > 0),
  line_total_inr int  not null
);
create index on public.order_items (order_id);

-- Decrements stock for an order exactly once (called by the server after
-- a COD order is placed or an online payment is verified).
create or replace function public.commit_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item record;
begin
  update public.orders set stock_committed = true
   where id = p_order_id and stock_committed = false;
  if not found then
    return; -- already committed (idempotent)
  end if;

  for item in select variant_id, quantity from public.order_items where order_id = p_order_id loop
    update public.product_variants
       set stock = greatest(stock - item.quantity, 0)
     where id = item.variant_id;
    insert into public.inventory_movements (variant_id, change, reason, order_id)
    values (item.variant_id, -item.quantity, 'order', p_order_id);
  end loop;
end;
$$;
revoke all on function public.commit_order_stock(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- shopper data
create table public.wishlists (
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  product_slug text not null references public.products (slug) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (auth_user_id, product_slug)
);

-- Server-side cart for signed-in users (guests keep their cart in the browser).
create table public.carts (
  auth_user_id uuid primary key references auth.users (id) on delete cascade,
  items        jsonb not null default '[]'::jsonb,    -- [{ "variantId": "...", "quantity": n }]
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- enquiries
create table public.contact_enquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  subject    text not null,
  message    text not null,
  status     text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at timestamptz not null default now()
);

create table public.bulk_enquiries (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  email              text not null,
  phone              text,
  enquiry_type       text not null check (enquiry_type in ('bulk-orders', 'retail-partnership')),
  business_name      text,
  estimated_quantity text,
  message            text not null,
  status             text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------- blog
create table public.blog_articles (
  slug         text primary key,
  title        text not null,
  category     text not null,
  excerpt      text,
  body         jsonb not null default '[]'::jsonb,
  image        text,
  image_alt    text,
  is_sample    boolean not null default false,
  published    boolean not null default false,
  published_at date,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- RLS
alter table public.categories          enable row level security;
alter table public.products            enable row level security;
alter table public.product_variants    enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.customers           enable row level security;
alter table public.addresses           enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.wishlists           enable row level security;
alter table public.carts               enable row level security;
alter table public.contact_enquiries   enable row level security;
alter table public.bulk_enquiries      enable row level security;
alter table public.blog_articles       enable row level security;

-- Public, read-only catalogue and published blog posts.
create policy "catalogue readable" on public.categories for select using (true);
create policy "active products readable" on public.products for select using (active);
create policy "active variants readable" on public.product_variants for select using (active);
create policy "published posts readable" on public.blog_articles for select using (published);

-- Signed-in shoppers manage only their own wishlist and cart.
create policy "own wishlist" on public.wishlists for all
  using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);
create policy "own cart" on public.carts for all
  using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

-- Signed-in customers may read their own customer record, addresses and orders.
create policy "own customer record" on public.customers for select using (auth.uid() = auth_user_id);
create policy "own addresses" on public.addresses for select
  using (exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = auth.uid()));
create policy "own orders" on public.orders for select
  using (exists (select 1 from public.customers c where c.id = customer_id and c.auth_user_id = auth.uid()));
create policy "own order items" on public.order_items for select
  using (exists (
    select 1 from public.orders o join public.customers c on c.id = o.customer_id
    where o.id = order_id and c.auth_user_id = auth.uid()));

-- No anon/authenticated policies on enquiries or inventory_movements:
-- only the server (service role, which bypasses RLS) can read or write them.
