import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorMessage, PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { requireAccount } from "@/lib/auth";
import { dateInKorea } from "@/lib/korea-date";
import { dietClient, goalTargets, hasCalculatedTarget, loadGoalOn, loadProfile } from "@/lib/diet/data";
import { ProfileForm } from "./profile-form";

export default function ProfilePage() {
  return (
    <PageMain className="max-w-3xl">
      <PageHeading title="신체 정보" description="입력한 정보로 하루 칼로리·단백질 목표를 추천합니다." />
      <Suspense fallback={<PageLoading />}><ProfileSection /></Suspense>
    </PageMain>
  );
}

async function ProfileSection() {
  await connection();
  const account = await requireAccount("customer");
  const supabase = await dietClient();
  const [profile, goal] = await Promise.all([
    loadProfile(supabase, account.id),
    loadGoalOn(supabase, account.id, dateInKorea()),
  ]);
  if (profile.error || goal.error) return <ErrorMessage>신체 정보를 불러올 수 없습니다. 잠시 후 다시 시도해 주세요.</ErrorMessage>;

  const current = goal.data && hasCalculatedTarget(goal.data)
    ? { goalMode: goal.data.goal_mode, adjustmentKcal: goal.data.adjustment_kcal, targets: goalTargets(goal.data) }
    : null;

  return <ProfileForm profile={profile.data} goal={current} />;
}
