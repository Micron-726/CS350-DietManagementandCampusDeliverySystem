import { BookOpen } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContentEmpty, ErrorMessage, PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { DayDashboard } from "@/components/diet/day-dashboard";
import { dietClient, loadFirstGoalDate, loadGoalOn, loadMealsOn } from "@/lib/diet/data";
import { dayLabel } from "@/lib/diet/labels";
import { dayTotals, resolveDiaryDate, timeInKorea } from "@/lib/diet/meals";
import { DateNav } from "./date-nav";
import { MealForm } from "./meal-form";
import { MealItem } from "./meal-item";

export default function DiaryPage({ searchParams }: PageProps<"/diary">) {
  return (
    <PageMain className="max-w-3xl">
      <PageHeading title="식사 기록" description="먹은 음식과 칼로리·단백질을 기록합니다. 모르는 값은 비워 둘 수 있습니다." />
      <Suspense fallback={<PageLoading />}><Diary searchParams={searchParams} /></Suspense>
    </PageMain>
  );
}

async function Diary({ searchParams }: Pick<PageProps<"/diary">, "searchParams">) {
  await connection();
  const account = await requireAccount("customer");
  const today = dateInKorea();
  const date = resolveDiaryDate((await searchParams).date, today);
  const supabase = await dietClient();
  const [{ data: meals, error: mealsError }, goal, firstGoal] = await Promise.all([
    loadMealsOn(supabase, account.id, date),
    loadGoalOn(supabase, account.id, date),
    loadFirstGoalDate(supabase, account.id),
  ]);
  const error = mealsError || goal.error || firstGoal.error;

  return (
    // Keyed by date so forms start fresh on every day.
    <div key={date} className="flex flex-col gap-6">
      <DateNav date={date} today={today} />
      {error || !meals ? <ErrorMessage>식사 기록을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</ErrorMessage> : (
        <>
          <DayDashboard date={date} today={today} goal={goal.data} firstGoalDate={firstGoal.data?.effective_from ?? null}
            totals={dayTotals(meals.map((meal) => ({ kcal: meal.kcal, proteinG: meal.protein_g })))} />
          <section aria-labelledby="meal-list" className="flex flex-col gap-3">
            <h2 id="meal-list" className="text-xl font-bold tracking-tight">기록한 식사</h2>
            {meals.length ? (
              <ul className="flex flex-col gap-3">
                {meals.map((meal) => <MealItem key={meal.id} meal={meal} today={today} />)}
              </ul>
            ) : <ContentEmpty icon={BookOpen} title={`${dayLabel(date)}에 기록한 식사가 없습니다.`} />}
          </section>
        </>
      )}
      <Card>
        <CardHeader>
          <CardTitle><h2>식사 추가</h2></CardTitle>
          <CardDescription>{dayLabel(date)}에 먹은 음식을 기록합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <MealForm mode="add" today={today}
            initial={{ name: "", date, time: timeInKorea(), mealType: "", kcal: "", proteinG: "" }} />
        </CardContent>
      </Card>
    </div>
  );
}
