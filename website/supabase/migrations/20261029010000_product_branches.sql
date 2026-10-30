-- Products are sold under two branches: Velum Mayilum Branch and Reshmam Branch.
alter table public.products
  add column branch text not null default 'reshmam'
  check (branch in ('velum-mayilum', 'reshmam'));
create index on public.products (branch);
