import { NotebookPen, Scale, Settings2, Target, UserRound } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dayLabel, goalModeLabels } from "@/lib/diet/labels";
import type { DayTotals } from "@/lib/diet/meals";
import type { GoalRow } from "@/lib/diet/rows";
import { ProgressRing } from "./progress-ring";

/**
 * One day's calorie and protein progress (FR-08..11, IR-01, NFR-14). Shown on the home page (today)
 * and on /diary (selected day). Uses the goal that applied on that day.
 */
export function DayDashboard({ date, today, goal, firstGoalDate, totals, headingLevel = "h2", diaryLink = false }: {
  date: string;
  today: string;
  goal: GoalRow | null;
  /** Earliest goal version, or null when the user never set a goal. */
  firstGoalDate: string | null;
  totals: DayTotals;
  headingLevel?: "h1" | "h2";
  /** Show a "식사 기록하기" button (home page). */
  diaryLink?: boolean;
}) {
  const Heading = headingLevel;
  const isToday = date === today;
  const goalNote = goal
    ? `${goal.goal_mode === "maintenance" ? goalModeLabels.maintenance : `${goalModeLabels[goal.goal_mode]} ${goal.adjustment_kcal} kcal`} 목표`
    : firstGoalDate ? "이 날은 목표가 없었습니다." : "아직 목표가 없습니다.";

  return (
    <Card>
      <CardHeader>
        <CardTitle><Heading>{isToday ? "오늘의 식단" : `${dayLabel(date)} 식단`}</Heading></CardTitle>
        <CardDescription>{goalNote} · 기록 {totals.count}건</CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-1">
          <ButtonLink href="/goals" variant="ghost" size="sm"><Settings2 data-icon="inline-start" />목표</ButtonLink>
          <ButtonLink href="/profile" variant="ghost" size="sm"><UserRound data-icon="inline-start" />신체 정보</ButtonLink>
          <ButtonLink href="/weight" variant="ghost" size="sm"><Scale data-icon="inline-start" />체중</ButtonLink>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-2 justify-items-center gap-4">
          <ProgressRing label="칼로리" unit="kcal" intake={totals.kcal} target={goal?.calorie_target_kcal ?? null} />
          <ProgressRing label="단백질" unit="g" intake={totals.proteinG} target={goal?.protein_target_g ?? null} />
        </div>
        <Notes totals={totals} />
        {(!goal && !firstGoalDate) || diaryLink ? (
          <div className="flex flex-wrap gap-2">
            {!goal && !firstGoalDate && <ButtonLink href="/goals"><Target data-icon="inline-start" />목표 설정하기</ButtonLink>}
            {diaryLink && (
              <ButtonLink href={isToday ? "/diary" : `/diary?date=${date}`} variant={goal || firstGoalDate ? "default" : "outline"}>
                <NotebookPen data-icon="inline-start" />식사 기록하기
              </ButtonLink>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function Notes({ totals }: { totals: DayTotals }) {
  const notes: string[] = [];
  if (totals.count === 0) notes.push("아직 기록이 없습니다.");
  else {
    if (totals.kcalMissing === totals.count) notes.push(`기록 ${totals.count}건 모두 칼로리 정보가 없습니다.`);
    else if (totals.kcalMissing > 0) notes.push(`칼로리 정보 없는 기록 ${totals.kcalMissing}건은 빠져 있어 실제 섭취량은 더 많을 수 있습니다.`);
    if (totals.proteinMissing === totals.count) notes.push(`기록 ${totals.count}건 모두 단백질 정보가 없습니다.`);
    else if (totals.proteinMissing > 0) notes.push(`단백질 정보 없는 기록 ${totals.proteinMissing}건은 빠져 있어 실제 섭취량은 더 많을 수 있습니다.`);
  }
  if (!notes.length) return null;
  return (
    <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
      {notes.map((note) => <li key={note}>{note}</li>)}
    </ul>
  );
}
