import { and, asc, eq } from "drizzle-orm";
import { ArrowRight, BookOpen, ImageIcon, MapPin, Utensils } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ButtonLink } from "@/components/button-link";
import { MenuListCard } from "@/components/menu-list-card";
import { ContentEmpty, ErrorMessage, PageLoading, PageMain } from "@/components/page-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { menuItems, providers, restaurants } from "@/db/schema";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { menuServedOn } from "@/lib/menu-data";
import { createClient } from "@/lib/supabase/server";

const dateLabel = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long", timeZone: "Asia/Seoul" });
const nutrientNumber = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

export default function Home() {
  return (
    <PageMain className="gap-10 sm:gap-12">
      <Suspense fallback={<PageLoading />}><Dashboard /></Suspense>
    </PageMain>
  );
}

async function Dashboard() {
  await connection();
  await requireAccount("customer");
  const supabase = await createClient();
  const today = dateInKorea();
  const [{ data: logs, error: logsError }, menu] = await Promise.all([
    supabase.from("meal_logs").select("id, name, kcal, protein_g").eq("log_date", today).order("eaten_at"),
    db.select({ item: menuItems, restaurantName: restaurants.name })
      .from(menuItems)
      .innerJoin(restaurants, eq(menuItems.restaurantId, restaurants.id))
      .innerJoin(providers, eq(restaurants.providerId, providers.id))
      .where(and(
        eq(menuItems.isAvailable, true), eq(restaurants.isActive, true), eq(providers.isActive, true), menuServedOn(today),
      ))
      .orderBy(asc(menuItems.name)).limit(10),
  ]);

  return (
    <>
      <section aria-labelledby="home-title" className="overflow-hidden rounded-3xl border bg-card text-card-foreground sm:grid sm:grid-cols-[1.05fr_1fr]">
        <div className="flex flex-col items-start justify-center gap-5 px-6 py-8 sm:px-9 sm:py-11 lg:px-12 lg:py-14">
          <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground"><MapPin className="size-4" aria-hidden="true" /> KAIST 교내 식당</p>
          <h1 id="home-title" className="text-4xl leading-[1.16] font-bold tracking-tight md:text-5xl">캠퍼스에서<br />오늘 뭐 먹지?</h1>
          <p className="max-w-sm break-keep text-sm leading-relaxed text-muted-foreground sm:text-base">오늘의 학식과 교내 식당 메뉴, 영양 정보를 한곳에서 확인하세요.</p>
          <ButtonLink href="/restaurants" size="lg">
            교내 식당 보기<ArrowRight data-icon="inline-end" />
          </ButtonLink>
        </div>
        <div aria-hidden="true" className="grid min-h-44 place-items-center border-t bg-muted text-muted-foreground sm:border-t-0 sm:border-l">
          <span className="grid size-16 place-items-center rounded-2xl border bg-card">
            <ImageIcon className="size-7" strokeWidth={1.5} />
          </span>
        </div>
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

      <section aria-labelledby="daily-logs" className="flex flex-col gap-4">
        <h2 id="daily-logs" className="text-2xl font-bold tracking-tight sm:text-3xl">오늘의 식사 기록</h2>
        {logsError ? <ErrorMessage>식사 기록을 불러올 수 없습니다.</ErrorMessage> : logs?.length ? (
          <Card>
            <CardHeader>
              <CardTitle>기록한 식사 {logs.length}건</CardTitle>
              <CardDescription>열량과 단백질이 기록된 값을 표시합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {logs.map(({ id, name, kcal, protein_g }) => (
                  <li key={id} className="flex flex-wrap justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <span className="font-medium">{name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {kcal === null ? "열량 미기록" : `${nutrientNumber.format(kcal)} kcal`} · {protein_g === null ? "단백질 미기록" : `${nutrientNumber.format(protein_g)} g 단백질`}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : <ContentEmpty icon={BookOpen} title="오늘 기록한 식사가 없습니다." />}
      </section>
    </>
  );
}
