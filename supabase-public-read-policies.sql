-- HONOR AL-DIWANIYAH: allow the public storefront to read active catalog rows.
-- Safe for the storefront: grants SELECT only; it does not expose orders or profiles.
begin;

grant usage on schema public to anon, authenticated;
grant select on table public.categories, public.products to anon, authenticated;

alter table public.categories enable row level security;
alter table public.products enable row level security;

drop policy if exists "storefront_read_active_categories" on public.categories;
create policy "storefront_read_active_categories"
on public.categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "storefront_read_active_products" on public.products;
create policy "storefront_read_active_products"
on public.products
for select
to anon, authenticated
using (is_active = true);

commit;
