-- Official KAIST rotating menus. The imported locations support browsing.
-- Names, buildings and floors: https://www.kaist.ac.kr/kr/html/campus/053001.html
insert into public.providers (code, name, kind, config)
values ('kaist_cafeteria', 'KAIST 학식', 'restaurant',
        '{"menuUrl":"https://www.kaist.ac.kr/kr/html/campus/053001.html","timezone":"Asia/Seoul"}')
on conflict (code) do nothing;
--> statement-breakpoint
insert into public.restaurants (provider_id, external_id, name, address, campus_area)
select provider.id, cafeteria.code, cafeteria.name, cafeteria.address, cafeteria.campus_area
from public.providers provider
cross join (values
  ('fclt', '카이마루 북측식당', '학생식당 (N11) 1층', 'N11'),
  ('west', '서맛골', '서측 학생회관 (W2) 1층', 'W2'),
  ('east1', '동맛골 학생식당', '교직원회관 (E5) 1층', 'E5'),
  ('east2', '동맛골 교직원식당', '교직원회관 (E5) 2층', 'E5'),
  ('emp', '교수회관 식당', '교수회관 (N6) 1~2층', 'N6')
) as cafeteria(code, name, address, campus_area)
where provider.code = 'kaist_cafeteria'
on conflict (provider_id, external_id) do nothing;
