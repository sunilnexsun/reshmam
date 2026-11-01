-- Order integrity: no overselling, and no half-written orders.
--
-- 1. commit_order_stock now locks the variant rows and refuses to go below
--    zero (it used to clamp at 0 silently). Quantities are summed per
--    variant, so an order listing the same variant twice is checked as one.
-- 2. place_order writes the customer, address, order and items (and, for
--    cash on delivery, commits stock) in one transaction: either all of it
--    is saved or none of it is.
-- 3. mark_order_paid marks an order paid and commits its stock in one
--    transaction. A paid order whose stock ran out is still marked paid
--    (the customer has been charged) and flagged with stock_shortfall so
--    staff can follow up.

alter table public.orders add column stock_shortfall boolean not null default false;

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

  -- Lock the variants first (in a fixed order, so concurrent orders can't deadlock),
  -- then read their stock: a second order for the same variant waits here.
  perform 1 from public.product_variants
   where id in (select variant_id from public.order_items where order_id = p_order_id)
   order by id
     for update;

  for item in
    select oi.variant_id, sum(oi.quantity)::int as quantity, v.stock
      from public.order_items oi
      join public.product_variants v on v.id = oi.variant_id
     where oi.order_id = p_order_id
     group by oi.variant_id, v.stock
     order by oi.variant_id
  loop
    if item.stock < item.quantity then
      raise exception 'insufficient_stock:%', item.variant_id
        using detail = format('%s requested, %s in stock', item.quantity, item.stock);
    end if;
    update public.product_variants set stock = stock - item.quantity where id = item.variant_id;
    insert into public.inventory_movements (variant_id, change, reason, order_id)
    values (item.variant_id, -item.quantity, 'order', p_order_id);
  end loop;
end;
$$;
revoke all on function public.commit_order_stock(uuid) from public, anon, authenticated;

-- p_order: order_number, access_token, payment_method, subtotal_inr, shipping_inr, total_inr
-- p_items: [{ variant_id, product_name, variant_label, unit_price_inr, quantity, line_total_inr }]
create or replace function public.place_order(p_customer jsonb, p_address jsonb, p_order jsonb, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer uuid;
  v_address  uuid;
  v_order    uuid;
  v_cod      boolean := p_order->>'payment_method' = 'cod';
begin
  insert into public.customers (name, email, phone)
  values (p_customer->>'name', lower(p_customer->>'email'), p_customer->>'phone')
  returning id into v_customer;

  insert into public.addresses (customer_id, line1, line2, city, state, pincode)
  values (v_customer, p_address->>'line1', p_address->>'line2', p_address->>'city',
          p_address->>'state', p_address->>'pincode')
  returning id into v_address;

  insert into public.orders (order_number, access_token, customer_id, address_id, status, payment_method,
                             payment_status, subtotal_inr, shipping_inr, total_inr)
  values (p_order->>'order_number', p_order->>'access_token', v_customer, v_address,
          case when v_cod then 'placed' else 'pending_payment' end,
          p_order->>'payment_method',
          case when v_cod then 'cod_pending' else 'pending' end,
          (p_order->>'subtotal_inr')::int, (p_order->>'shipping_inr')::int, (p_order->>'total_inr')::int)
  returning id into v_order;

  insert into public.order_items (order_id, variant_id, product_name, variant_label, unit_price_inr, quantity, line_total_inr)
  select v_order, i->>'variant_id', i->>'product_name', i->>'variant_label',
         (i->>'unit_price_inr')::int, (i->>'quantity')::int, (i->>'line_total_inr')::int
    from jsonb_array_elements(p_items) as i;

  if v_cod then
    perform public.commit_order_stock(v_order); -- raises insufficient_stock, which undoes everything above
  end if;
  return v_order;
end;
$$;
revoke all on function public.place_order(jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;

-- Returns true when this call marked the order paid, false when it already was.
create or replace function public.mark_order_paid(p_order_id uuid, p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set status = 'paid', payment_status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
   where id = p_order_id and payment_status <> 'paid';
  if not found then
    return false;
  end if;

  begin
    perform public.commit_order_stock(p_order_id);
  exception when raise_exception then
    if sqlerrm not like 'insufficient_stock:%' then
      raise;
    end if;
    -- Charged but not enough stock: keep the payment, flag the order for staff.
    update public.orders set stock_shortfall = true where id = p_order_id;
  end;
  return true;
end;
$$;
revoke all on function public.mark_order_paid(uuid, text) from public, anon, authenticated;
