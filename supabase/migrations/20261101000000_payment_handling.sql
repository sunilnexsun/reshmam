-- Payment handling: never revive a closed order, record failures, and keep a list of payments
-- that need a person to look at them.
--
-- 1. mark_order_paid only marks orders that are still waiting for payment (pending_payment or
--    payment_failed). A late or replayed "payment captured" for a refunded or cancelled order no longer
--    flips it back to paid; it is recorded in payment_issues instead.
-- 2. A second captured payment on an order that is already paid is recorded as a duplicate (so it can be
--    refunded) instead of being silently ignored.
-- 3. mark_order_failed records a failed online payment, so the customer sees "payment not completed"
--    instead of waiting for a confirmation that will never come. A later successful attempt on the same
--    Razorpay order still marks it paid.

create table public.payment_issues (
  id                  bigint generated always as identity primary key,
  order_id            uuid references public.orders (id) on delete set null,
  razorpay_order_id   text,
  razorpay_payment_id text not null,
  amount_paise        int,
  kind                text not null check (kind in ('duplicate_payment', 'late_payment', 'amount_mismatch', 'unknown_order')),
  created_at          timestamptz not null default now()
);
-- Webhook retries must not add the same issue twice.
create unique index payment_issues_payment_kind on public.payment_issues (razorpay_payment_id, kind);
create index on public.payment_issues (order_id);
-- No policies: only the server (service role) can read or write it.
alter table public.payment_issues enable row level security;

-- Returns true when this call marked the order paid.
create or replace function public.mark_order_paid(p_order_id uuid, p_payment_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    return false;
  end if;

  if v_order.payment_status = 'paid' then
    if v_order.razorpay_payment_id is distinct from p_payment_id then
      insert into public.payment_issues (order_id, razorpay_order_id, razorpay_payment_id, amount_paise, kind)
      values (p_order_id, v_order.razorpay_order_id, p_payment_id, v_order.total_inr * 100, 'duplicate_payment')
      on conflict do nothing;
    end if;
    return false;
  end if;

  if v_order.status not in ('pending_payment', 'payment_failed') or v_order.payment_status not in ('pending', 'failed') then
    -- Refunded, cancelled or otherwise closed: keep the order as it is and flag the money for staff.
    insert into public.payment_issues (order_id, razorpay_order_id, razorpay_payment_id, amount_paise, kind)
    values (p_order_id, v_order.razorpay_order_id, p_payment_id, v_order.total_inr * 100, 'late_payment')
    on conflict do nothing;
    return false;
  end if;

  update public.orders
     set status = 'paid', payment_status = 'paid', razorpay_payment_id = p_payment_id, paid_at = now()
   where id = p_order_id;

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

-- Returns true when this call marked the order's payment as failed.
create or replace function public.mark_order_failed(p_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.orders
     set status = 'payment_failed', payment_status = 'failed'
   where id = p_order_id and status = 'pending_payment' and payment_status = 'pending';
  return found;
end;
$$;
revoke all on function public.mark_order_failed(uuid) from public, anon, authenticated;
