import { Info, Target } from "lucide-react";
import { connection } from "next/server";
import { Suspense } from "react";
import { ContentEmpty, ErrorMessage, PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { dietClient, loadGoalOn, loadProfile } from "@/lib/diet/data";
import { recalculateTargets, recommendTargets } from "@/lib/diet/goals";
import { dayLabel, goalModeLabels, kcalNumber, targetSourceLabels } from "@/lib/diet/labels";
import { type GoalRow, goalTargets, hasCalculatedTarget, profileFields } from "@/lib/diet/rows";
import { GoalForm } from "./goal-form";
import { RecommendationBanner } from "./recommendation-banner";

export default function GoalsPage() {
  return (
    <PageMain className="max-w-3xl">
      <PageHeading title="목표 설정" description="하루 칼로리와 단백질 목표를 정합니다." />
      <Suspense fallback={<PageLoading />}><GoalsSection /></Suspense>
      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        목표와 추천값은 참고용이며 전문 의료 상담을 대신하지 않습니다.
      </p>
    </PageMain>
  );
}

async function GoalsSection() {
  await connection();
  const account = await requireAccount("customer");
  const supabase = await dietClient();
  const today = dateInKorea();
  const [profile, goal] = await Promise.all([loadProfile(supabase, account.id), loadGoalOn(supabase, account.id, today)]);
  if (profile.error || goal.error) return <ErrorMessage>목표 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</ErrorMessage>;

  return (
    <>
      {goal.data ? <CurrentGoal goal={goal.data} /> : (
        <ContentEmpty icon={Target} title="아직 목표가 없습니다." description="아래에서 목표를 정하면 오늘부터 적용됩니다." />
      )}
      {goal.data && <StaleRecommendation goal={goal.data} profile={profileFields(profile.data)} />}
      <GoalForm profile={profile.data} goal={goal.data} today={today} />
    </>
  );
}

function CurrentGoal({ goal }: { goal: GoalRow }) {
  const mode = goal.goal_mode === "maintenance"
    ? goalModeLabels.maintenance
    : `${goalModeLabels[goal.goal_mode]} ${goal.adjustment_kcal} kcal`;
  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>현재 목표</h2></CardTitle>
        <CardDescription>{dayLabel(goal.effective_from)}부터 적용 · {mode}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <TargetTile label="칼로리" value={`${kcalNumber.format(goal.calorie_target_kcal)} kcal`} source={goal.calorie_target_source} />
          <TargetTile label="단백질" value={`${kcalNumber.format(goal.protein_target_g)} g`} source={goal.protein_target_source} />
        </dl>
      </CardContent>
    </Card>
  );
}

function TargetTile({ label, value, source }: { label: string; value: string; source: GoalRow["calorie_target_source"] }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border p-4">
      <dt className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        {label}<Badge variant={source === "custom" ? "outline" : "secondary"}>{targetSourceLabels[source]}</Badge>
      </dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

/** Decision C: the saved profile now gives a different recommendation than the goal's calculated targets. */
function StaleRecommendation({ goal, profile }: { goal: GoalRow; profile: ReturnType<typeof profileFields> }) {
  if (!hasCalculatedTarget(goal)) return null;
  const recommendation = recommendTargets(profile, goal.goal_mode, goal.adjustment_kcal);
  if (!recommendation.ok) return null;
  const current = goalTargets(goal);
  const { targets, changed } = recalculateTargets(current, recommendation.value);
  if (!changed) return null;

  const parts: string[] = [];
  if (targets.calorieTargetKcal !== current.calorieTargetKcal) {
    parts.push(`칼로리 ${kcalNumber.format(current.calorieTargetKcal)} → ${kcalNumber.format(targets.calorieTargetKcal)} kcal`);
  }
  if (targets.proteinTargetG !== current.proteinTargetG) {
    parts.push(`단백질 ${kcalNumber.format(current.proteinTargetG)} → ${kcalNumber.format(targets.proteinTargetG)} g`);
  }
  return <RecommendationBanner change={parts.join(", ")} />;
}
