import { Scale } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContentEmpty, ErrorMessage, PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { dietClient, goalTargets, hasCalculatedTarget, loadGoalOn, loadProfile, loadWeights } from "@/lib/diet/data";
import { timeInKorea } from "@/lib/diet/meals";
import { profileFields } from "@/lib/diet/rows";
import { differsFromProfile, latestRecord } from "@/lib/diet/weights";
import { ApplyToProfile } from "./apply-to-profile";
import { WeightChart } from "./weight-chart";
import { WeightForm } from "./weight-form";
import { WeightItem } from "./weight-item";

export default function WeightPage() {
  return (
    <PageMain className="max-w-3xl">
      <PageHeading title="체중 기록" description="체중을 날짜·시간과 함께 기록하고 변화를 그래프로 봅니다." />
      <Suspense fallback={<PageLoading />}><Weight /></Suspense>
    </PageMain>
  );
}

async function Weight() {
  await connection();
  const account = await requireAccount("customer");
  const today = dateInKorea();
  const supabase = await dietClient();
  const [weights, profile, goal] = await Promise.all([
    loadWeights(supabase, account.id),
    loadProfile(supabase, account.id),
    loadGoalOn(supabase, account.id, today),
  ]);
  if (weights.error || profile.error || goal.error) return <ErrorMessage>체중 기록을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</ErrorMessage>;

  const points = weights.data.map((row) => ({ recordedAt: row.recorded_at, weightKg: row.weight_kg }));
  const latest = latestRecord(points);
  const goalContext = goal.data && hasCalculatedTarget(goal.data)
    ? { goalMode: goal.data.goal_mode, adjustmentKcal: goal.data.adjustment_kcal, targets: goalTargets(goal.data) }
    : null;

  return (
    <>
      {latest && (
        <ApplyToProfile latest={latest} differs={differsFromProfile(latest, profile.data.weight_kg)}
          profileWeightKg={profile.data.weight_kg} profile={profileFields(profile.data)} goal={goalContext} />
      )}
      <WeightChart points={points} today={today} />
      <Card>
        <CardHeader>
          <CardTitle><h2>체중 추가</h2></CardTitle>
          <CardDescription>기록해도 신체 정보(프로필)의 체중은 자동으로 바뀌지 않습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <WeightForm mode="add" today={today} initial={{ weightKg: "", date: today, time: timeInKorea() }} />
        </CardContent>
      </Card>
      <section aria-labelledby="weight-list" className="flex flex-col gap-3">
        <h2 id="weight-list" className="text-xl font-bold tracking-tight">기록 목록</h2>
        {weights.data.length ? (
          <ul className="flex flex-col gap-3">
            {weights.data.map((row) => <WeightItem key={row.id} record={row} today={today} />)}
          </ul>
        ) : <ContentEmpty icon={Scale} title="아직 체중 기록이 없습니다." />}
      </section>
    </>
  );
}
