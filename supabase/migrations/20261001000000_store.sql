-- Zam's Beauty catalogue, orders, and private order details.
create extension if not exists pgcrypto;

create table if not exists public.products (
  id text primary key,
  name text not null,
  category text not null,
  description text not null default '',
  price_ngn integer not null check (price_ngn > 0),
  image_url text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  phone text not null,
  address text not null,
  city text not null,
  note text not null default '',
  subtotal_ngn integer not null check (subtotal_ngn > 0),
  delivery_ngn integer not null check (delivery_ngn >= 0),
  total_ngn integer not null check (total_ngn = subtotal_ngn + delivery_ngn),
  status text not null default 'received' check (status in ('received','confirmed','dispatched','delivered','cancelled')),
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed')),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  quantity integer not null check (quantity between 1 and 50),
  unit_price_ngn integer not null check (unit_price_ngn > 0),
  line_total_ngn integer generated always as (quantity * unit_price_ngn) stored
);

create table if not exists public.newsletter_subscribers (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create table if not exists public.cart_snapshots (
  id uuid primary key,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.cart_snapshots enable row level security;

drop policy if exists "Anyone can see active products" on public.products;
create policy "Anyone can see active products" on public.products for select using (active = true);
-- Customers never read or write orders directly; the server-only edge function
-- uses the service role after validating the order against the active catalogue.
revoke all on public.orders from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.newsletter_subscribers from anon, authenticated;
revoke all on public.cart_snapshots from anon, authenticated;
grant select on public.products to anon, authenticated;

insert into public.products (id,name,category,description,price_ngn,image_url) values
('01','Cloud Skin Tint','Skin','Lightweight, dewy everyday skin tint.',14500,'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd'),
('02','Soft Focus Lip Oil','Lips','A comfortable, non-sticky rosewater lip oil.',9800,'https://images.unsplash.com/photo-1586495777744-4413f21062fa'),
('03','Sunday Ritual Cleanser','Skin','A gentle, creamy daily cleanser.',12500,'https://images.unsplash.com/photo-1556228720-195a672e8a03'),
('04','Daylight Cream Blush','Cheeks','A buildable, soft-flush cream blush.',11000,'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9'),
('05','Silk Veil SPF 30','Skin','Everyday SPF 30 designed to leave no white cast.',18500,'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8'),
('06','The Good Brow Pencil','Eyes','An easy-to-use pencil for natural-looking brows.',8500,'https://images.unsplash.com/photo-1512496015851-a90fb38ba796')
on conflict (id) do update set name=excluded.name,category=excluded.category,description=excluded.description,price_ngn=excluded.price_ngn,image_url=excluded.image_url;
