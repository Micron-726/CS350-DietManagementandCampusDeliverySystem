import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCafeteriaPage } from "./cafeteria";

const date = "2026-11-24";

function page(code: string, cells: [string, string, string], notes = "") {
  return `
    <ul><li class="on"><a href="?dvs_cd=${code}&amp;stt_dt=${date}">화</a></li></ul>
    <div id="tab_item_1"><p>${notes}</p><table><caption>오늘의 메뉴 안내</caption>
      <thead><tr><th>조식 8:00~9:00</th><th>중식 11:00~13:00</th><th>석식 -</th></tr></thead>
      <tbody><tr>${cells.map((cell) => `<td>${cell}</td>`).join("")}</tr></tbody>
    </table></div>`;
}

test("imports published values for each option without carrying them to the next option", () => {
  const html = page("emp", ["", `1층 자율배식<br />(5,500원)<br />닭볶음<br />
    (850 kcal)<br />단백질(g): 25<br />탄수화물 110 g · 나트륨 1,500 mg<br />포화 지방 2 g<br />
    2층 자율배식 - 품절<br />(6,500원)<br />두부구이<br />`, ""]);
  const { meals } = parseCafeteriaPage(html, "emp", date);
  assert.equal(meals.length, 2);
  assert.deepEqual(meals.map(({ isAvailable }) => isAvailable), [true, false]);
  assert.deepEqual(meals.map(({ basePriceKrw, baseKcal, baseProteinG, extraNutrition }) =>
    [basePriceKrw, baseKcal, baseProteinG, extraNutrition]), [
    [5500, 850, 25, { carbsG: 110, saturatedFatG: 2, sodiumMg: 1500 }], [6500, null, null, null],
  ]);
});

test("uses floor-specific published prices and leaves ambiguous options unpriced", () => {
  const notes = "[금액 ] 조식(5,500원) 1층 味퍼레이드한식 (5,500원) 2층 味퍼레이드한식 (중식.석식) (6,500원) [알레르기 표시번호]";
  const meals = ["운영없음", "(한식)<br>덮밥<br>총 칼로리: 997kcal<br>(샐러드)<br>닭가슴살샐러드", ""] as [string, string, string];
  assert.deepEqual(parseCafeteriaPage(page("east1", meals, notes), "east1", date).meals.map((meal) => meal.basePriceKrw), [5500, null]);
  assert.deepEqual(parseCafeteriaPage(page("east2", meals, notes), "east2", date).meals.map((meal) => meal.basePriceKrw), [6500, null]);

  const north = page("fclt", ["천원의 아침밥(1,000원) / 조식(3,500원)<br>쌀밥<br>(675Kcal)", "", ""]);
  const [breakfast] = parseCafeteriaPage(north, "fclt", date).meals;
  assert.equal(breakfast.basePriceKrw, null);
  assert.equal(breakfast.baseKcal, 675);
});

test("distinguishes a closed cafeteria from an unpublished menu and rejects a mismatched date", () => {
  assert.deepEqual(parseCafeteriaPage(page("west", ["", "", ""]), "west", date), { meals: [], confirmedClosed: false });
  assert.deepEqual(parseCafeteriaPage(page("west", ["휴무", "휴무", "휴무"]), "west", date), { meals: [], confirmedClosed: true });
  assert.throws(() => parseCafeteriaPage(page("west", ["", "", ""]), "west", "2026-11-25"), /Unexpected KAIST menu format/);
});
