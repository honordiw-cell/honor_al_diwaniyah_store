-- HONOR AL-DIWANIYAH starter schema
-- Run this in Supabase SQL Editor after creating a project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'staff' check (role in ('admin','staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text default '',
  price bigint not null check (price >= 0),
  image text default '',
  tag text default '',
  stock integer not null default 0 check (stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  governorate text not null,
  district text not null,
  address text not null,
  payment_method text not null check (payment_method in ('cod','online')),
  notes text default '',
  items jsonb not null,
  total bigint not null check (total >= 0),
  status text not null default 'new' check (status in ('new','confirmed','preparing','shipped','completed','cancelled')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','staff')); $$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;

create policy "public can view active products" on public.products
for select using (is_active = true or public.is_staff());
create policy "staff manage products" on public.products
for all using (public.is_staff()) with check (public.is_staff());

-- Customers can submit orders, but anonymous visitors cannot read or edit orders.
create policy "public can create orders" on public.orders
for insert with check (status = 'new');
create policy "staff can read orders" on public.orders
for select using (public.is_staff());
create policy "staff can update orders" on public.orders
for update using (public.is_staff()) with check (public.is_staff());

create policy "users can read own profile" on public.profiles
for select using (id = auth.uid());
create policy "admins manage profiles" on public.profiles
for all using (public.is_admin()) with check (public.is_admin());

-- After creating the first Auth user, add that user as the store admin:
-- insert into public.profiles (id, full_name, role)
-- values ('AUTH-USER-UUID-HERE', 'Store Owner', 'admin');
-- Add employees as role='staff' using their Auth user UUID.
