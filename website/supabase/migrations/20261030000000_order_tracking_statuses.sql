-- Adds the "packed" and "out_for_delivery" tracking steps.
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in
  ('pending_payment', 'payment_failed', 'placed', 'paid', 'processing', 'packed',
   'shipped', 'out_for_delivery', 'delivered', 'cancelled'));
