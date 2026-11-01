-- Indexes on foreign keys and lookup columns that row-level-security policies, joins and the admin's stock
-- and order reports scan. (orders.customer_id and order_items.order_id are indexed in the initial schema.)
create index if not exists addresses_customer_id_idx on public.addresses (customer_id);
create index if not exists orders_address_id_idx on public.orders (address_id);
create index if not exists order_items_variant_id_idx on public.order_items (variant_id);
create index if not exists inventory_movements_variant_id_idx on public.inventory_movements (variant_id);
create index if not exists inventory_movements_order_id_idx on public.inventory_movements (order_id);
