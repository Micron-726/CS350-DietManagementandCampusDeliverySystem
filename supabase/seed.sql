-- Demo catalog data, loaded by `supabase db reset` (see [db.seed] in config.toml).
-- All providers, restaurants and menus are fictional. Coordinates are approximate points on
-- the KAIST main campus so distance search (FR-22) has something to work with.
--
-- The data is chosen to exercise the SRS:
--   * IR-05 / OR-03: a mix of provider / estimated / unavailable nutrition values
--   * FR-29: components with 2+ portion levels (slider) and with a single level (no slider)
--   * FR-37: one provider that does not support ordering
-- Portion deltas are relative to the menu item's base values (FR-31).

-- ───────────────────────────── Providers ─────────────────────────────
insert into public.providers (id, code, name, kind, supports_ordering, supports_delivery) values
  ('10000000-0000-4000-8000-000000000001', 'demo_cafeteria', 'Campus Cafeteria (demo)', 'restaurant', false, false),
  ('10000000-0000-4000-8000-000000000002', 'demo_delivery',  'Campus Delivery (demo)',  'delivery',   true,  true);

-- ───────────────────────────── Restaurants ─────────────────────────────
insert into public.restaurants (id, provider_id, external_id, name, campus_area, lat, lng, accepting_orders) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'caf-n11', 'N11 Cafeteria',    'N11', 36.3740, 127.3592, false),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'del-w2',  'W2 Bowl House',    'W2',  36.3679, 127.3607, true),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'del-e5',  'E5 Grill & Salad', 'E5',  36.3688, 127.3637, true),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', 'del-n13', 'N13 Snack Bar',    'N13', 36.3735, 127.3605, true);

-- ───────────────────────────── Menu items ─────────────────────────────
insert into public.menu_items
  (id, restaurant_id, external_id, name, category, base_price_krw, base_kcal, kcal_source, base_protein_g, protein_source)
values
  -- N11 Cafeteria (ordering not supported)
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'm-101', 'Pork Cutlet Set',          'Korean',  6000,  850, 'provider',    32, 'provider'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'm-102', 'Bibimbap',                 'Korean',  5500,  650, 'provider',    22, 'provider'),
  -- W2 Bowl House
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'm-201', 'Chicken Breast Rice Bowl', 'Bowl',    9500,  520, 'provider',    42, 'provider'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'm-202', 'Tofu Poke Bowl',           'Bowl',   10500,  480, 'estimated',   24, 'estimated'),
  -- E5 Grill & Salad
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000003', 'm-301', 'Grilled Salmon Salad',     'Salad',  12500,  430, 'provider',    35, 'provider'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'm-302', 'Beef Steak Plate',         'Grill',  15900,  780, 'estimated',   48, 'estimated'),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 'm-303', 'Chef''s Special',          'Grill',  13000, null, 'unavailable', null, 'unavailable'),
  -- N13 Snack Bar
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000004', 'm-401', 'Tteokbokki',               'Snack',   4500,  600, 'estimated',   null, 'unavailable'),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000004', 'm-402', 'Gimbap',                   'Snack',   3500,  420, 'provider',    14, 'provider');

-- ───────────────────────────── Components ─────────────────────────────
insert into public.menu_components (id, menu_item_id, type, name, sort_order) values
  -- Chicken Breast Rice Bowl
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'rice',    'White rice',     0),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'meat',    'Chicken breast', 1),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'sauce',   'Teriyaki sauce', 2),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003', 'egg',     'Soft-boiled egg', 3),
  -- Tofu Poke Bowl
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000004', 'rice',    'Brown rice',     0),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000004', 'tofu',    'Grilled tofu',   1),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000004', 'topping', 'Avocado',        2),
  -- Grilled Salmon Salad (bread has a single level → no slider)
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000005', 'bread',   'Side bread',     0),
  ('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000005', 'sauce',   'Balsamic dressing', 1),
  -- Beef Steak Plate
  ('40000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000006', 'rice',    'White rice',     0),
  ('40000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000006', 'meat',    'Sirloin steak',  1);

