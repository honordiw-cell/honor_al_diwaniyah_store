-- HONOR AL-DIWANIYAH: allow anonymous checkout submissions only.
-- Customers can INSERT a new order, but cannot read, update, or delete orders.
begin;

grant usage on schema public to anon, authenticated;
grant insert on table public.orders to anon, authenticated;

alter table public.orders enable row level security;

drop policy if exists "public can create orders" on public.orders;
drop policy if exists "storefront_submit_new_orders" on public.orders;

create policy "storefront_submit_new_orders"
on public.orders
for insert
to anon, authenticated
with check (status = 'new');

commit;
