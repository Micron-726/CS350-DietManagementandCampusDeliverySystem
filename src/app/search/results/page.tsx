import { connection } from "next/server";
import { Suspense } from "react";
import { MapPinOff, SearchX, SlidersHorizontal, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { BackLink, ContentEmpty, ErrorMessage, PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { requireAccount } from "@/lib/auth";
import { won } from "@/lib/menu";
import { searchMeals } from "@/lib/search";
import type { Priority, SearchCriteria } from "@/lib/ranking";
import MealCard from "./mealcard";
import MapLoader from "./map-loader";

type Params = Promise<Record<string, string | string[] | undefined>>;

const num = (v: string | string[] | undefined) => {
  const value = Array.isArray(v) ? v[0] : v;
  if (value === undefined || value.trim() === "") return undefined;

  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

const coord = (v: string | string[] | undefined) => {
  const value = Array.isArray(v) ? v[0] : v;
  if (value === undefined || value.trim() === "") return undefined;

  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

const validPriorities: Priority[] = [
  "balanced",
  "calories",
  "protein",
  "price",
  "distance",
];

const priorityLabels: Record<Priority, string> = {
  balanced: "균형", calories: "칼로리 우선", protein: "단백질 우선", price: "가격 우선", distance: "거리 우선",
};

/** "조건 바꾸기" goes back to the form with the same query, so the fields stay filled in. */
function editHref(sp: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const key of ["kcal", "protein", "price", "distance", "priority"]) {
    const value = Array.isArray(sp[key]) ? sp[key][0] : sp[key];
    if (value) params.set(key, value);
  }
  return `/search?${params}`;
}

function summary(c: SearchCriteria) {
  return [
    c.targetKcal && `약 ${c.targetKcal.toLocaleString("ko-KR")} kcal`,
    c.targetProteinG && `단백질 약 ${c.targetProteinG} g`,
    c.maxPriceKrw && `${won.format(c.maxPriceKrw)} 이하`,
    c.maxDistanceM && `${c.maxDistanceM.toLocaleString("ko-KR")} m 이내`,
    priorityLabels[c.priority],
  ].filter(Boolean).join(", ");
}

async function Results({ searchParams }: { searchParams: Params }) {
  await connection();
  await requireAccount("customer");

  const sp = await searchParams;

  const rawPriority = Array.isArray(sp.priority)
    ? sp.priority[0]
    : sp.priority;

  const priority: Priority = validPriorities.includes(
    rawPriority as Priority
  )
    ? (rawPriority as Priority)
    : "balanced";

  const criteria: SearchCriteria = {
    targetKcal: num(sp.kcal),
    targetProteinG: num(sp.protein),
    maxPriceKrw: num(sp.price),
    maxDistanceM: num(sp.distance),
    priority,
  };

  if (!criteria.targetKcal && !criteria.targetProteinG) {
    return (
      <>
        <PageHeading title="추천 메뉴" />
        <ErrorMessage>칼로리나 단백질 목표를 하나 이상 입력해 주세요.</ErrorMessage>
        <ButtonLink href={editHref(sp)} className="self-start"><SlidersHorizontal data-icon="inline-start" />조건 입력하기</ButtonLink>
      </>
    );
  }

  const lat = coord(sp.lat);
  const lng = coord(sp.lng);

  const location =
    lat !== undefined &&
    lng !== undefined &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
      ? { lat, lng }
      : undefined;

  const { results, widenFactor, restaurantInfo } =
    await searchMeals(criteria, location);

  // Include restaurants that have matching meals and valid coordinates.
  const places = Object.values(restaurantInfo)
    .filter(
      (r) =>
        r.lat !== null &&
        r.lng !== null &&
        results.some(
          (x) => x.candidate.restaurantId === r.id
        )
    )
    .map((r) => ({
      id: r.id,
      name: r.name,
      lat: r.lat as number,
      lng: r.lng as number,
    }));

  return (
    <>
      <PageHeading title="추천 메뉴" description={summary(criteria)}
        action={<ButtonLink href={editHref(sp)} variant="outline"><SlidersHorizontal data-icon="inline-start" />조건 바꾸기</ButtonLink>} />

      {criteria.maxDistanceM !== undefined && !location && (
        <Alert>
          <MapPinOff />
          <AlertDescription>위치가 설정되지 않아 거리 제한은 적용하지 않았습니다.</AlertDescription>
        </Alert>
      )}

      {widenFactor > 1 && (
        <Alert>
          <Sparkles />
          <AlertDescription>조건에 딱 맞는 메뉴가 부족해 허용 범위를 {widenFactor}배까지 넓혀 찾았습니다.</AlertDescription>
        </Alert>
      )}

      {results.length === 0 ? (
        <ContentEmpty icon={SearchX} title="조건에 맞는 메뉴를 찾지 못했습니다." description="목표나 가격·거리 제한을 조금 바꿔 다시 찾아 보세요.">
          <ButtonLink href={editHref(sp)}><SlidersHorizontal data-icon="inline-start" />조건 바꾸기</ButtonLink>
        </ContentEmpty>
      ) : (
        <>
          {places.length > 0 && (
            <Card className="py-0">
              <CardContent className="px-0">
                <MapLoader places={places} user={location} />
              </CardContent>
            </Card>
          )}

          <ol className="grid gap-4 md:grid-cols-2">
            {results.map((r, i) => (
              <MealCard
                key={r.candidate.menuItemId}
                rank={i + 1}
                result={r}
                restaurantName={
                  restaurantInfo[r.candidate.restaurantId]?.name
                }
                targetKcal={criteria.targetKcal}
                targetProteinG={criteria.targetProteinG}
              />
            ))}
          </ol>
        </>
      )}
    </>
  );
}

export default function ResultsPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  return (
    <PageMain>
      <BackLink href="/search">메뉴 찾기</BackLink>
      <Suspense fallback={<PageLoading />}>
        <Results searchParams={searchParams} />
      </Suspense>
      <p className="text-xs text-muted-foreground">
        추천은 참고용이며 전문 의료 상담을 대신하지 않습니다. 가게가 제공한 값이 아니면 추정값으로 표시합니다.
      </p>
    </PageMain>
  );
}