-- ───────────────────────────── Portion levels ─────────────────────────────
insert into public.portion_levels
  (component_id, level, label, is_default, price_delta_krw, kcal_delta, kcal_source, protein_delta_g, protein_source)
values
  -- Chicken Breast Rice Bowl: rice
  ('40000000-0000-4000-8000-000000000001', 0, 'None',    false,     0, -300, 'provider',  -6, 'provider'),
  ('40000000-0000-4000-8000-000000000001', 1, 'Less',    false,     0, -150, 'provider',  -3, 'provider'),
  ('40000000-0000-4000-8000-000000000001', 2, 'Regular', true,      0,    0, 'provider',   0, 'provider'),
  ('40000000-0000-4000-8000-000000000001', 3, 'Extra',   false,  1000,  150, 'provider',   3, 'provider'),
  -- Chicken Breast Rice Bowl: meat
  ('40000000-0000-4000-8000-000000000002', 0, 'Regular', true,      0,    0, 'provider',   0, 'provider'),
  ('40000000-0000-4000-8000-000000000002', 1, 'Extra',   false,  2500,  165, 'provider',  31, 'provider'),
  -- Chicken Breast Rice Bowl: sauce
  ('40000000-0000-4000-8000-000000000003', 0, 'None',    false,     0,  -60, 'provider',   0, 'provider'),
  ('40000000-0000-4000-8000-000000000003', 1, 'Regular', true,      0,    0, 'provider',   0, 'provider'),
  -- Chicken Breast Rice Bowl: egg (not in base)
  ('40000000-0000-4000-8000-000000000004', 0, 'None',    true,      0,    0, 'provider',   0, 'provider'),
  ('40000000-0000-4000-8000-000000000004', 1, 'Add',     false,   800,   78, 'provider',   6, 'provider'),
  -- Tofu Poke Bowl: rice
  ('40000000-0000-4000-8000-000000000005', 0, 'None',    false,     0, -220, 'estimated', -5, 'estimated'),
  ('40000000-0000-4000-8000-000000000005', 1, 'Regular', true,      0,    0, 'estimated',  0, 'estimated'),
  ('40000000-0000-4000-8000-000000000005', 2, 'Extra',   false,  1000,  110, 'estimated',  2, 'estimated'),
  -- Tofu Poke Bowl: tofu
  ('40000000-0000-4000-8000-000000000006', 0, 'Regular', true,      0,    0, 'estimated',  0, 'estimated'),
  ('40000000-0000-4000-8000-000000000006', 1, 'Extra',   false,  1500,   90, 'estimated',  9, 'estimated'),
  -- Tofu Poke Bowl: avocado (provider sends no nutrition for it)
  ('40000000-0000-4000-8000-000000000007', 0, 'None',    true,      0,    0, 'estimated',  0, 'estimated'),
  ('40000000-0000-4000-8000-000000000007', 1, 'Add',     false,  2000, null, 'unavailable', null, 'unavailable'),
  -- Grilled Salmon Salad: bread (single level → no slider, FR-29)
  ('40000000-0000-4000-8000-000000000008', 0, 'Included', true,     0,    0, 'provider',   0, 'provider'),
  -- Grilled Salmon Salad: dressing
  ('40000000-0000-4000-8000-000000000009', 0, 'None',    false,     0,  -90, 'provider',   0, 'provider'),
  ('40000000-0000-4000-8000-000000000009', 1, 'Light',   false,     0,  -45, 'provider',   0, 'provider'),
  ('40000000-0000-4000-8000-000000000009', 2, 'Regular', true,      0,    0, 'provider',   0, 'provider'),
  -- Beef Steak Plate: rice
  ('40000000-0000-4000-8000-000000000010', 0, 'None',    false,     0, -300, 'estimated', -6, 'estimated'),
  ('40000000-0000-4000-8000-000000000010', 1, 'Regular', true,      0,    0, 'estimated',  0, 'estimated'),
  -- Beef Steak Plate: meat
  ('40000000-0000-4000-8000-000000000011', 0, 'Regular', true,      0,    0, 'estimated',  0, 'estimated'),
  ('40000000-0000-4000-8000-000000000011', 1, 'Extra',   false,  6000,  300, 'estimated', 30, 'estimated');
