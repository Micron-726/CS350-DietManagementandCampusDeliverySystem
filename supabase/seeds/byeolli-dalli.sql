-- Local catalog from the supplied 별리달리 menu. Prices and names are transcribed as supplied.
-- Location: https://www.kaist.ac.kr/kr/html/campus/053001.html?dvs_cd=fclt_cafe
-- Coordinates are the approximate N11 building point used by the demo catalog.
-- Quantities below are assumed edible/served grams (ml for water/cola, approximated as g).
-- Reference dishes and individual ingredients are generic proxies. No recipe, serving weight,
-- nutrition value or adjustable portion was confirmed by the store.

insert into public.restaurants (id, provider_id, external_id, name, address, campus_area, lat, lng, accepting_orders)
values ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000002',
        'byeolli-dalli-n11', '별리달리', '카이마루 학생식당 (N11) 1층', 'N11', 36.3740, 127.3592, true)
on conflict (provider_id, external_id) do nothing;

-- K-FIND record IDs can be opened at
-- https://various.foodsafetykorea.go.kr/nutrient/general/food/detail.do?searchFoodCd=<id>
-- USDA SR Legacy: https://fdc.nal.usda.gov/download-datasets/ (FDC IDs below).
-- KFDA foodservice compilation: https://www.foodsafetykorea.go.kr/upload/20150824/20150824011539_1440389739434.pdf
-- MFDS adult guidebook: https://various.foodsafetykorea.go.kr/nq/data/adult_guidebook.pdf
with reference_food (code, name, type, kcal_per_100g, protein_per_100g) as (values
  ('rice',      '공기밥',     'rice',     166.0,  3.36), -- K-FIND D301-022000000-0001
  ('sundubu',   '순두부찌개', 'tofu',      90.0,  8.00), -- MFDS guidebook, 225 kcal / 20 g per 250 g
  ('doenjang',  '된장찌개',   'other',    150.0, 10.00), -- MFDS guidebook, 375 kcal / 25 g per 250 g
  ('kimchi-stew','김치찌개',  'other',     50.0,  3.20), -- MFDS guidebook, 125 kcal / 8 g per 250 g
  ('kimchi',    '배추김치',   'topping',   38.0,  1.98), -- K-FIND D315-670000000-0001
  ('brisket',   '차돌박이',   'meat',     331.0, 25.85), -- USDA FDC 168665, braised brisket as proxy
  ('spam',      '스팸',       'meat',     315.0, 13.40), -- USDA FDC 172951
  ('sausage',   '소세지',     'meat',     269.0, 12.81), -- USDA FDC 172964
  ('ribs',      '돼지갈비맛 고기', 'meat', 361.0, 20.89), -- USDA FDC 169178, roasted spareribs as proxy
  ('pork',      '양념 돼지고기', 'meat',  175.5, 11.50), -- KFDA foodservice #108, stir-fried pork
  ('dakgalbi',  '닭갈비',     'meat',     149.0, 11.48), -- K-FIND P117-100050100-F001-001
  ('chicken',   '치킨 가라아게', 'meat',  287.0, 28.93), -- K-FIND D212-549000000-0143, fried chicken as proxy
  ('butter',    '버터',       'sauce',    717.0,  0.85), -- USDA FDC 173410
  ('mayo',      '마요네즈',   'sauce',    680.0,  0.96), -- USDA FDC 171009
  ('bibimbap',  '비빔밥',     'rice',     142.0,  6.86), -- K-FIND D101-018000000-0001
  ('dolsot',    '돌솥비빔밥', 'rice', 558.0 / 3.8, 20.5 / 3.8), -- Korean Diabetes Association, https://diabetes.or.kr/bbs/download.php?code=guide&number=1529
  ('albab',     '알밥',       'rice',    154.75,  3.65), -- KFDA foodservice #047, 619 kcal / 14.6 g per 400 g
  ('cheese',    '치즈',       'topping',  299.0, 22.17), -- USDA FDC 170845, mozzarella as proxy
  ('roe',       '날치알',     'topping',  143.0, 22.32), -- USDA FDC 175132, mixed fish roe as proxy
  ('egg',       '구운계란',   'egg',      145.0, 13.49), -- K-FIND R110-003000046-0000, boiled egg as proxy
  ('raw-egg',   '날계란',     'egg',      140.0, 12.86), -- K-FIND R110-003000001-0000
  ('somen',     '소면사리',   'other',    131.0,  4.00), -- USDA FDC 168909, cooked somen
  ('laver',     '김',         'topping',  500.0, 20.00), -- generic seasoned-laver portion via https://mall.epost.go.kr/fo/goods/goodsDetailView.do?goodsDpstId=10001694&goodsDispTypeCd=03&goodsCd=33020806&ctgryCd=102201302&nationCd=KO
  ('banana',    '바나나',     'dessert',   77.0,  1.11), -- K-FIND R108-037000001-0000
  ('water',     '생수',       'other',      0.0,  0.00), -- USDA FDC 174158
  ('cola',      '콜라',       'other',     42.0,  0.00)  -- USDA FDC 174852
),
menu (code, name, category, price, recipe, unknown_reason) as (values
  ('01', '차돌순두부찌개 + 공기밥',              '찌개류', 6600, '{"sundubu":250,"brisket":40,"rice":200}'::jsonb, null),
  ('02', '차돌된장찌개 + 공기밥',                '찌개류', 6600, '{"doenjang":250,"brisket":40,"rice":200}', null),
  ('03', '김치찌개 + 공기밥',                   '찌개류', 4900, '{"kimchi-stew":250,"rice":200}', null),
  ('04', '대왕스팸 차돌순두부찌개…',            '찌개류', 8200, '{"sundubu":250,"brisket":40,"spam":75}', '잘린 메뉴명으로는 세트 구성을 확인할 수 없습니다.'),
  ('05', '대왕스팸김치찌개 + 공기밥',            '찌개류', 6600, '{"kimchi-stew":250,"spam":75,"rice":200}', null),
  ('06', '차돌플러스 김치찌개 + 공기밥',         '찌개류', 6600, '{"kimchi-stew":250,"brisket":50,"rice":200}', null),
  ('07', '뚝배기 돼지갈비맛 덮밥',             '덮밥·도시락·비빔밥', 7000, '{"rice":210,"ribs":100}', null),
  ('08', '뚝배기 버터제육덮밥',                '덮밥·도시락·비빔밥', 6300, '{"rice":210,"pork":140,"butter":12}', null),
  ('09', '뚝배기 닭갈비 덮밥',                '덮밥·도시락·비빔밥', 5000, '{"rice":210,"dakgalbi":150}', null),
  ('10', '돼지갈비맛덮밥 + 치킨가라아게…',      '덮밥·도시락·비빔밥', 9500, '{"rice":210,"ribs":100,"chicken":80}', '잘린 메뉴명으로는 세트 구성을 확인할 수 없습니다.'),
  ('11', '치킨 가라아게 마요덮밥',             '덮밥·도시락·비빔밥', 7000, '{"rice":210,"chicken":100,"mayo":22}', null),
  ('12', '스팸소세지 마요덮밥',                '덮밥·도시락·비빔밥', 7000, '{"rice":210,"spam":55,"sausage":55,"mayo":22}', null),
  ('13', '버터 김치 플러스 닭갈비 덮밥',       '덮밥·도시락·비빔밥', 5600, '{"rice":210,"dakgalbi":150,"butter":12,"kimchi":40}', null),
  ('14', '할인 이벤트 비빔밥',                 '덮밥·도시락·비빔밥', 6500, '{"bibimbap":400}', null),
  ('15', '추억의도시락',                     '덮밥·도시락·비빔밥', 5500, '{"rice":200,"sausage":60,"egg":50,"laver":3}', '도시락의 반찬 구성을 확인할 수 없습니다.'),
  ('16', '추억의도시락 + 김치찌개 1/2세트',    '덮밥·도시락·비빔밥', 7800, '{"rice":200,"sausage":60,"egg":50,"laver":3,"kimchi-stew":125}', '도시락의 반찬 구성을 확인할 수 없습니다.'),
  ('17', '돌솥 비빔밥',                     '알밥·돌솥비빔밥', 7500, '{"dolsot":380}', null),
  ('18', '돌솥비빔밥 + 1/2김치찌개',          '알밥·돌솥비빔밥', 9800, '{"dolsot":380,"kimchi-stew":125}', null),
  ('19', '별리달리 버터 알밥',               '알밥·돌솥비빔밥', 5000, '{"albab":350,"butter":10}', null),
  ('20', '자연산 100프로 치즈 플러스 알밥',   '알밥·돌솥비빔밥', 6200, '{"albab":350,"cheese":35}', null),
  ('21', '날치알 플러스 알밥',               '알밥·돌솥비빔밥', 6100, '{"albab":350,"roe":25}', null),
  ('22', '돼지불고기 플러스 알밥',            '알밥·돌솥비빔밥', 6100, '{"albab":350,"pork":80}', null),
  ('23', '스페셜모듬 알밥',                 '알밥·돌솥비빔밥', 7500, '{"albab":350}', '모듬 토핑 구성을 확인할 수 없습니다.'),
  ('24', '별리달리버터알밥 + 치킨 + 음료세트', '알밥·돌솥비빔밥', 7600, '{"albab":350,"butter":10,"chicken":80}', '음료 종류와 크기를 확인할 수 없습니다.'),
  ('25', '별리달리버터알밥 + 바나나 + 생수 + 김', '알밥·돌솥비빔밥', 6200, '{"albab":350,"butter":10,"banana":100,"water":500,"laver":4}', null),
  ('26', '별리달리버터알밥 + 김치찌개 + 1/2세트', '알밥·돌솥비빔밥', 7300, '{"albab":350,"butter":10,"kimchi-stew":125}', null),
  ('27', '제육 플러스 알밥',                 '알밥·돌솥비빔밥', 6500, '{"albab":350,"pork":100}', null),
  ('28', '별리달리 포케',                    '기타 식사', 6500, '{}', '베이스, 단백질 토핑과 드레싱 구성을 확인할 수 없습니다.'),
  ('29', '공기밥 추가',                     '사이드·음료·추가 메뉴', 1000, '{"rice":200}', null),
  ('30', '구운계란',                        '사이드·음료·추가 메뉴', 500, '{"egg":50}', null),
  ('31', '날계란',                          '사이드·음료·추가 메뉴', 400, '{"raw-egg":50}', null),
  ('32', '소면사리',                        '사이드·음료·추가 메뉴', 1000, '{"somen":100}', null),
  ('33', '치킨 가라아게(소)',                '사이드·음료·추가 메뉴', 2500, '{"chicken":80}', null),
  ('34', '김',                             '사이드·음료·추가 메뉴', 400, '{"laver":4}', null),
  ('35', '바나나',                          '사이드·음료·추가 메뉴', 500, '{"banana":100}', null),
  ('36', '생수',                            '사이드·음료·추가 메뉴', 700, '{"water":500}', null),
  ('37', '콜라(리필 안 됨)',                  '사이드·음료·추가 메뉴', 600, '{"cola":250}', null),
  ('38', '뚱캔/콜라/사이다',                 '사이드·음료·추가 메뉴', 1500, '{}', '음료 선택에 따라 영양이 달라집니다.'),
  ('39', '골든메달/페리에레몬',               '사이드·음료·추가 메뉴', 3000, '{}', '음료 선택에 따라 영양이 달라집니다.')
),
recipe_parts as (
  select menu.code, food.name, food.type, portion.amount::numeric as grams,
         food.kcal_per_100g * portion.amount::numeric / 100 as kcal,
         food.protein_per_100g * portion.amount::numeric / 100 as protein,
         portion.food_code
  from menu
  cross join lateral jsonb_each_text(menu.recipe) as portion(food_code, amount)
  join reference_food food on food.code = portion.food_code
),
estimates as (
  select code, round(sum(kcal)) as kcal, round(sum(protein), 1) as protein,
         string_agg(name || ' ' || grams || case when food_code in ('water', 'cola') then ' mL' else ' g' end,
                    ', ' order by food_code) as portions
  from recipe_parts group by code
),
inserted_menus as (
  insert into public.menu_items (restaurant_id, external_id, name, category, description, base_price_krw, base_kcal, kcal_source, base_protein_g, protein_source)
  select restaurant.id, 'bd-' || menu.code, menu.name, menu.category,
         case when menu.unknown_reason is null then '영양 추정 기준 분량 · ' || estimates.portions
              else '영양 정보 없음 · ' || menu.unknown_reason end,
         menu.price,
         case when menu.unknown_reason is null then estimates.kcal end,
         (case when menu.unknown_reason is null then 'estimated' else 'unavailable' end)::public.nutrition_source,
         case when menu.unknown_reason is null then estimates.protein end,
         (case when menu.unknown_reason is null then 'estimated' else 'unavailable' end)::public.nutrition_source
  from menu left join estimates using (code)
  cross join public.restaurants restaurant
  where restaurant.provider_id = '10000000-0000-4000-8000-000000000002' and restaurant.external_id = 'byeolli-dalli-n11'
  on conflict (restaurant_id, external_id) do nothing
  returning id, external_id
),
inserted_components as (
  insert into public.menu_components (menu_item_id, type, name, external_id, sort_order)
  select item.id, parts.type::public.component_type, parts.name, parts.food_code,
         row_number() over (partition by item.id order by parts.food_code)::smallint
  from inserted_menus item join recipe_parts parts on item.external_id = 'bd-' || parts.code
  returning id, menu_item_id, external_id
)
insert into public.portion_levels (component_id, level, label, is_default, kcal_delta, kcal_source, protein_delta_g, protein_source)
select component.id, 0, '추정 ' || parts.grams || case when parts.food_code in ('water', 'cola') then ' mL' else ' g' end,
       true, 0, 'calculated', 0, 'calculated'
from inserted_components component
join inserted_menus item on component.menu_item_id = item.id
join recipe_parts parts on item.external_id = 'bd-' || parts.code and component.external_id = parts.food_code;

select public.admin_create_account('byeollidalli@example.com', 'demo-store', 'restaurant', '별리달리 데모', restaurant.id)
from public.restaurants restaurant
where restaurant.provider_id = '10000000-0000-4000-8000-000000000002' and restaurant.external_id = 'byeolli-dalli-n11'
  and not exists (select from auth.users where email = 'byeollidalli@example.com');
