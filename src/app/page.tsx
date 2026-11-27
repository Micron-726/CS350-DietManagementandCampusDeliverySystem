import { and, asc, eq } from "drizzle-orm";
import { ArrowRight, MapPin, Search, SlidersHorizontal, Utensils } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button-link";
import { MenuListCard } from "@/components/menu-list-card";
import { DayDashboard } from "@/components/diet/day-dashboard";
import { ContentEmpty, ErrorMessage, PageLoading, PageMain } from "@/components/page-ui";
import { db } from "@/db";
import { menuItems, providers, restaurants } from "@/db/schema";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { menuServedOn } from "@/lib/menu-data";
import { dietClient, loadFirstGoalDate, loadGoalOn, loadMealsOn } from "@/lib/diet/data";
import { dayTotals } from "@/lib/diet/meals";
import { remainingSearchHref, remainingTargets, type RemainingTargets } from "@/lib/search-targets";

const dateLabel = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Seoul" });

export default function Home() {
  return (
    <PageMain className="gap-10 sm:gap-12">
      <Suspense fallback={<PageLoading />}><Dashboard /></Suspense>
    </PageMain>
  );
}

async function Dashboard() {
  await connection();
  const account = await requireAccount("customer");
  const supabase = await dietClient();
  const today = dateInKorea();
  // Part B (IR-01, NFR-14): today's calorie/protein rings at the top of the home page.
  const [meals, goal, firstGoal, menu] = await Promise.all([
    loadMealsOn(supabase, account.id, today),
    loadGoalOn(supabase, account.id, today),
    loadFirstGoalDate(supabase, account.id),
    db.select({ item: menuItems, restaurantName: restaurants.name })
      .from(menuItems)
      .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
      .innerJoin(providers, eq(restaurants.providerId, providers.id))
      .where(and(
        eq(menuItems.isAvailable, true), eq(restaurants.isActive, true), eq(providers.isActive, true), menuServedOn(today),
      ))
      .orderBy(asc(menuItems.name)).limit(10),
  ]);

  const dashboardError = meals.error || goal.error || firstGoal.error;
  const totals = dayTotals((meals.data ?? []).map((meal) => ({ kcal: meal.kcal, proteinG: meal.protein_g })));
  const remaining = dashboardError ? {} : remainingTargets(goal.data, totals);

  return (
    <>
      {dashboardError || !meals.data ? <ErrorMessage>오늘의 식단 정보를 불러올 수 없습니다.</ErrorMessage> : (
        <DayDashboard date={today} today={today} goal={goal.data} firstGoalDate={firstGoal.data?.effective_from ?? null} diaryLink
          totals={totals} />
      )}

      <section aria-labelledby="home-title" className="overflow-hidden rounded-3xl border bg-card text-card-foreground sm:grid sm:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col items-start justify-center gap-5 px-6 py-8 sm:px-9 sm:py-11 lg:px-12 lg:py-14">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><MapPin className="size-4" aria-hidden="true" /> KAIST 교내 식당</p>
          <h1 id="home-title" className="text-4xl leading-[1.16] font-bold tracking-tight md:text-5xl">캠퍼스에서<br />오늘 뭐 먹지?</h1>
          <p className="max-w-sm break-keep text-sm leading-relaxed text-muted-foreground sm:text-base">오늘의 학식과 교내 식당 메뉴, 영양 정보를 한곳에서 확인하세요.</p>
          <ButtonLink href="/restaurants" size="lg">
            교내 식당 보기<ArrowRight data-icon="inline-end" />
          </ButtonLink>
        </div>
        <QuickSearch remaining={remaining} hasGoal={Boolean(goal.data)} />
      </section>

      <section aria-labelledby="daily-menus" className="flex flex-col gap-4">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{dateLabel.format(new Date(`${today}T12:00:00+09:00`))}</p>
            <h2 id="daily-menus" className="text-2xl font-bold tracking-tight sm:text-3xl">오늘의 메뉴</h2>
          </div>
          <ButtonLink href="/restaurants" variant="ghost">
            식당 목록<ArrowRight data-icon="inline-end" />
          </ButtonLink>
        </div>
        {menu.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {menu.map(({ item, restaurantName }) => <MenuListCard key={item.id} item={item} restaurantId={item.restaurantId} restaurantName={restaurantName} />)}
          </ul>
        ) : <ContentEmpty icon={Utensils} title="표시할 메뉴가 없습니다." />}
      </section>

    </>
  );
}

/** IR-02: meal search entry on the home page, prefilled with what is left of today's goal. */
function QuickSearch({ remaining, hasGoal }: { remaining: RemainingTargets; hasGoal: boolean }) {
  const href = remainingSearchHref(remaining);
  return (
    <div className="flex flex-col justify-center gap-5 border-t bg-muted px-6 py-8 sm:border-t-0 sm:border-l sm:px-9 lg:px-12">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-lg font-semibold">{href ? "남은 목표에 맞는 메뉴" : "목표에 맞는 메뉴 찾기"}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {href ? "오늘 목표에서 지금까지 먹은 양을 빼고 찾아 드립니다."
            : hasGoal ? "오늘 목표를 다 채웠습니다. 원하는 양을 직접 정해 찾아보세요."
              : "칼로리·단백질 목표와 가격, 거리를 정하면 교내 메뉴를 추천합니다."}
        </p>
      </div>
      {href && (
        <dl className="grid grid-cols-2 gap-3">
          <RemainingStat label="남은 칼로리" value={remaining.kcal} unit="kcal" />
          <RemainingStat label="남은 단백질" value={remaining.protein} unit="g" />
        </dl>
      )}
      <div className="flex flex-wrap gap-2">
        {href && <ButtonLink href={href} size="lg"><Search data-icon="inline-start" />이대로 찾기</ButtonLink>}
        <ButtonLink href="/search" size="lg" variant={href ? "outline" : "default"}>
          {href ? <SlidersHorizontal data-icon="inline-start" /> : <Search data-icon="inline-start" />}
          {href ? "조건 정하기" : "메뉴 찾기"}
        </ButtonLink>
      </div>
    </div>
  );
}

function RemainingStat({ label, value, unit }: { label: string; value?: number; unit: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border bg-card px-4 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-bold tracking-tight tabular-nums">
        {value === undefined ? "—" : value.toLocaleString("ko-KR")}<span className="ml-1 text-sm font-medium text-muted-foreground">{unit}</span>
      </dd>
    </div>
  );
}
