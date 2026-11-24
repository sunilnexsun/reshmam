/**
 * A small catalogue for the database tests. Products now live in Firestore, so supabase/seed.sql no longer
 * inserts any; the tests add the rows they need after applying the migrations and seed.
 */
export const TEST_CATALOGUE_SQL = `
  insert into public.categories (slug, name, description, sort_order) values
    ('gingelly-oil', 'Gingelly Oil', '', 0), ('coconut-oil', 'Coconut Oil', '', 1)
    on conflict (slug) do nothing;
  insert into public.products (slug, name, short_name, category_slug, kind, branch, edible, summary, image) values
    ('gingelly-oil', 'Test Gingelly Oil', 'Gingelly Oil', 'gingelly-oil', 'single', 'reshmam', true, '', ''),
    ('coconut-oil', 'Test Coconut Oil', 'Coconut Oil', 'coconut-oil', 'single', 'reshmam', true, '', '')
    on conflict (slug) do nothing;
  insert into public.product_variants (id, product_slug, label, price_inr, stock, sort_order) values
    ('GIN-1L', 'gingelly-oil', '1 L', 600, 5, 0), ('COC-1L', 'coconut-oil', '1 L', 580, 5, 0)
    on conflict (id) do nothing;
`;
