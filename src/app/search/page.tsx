import { connection } from "next/server";
import { Suspense } from "react";
import { PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { requireAccount } from "@/lib/auth";
import { dietClient, loadGoalOn, loadMealsOn } from "@/lib/diet/data";
import { dayTotals } from "@/lib/diet/meals";
import { dateInKorea } from "@/lib/korea-date";
import type { Priority } from "@/lib/ranking";
import { remainingTargets } from "@/lib/search-targets";
import { SearchForm, type SearchDefaults } from "./search-form";

type Params = Promise<Record<string, string | string[] | undefined>>;

const priorities: Priority[] = ["balanced", "calories", "protein", "price", "distance"];

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const positive = (v: string | string[] | undefined) => {
  const n = Number(first(v));
  return first(v) && Number.isFinite(n) && n > 0 ? n : undefined;
};

export default function SearchPage({ searchParams }: { searchParams: Params }) {
  return (
    <PageMain className="max-w-4xl">
      <PageHeading title="메뉴 찾기" description="목표 칼로리·단백질에 맞는 교내 메뉴를 가격과 거리까지 따져 추천합니다." />
      <Suspense fallback={<PageLoading />}><Form searchParams={searchParams} /></Suspense>
      <p className="text-xs text-muted-foreground">
        추천은 참고용이며 전문 의료 상담을 대신하지 않습니다. 영양 정보는 가게가 제공했거나 재료로 추정한 값일 수 있습니다.
      </p>
    </PageMain>
  );
}

async function Form({ searchParams }: { searchParams: Params }) {
  await connection();
  const account = await requireAccount("customer");
  const sp = await searchParams;
  const rawPriority = first(sp.priority) as Priority;
  const fromQuery = {
    kcal: positive(sp.kcal), protein: positive(sp.protein),
    price: positive(sp.price), distance: positive(sp.distance),
    priority: priorities.includes(rawPriority) ? rawPriority : "balanced",
  } satisfies SearchDefaults;

  // Coming back from the results page ("조건 바꾸기"): keep what was searched.
  if (fromQuery.kcal || fromQuery.protein) return <SearchForm defaults={fromQuery} />;

  // Otherwise start from what is left of today's goal.
  const supabase = await dietClient();
  const today = dateInKorea();
  const [goal, meals] = await Promise.all([
    loadGoalOn(supabase, account.id, today),
    loadMealsOn(supabase, account.id, today),
  ]);
  const remaining = goal.data && meals.data
    ? remainingTargets(goal.data, dayTotals(meals.data.map((m) => ({ kcal: m.kcal, proteinG: m.protein_g }))))
    : {};
  const note = remaining.kcal || remaining.protein ? "오늘 목표에서 지금까지 먹은 양을 뺀 값으로 채웠습니다." : undefined;

  return <SearchForm defaults={{ ...fromQuery, ...remaining, note }} />;
}
