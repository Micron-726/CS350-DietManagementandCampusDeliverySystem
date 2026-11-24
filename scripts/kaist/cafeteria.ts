import { load } from "cheerio";
import type { ExtraNutrition } from "../../src/db/schema";

export const providerCode = "kaist_cafeteria";
export const cafeteriaCodes = ["fclt", "west", "east1", "east2", "emp"] as const;
type CafeteriaCode = (typeof cafeteriaCodes)[number];

const menuPage = "https://www.kaist.ac.kr/kr/html/campus/053001.html";
const mealPeriods = ["조식", "중식", "석식"] as const;
type MealPeriod = (typeof mealPeriods)[number];

export function cafeteriaUrl(code: CafeteriaCode, date: string) {
  const url = new URL(menuPage);
  url.search = new URLSearchParams({ dvs_cd: code, stt_dt: date }).toString();
  return url;
}

const amount = "([0-9]+(?:,[0-9]{3})*(?:\\.[0-9]+)?)";
const pricePattern = /([0-9]+(?:,[0-9]{3})*)\s*원/g;
const caloriePattern = new RegExp(`(?:^(?:\\(\\s*)?|(?:총\\s*)?(?:열량|칼로리)\\s*[:：]?\\s*)${amount}\\s*kcal\\b`, "i");
const closed = /^(?:[-–—]+|운영\s*없음|미운영|미\s*제공|품절|휴무(?:일)?|식당\s*휴무|운영\s*안\s*함|등록된\s*식단이\s*없습니다\.?)[.!]?$/;
const groupTitle = /^(?:\([가-힣 ]+\)$|(?:[12]\s*층\s*)?(?:[A-Z]\s*코너|자율\s*(?:코너|배식)|한식(?:코너)?|일품(?:코너)?|샐러드(?:코너)?|솥밥(?:코너)?|조식|중식|석식|간편식|특식)(?:\s|[([:：-]|$))/i;
const notice = /^[★●※*]|^(?:-\s*)?(?:식사시|상기 메뉴|하루과일 캠페인)/;
const extraNutrients = {
  carbsG: ["탄수화물", "g"], fatG: ["지방", "g"], sugarG: ["당류", "g"],
  saturatedFatG: ["포화\\s*지방", "g"], transFatG: ["트랜스\\s*지방", "g"],
  sodiumMg: ["나트륨", "mg"], fiberG: ["식이섬유", "g"],
} as const;

const readNumber = (value: string | undefined) => value === undefined ? null : Number(value.replaceAll(",", ""));

function nutrient(text: string, label: string, unit: string) {
  if (label === "지방") text = text.replace(/(?:포화|트랜스)\s*지방/g, "");
  const match = new RegExp(`(?:^|[\\s(/,·])${label}\\s*(?:[:：]?\\s*${amount}\\s*${unit}\\b|\\(${unit}\\)\\s*[:：]?\\s*${amount})`, "i").exec(text);
  return readNumber(match?.[1] ?? match?.[2]);
}

function nutritionRecord(line: string) {
  return caloriePattern.test(line) || nutrient(line, "단백질", "g") !== null ||
    Object.values(extraNutrients).some(([label, unit]) => nutrient(line, label, unit) !== null);
}

function singlePrice(text: string) {
  const prices = [...new Set(Array.from(text.matchAll(pricePattern), (match) => readNumber(match[1])))];
  return prices.length === 1 ? prices[0] : null;
}

function notedPrice(notes: string, code: CafeteriaCode, period: MealPeriod, label: string | undefined) {
  const prices = /(?:★\s*금액\s*★|\[\s*금액\s*\]|★\s*금액\s*:)\s*(.*?)(?=\[\s*알레르기|★\s*알레르기|$)/.exec(notes.replace(/\s+/g, " "))?.[1];
  if (!prices) return null;

  // The East cafeterias share a note, with separate price lists by floor.
  if (code === "east1" || code === "east2") {
    const floor = code === "east1" ? /1층\s*(.*?)(?=2층|$)/.exec(prices)?.[1] : /2층\s*(.*)/.exec(prices)?.[1];
    if (code === "east1" && period === "조식" && !label) {
      return readNumber(/조식\s*\(([\d,]+)\s*원\)/.exec(prices)?.[1]);
    }
    const menuLabel = label?.replace(/[()\s]/g, "");
    const category = menuLabel === "한식" ? /퍼레이드\s*한식(?:\s*\(중식[.· ]*석식\))?\s*\(([\d,]+)\s*원\)/
      : menuLabel === "일품" ? /\(일품\)\s*\(([\d,]+)\s*원\)/
      : menuLabel === "솥밥" && period === "중식" ? /\(솥밥\)\s*\(중식\)\s*\(([\d,]+)\s*원\)/ : null;
    return floor && category ? readNumber(category.exec(floor)?.[1]) : null;
  }

  if (!label && (code === "west" || code === "fclt")) {
    return readNumber(new RegExp(`${period}\\s*\\(\\s*(?:자율배식\\s*:\\s*)?([\\d,]+)\\s*원`).exec(prices)?.[1]);
  }
  return null;
}

function splitOptions(lines: string[]) {
  const options: string[][] = [];
  let current: string[] = [];
  let hasCalories = false;
  for (const line of lines) {
    if (notice.test(line)) continue;
    if (current.length && (groupTitle.test(line) || (hasCalories && !nutritionRecord(line)))) {
      options.push(current);
      current = [];
      hasCalories = false;
    }
    current.push(line);
    hasCalories ||= caloriePattern.test(line);
  }
  if (current.length) options.push(current);
  return options;
}

function cafeteriaMeal(lines: string[], period: MealPeriod, code: CafeteriaCode, notes: string) {
  const title = groupTitle.test(lines[0]) ? lines[0] : undefined;
  const label = title?.replace(/\s*[([][\d,]+\s*원[)\]]/g, "").replace(/^\(([^()]+)\)$/, "$1").trim();
  const dishLines = (title ? lines.slice(1) : lines).filter((line) => !nutritionRecord(line) && !/^(?:천원의\s*아침밥|[(\[]?[\d,]+\s*원[)\]]?$)/.test(line));
  if (!dishLines.length) return null;

  const kcal = readNumber(lines.map((line) => caloriePattern.exec(line)).find(Boolean)?.[1]);
  const text = lines.join("\n");
  const protein = nutrient(text, "단백질", "g");
  const extras: ExtraNutrition = {};
  for (const key of Object.keys(extraNutrients) as (keyof ExtraNutrition)[]) {
    const [name, unit] = extraNutrients[key];
    const value = nutrient(text, name, unit);
    if (value !== null) extras[key] = value;
  }
  return {
    label: label || period,
    name: label && !mealPeriods.some((entry) => entry === label)
      ? `${label} · ${dishLines[0]}`.slice(0, 160) : `${period} 식단 · ${dishLines[0]}`.slice(0, 160),
    description: lines.filter((line) => !nutritionRecord(line)).join("\n"),
    category: period,
    basePriceKrw: /\d\s*원/.test(text) ? singlePrice(text) : notedPrice(notes, code, period, label),
    baseKcal: kcal,
    baseProteinG: protein,
    extraNutrition: Object.keys(extras).length ? extras : null,
    isAvailable: !/(?:품절|판매\s*종료)/.test(text),
  };
}

export function parseCafeteriaPage(html: string, code: CafeteriaCode, date: string) {
  const $ = load(html);
  const section = $("#tab_item_1");
  const activeDay = $("li.on a[href*='stt_dt=']").toArray().some((link) => {
    const url = new URL($(link).attr("href") ?? "", menuPage);
    return url.searchParams.get("dvs_cd") === code && url.searchParams.get("stt_dt") === date;
  });
  const table = section.find("table").filter((_, element) => $(element).children("caption").text().includes("오늘의 메뉴 안내"));
  const cells = table.find("tbody tr").first().children("td").toArray();
  if (!activeDay || table.length !== 1 || cells.length !== mealPeriods.length ||
      table.find("thead th").toArray().map((element) => $(element).text().trim().split(/\s/)[0]).join() !== mealPeriods.join()) {
    throw new Error(`Unexpected KAIST menu format for ${code} on ${date}`);
  }

  const notes = section.children("p").text();
  let confirmedClosed = false;
  const meals = cells.flatMap((cell, index) => {
    const period = mealPeriods[index];
    $(cell).find("br").replaceWith("\n");
    $(cell).find("p, li, div").append("\n");
    const lines = $(cell).text().split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!lines.length || lines.every((line) => closed.test(line))) {
      confirmedClosed ||= lines.length > 0 && lines.some((line) => !/^[-–—]+$/.test(line));
      return [];
    }

    const occurrences = new Map<string, number>();
    return splitOptions(lines).flatMap((option) => {
      const meal = cafeteriaMeal(option, period, code, notes);
      if (!meal) return [];
      const count = (occurrences.get(meal.label) ?? 0) + 1;
      occurrences.set(meal.label, count);
      return [{ ...meal, externalId: `kaist:${date}:${index}:${meal.label}:${count}` }];
    });
  });
  return { meals, confirmedClosed };
}
