"use client";

import { CircleCheck, UserRound } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { useSubmitWithoutReset } from "@/components/diet/use-submit-without-reset";
import { ErrorMessage } from "@/components/page-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import type { ProfileFields } from "@/lib/diet/goals";
import { dayLabel, nutrientNumber } from "@/lib/diet/labels";
import { type GoalContext, recalculationChange } from "@/lib/diet/recalc-preview";
import type { WeightPoint } from "@/lib/diet/weights";
import { applyWeightToProfile, type ApplyState } from "./actions";

const initialState: ApplyState = { savedAt: null, error: null, goalNotice: null };
const koreaDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" });

/** Decision B: the latest record differs from the profile weight; offer to copy it (never automatic). */
export function ApplyToProfile({ latest, differs, profileWeightKg, profile, goal }: {
  latest: WeightPoint;
  /** Hidden when the profile already has this weight, except right after applying (to show the result). */
  differs: boolean;
  profileWeightKg: number | null;
  profile: ProfileFields;
  goal: GoalContext | null;
}) {
  const [state, formAction, pending] = useActionState(applyWeightToProfile, initialState);
  const submit = useSubmitWithoutReset(formAction);
  const [recalculate, setRecalculate] = useState(false);
  // After each apply, go back to "keep the goal" (the default).
  const [handledSave, setHandledSave] = useState(state.savedAt);
  if (state.savedAt !== handledSave) {
    setHandledSave(state.savedAt);
    if (state.savedAt !== null) setRecalculate(false); // not after an error
  }
  const switchId = useId();
  const change = recalculationChange(goal, { ...profile, weightKg: latest.weightKg });

  if (!differs) {
    return state.savedAt ? (
      <Alert role="status">
        <CircleCheck />
        <AlertDescription>신체 정보의 체중을 {nutrientNumber.format(latest.weightKg)} kg으로 바꿨습니다.{state.goalNotice && ` ${state.goalNotice}`}</AlertDescription>
      </Alert>
    ) : null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>신체 정보에 반영할까요?</h2></CardTitle>
        <CardDescription>
          최근 기록 {nutrientNumber.format(latest.weightKg)} kg ({dayLabel(koreaDay.format(new Date(latest.recordedAt)))}) ·
          신체 정보 {profileWeightKg === null ? "체중 없음" : `${nutrientNumber.format(profileWeightKg)} kg`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {change && (
            <Field orientation="horizontal">
              <Switch id={switchId} name="recalculate" checked={recalculate} onCheckedChange={setRecalculate} disabled={pending} />
              <FieldContent>
                <FieldLabel htmlFor={switchId}>목표도 새 추천값으로 바꾸기</FieldLabel>
                <FieldDescription>새 추천: {change}. 끄면 지금 목표를 그대로 둡니다. 직접 입력한 목표는 바뀌지 않습니다.</FieldDescription>
              </FieldContent>
            </Field>
          )}
          {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
          <Button type="submit" variant="outline" className="self-start" disabled={pending}>
            <UserRound data-icon="inline-start" />{pending ? "반영 중…" : "이 체중을 신체 정보에 반영"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
