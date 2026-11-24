"use client";

import { CircleCheck, Info } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { SelectField, TextField } from "@/components/diet/fields";
import { useSubmitWithoutReset } from "@/components/diet/use-submit-without-reset";
import { ErrorMessage } from "@/components/page-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import type { ProfileRow } from "@/lib/diet/rows";
import { ACTIVITY_FACTORS, type ActivityLevel } from "@/lib/diet/goals";
import { activityLabels, sexLabels } from "@/lib/diet/labels";
import { type GoalContext, recalculationChange } from "@/lib/diet/recalc-preview";
import { PROFILE_LIMITS, parseProfileInput } from "@/lib/diet/validation";
import { saveProfile, type ProfileState } from "./actions";

type CurrentGoal = GoalContext | null;

const initialState: ProfileState = { savedAt: null, error: null, fieldErrors: {}, goalNotice: null };
const text = (value: number | string | null) => (value === null ? "" : String(value));

export function ProfileForm({ profile, goal }: { profile: ProfileRow; goal: CurrentGoal }) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState);
  const submit = useSubmitWithoutReset(formAction);
  const [values, setValues] = useState({
    heightCm: text(profile.height_cm),
    weightKg: text(profile.weight_kg),
    age: text(profile.age),
    sex: text(profile.sex),
    activityLevel: text(profile.activity_level),
  });
  const [recalculate, setRecalculate] = useState(false);
  // After each save, start again from "keep the goal" (the default).
  const [handledSave, setHandledSave] = useState(state.savedAt);
  if (state.savedAt !== handledSave) {
    setHandledSave(state.savedAt);
    if (state.savedAt !== null) setRecalculate(false); // not after an error
  }
  const switchId = useId();
  const update = (field: keyof typeof values) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  // C: offer to update the goal only when it has calculated targets and the recommendation changes.
  const parsed = parseProfileInput(values);
  const change = parsed.ok ? recalculationChange(goal, parsed.value) : null;
  const preview = change && `새 추천: ${change}`;

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle><h2>내 정보</h2></CardTitle>
          <CardDescription>비워 둔 항목이 있으면 목표를 추천할 수 없고, 목표를 직접 입력해야 합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="grid gap-5 sm:grid-cols-3">
            <TextField label="키 (cm)" name="heightCm" type="number" inputMode="decimal" step="0.1"
              min={PROFILE_LIMITS.heightCm.min} max={PROFILE_LIMITS.heightCm.max}
              value={values.heightCm} onChange={update("heightCm")} error={state.fieldErrors.heightCm} />
            <TextField label="체중 (kg)" name="weightKg" type="number" inputMode="decimal" step="0.1"
              min={PROFILE_LIMITS.weightKg.min} max={PROFILE_LIMITS.weightKg.max}
              value={values.weightKg} onChange={update("weightKg")} error={state.fieldErrors.weightKg} />
            <TextField label="나이 (세)" name="age" type="number" inputMode="numeric" step="1"
              min={PROFILE_LIMITS.age.min} max={PROFILE_LIMITS.age.max}
              value={values.age} onChange={update("age")} error={state.fieldErrors.age} />
          </FieldGroup>
          <FieldGroup className="mt-5 grid gap-5 sm:grid-cols-2">
            <SelectField label="성별" name="sex" value={values.sex} onChange={update("sex")} error={state.fieldErrors.sex}
              hint="기초대사량 계산식이 성별에 따라 다릅니다.">
              <NativeSelectOption value="">선택 안 함</NativeSelectOption>
              {Object.entries(sexLabels).map(([value, label]) => <NativeSelectOption key={value} value={value}>{label}</NativeSelectOption>)}
            </SelectField>
            <SelectField label="활동량" name="activityLevel" value={values.activityLevel} onChange={update("activityLevel")}
              error={state.fieldErrors.activityLevel}
              hint={values.activityLevel in activityLabels ? activityLabels[values.activityLevel as ActivityLevel].description : "평소 운동량에 가장 가까운 것을 고르세요."}>
              <NativeSelectOption value="">선택 안 함</NativeSelectOption>
              {(Object.keys(ACTIVITY_FACTORS) as ActivityLevel[]).map((level) => (
                <NativeSelectOption key={level} value={level}>{activityLabels[level].label}</NativeSelectOption>
              ))}
            </SelectField>
          </FieldGroup>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardContent>
            <Field orientation="horizontal">
              <Switch id={switchId} name="recalculate" checked={recalculate} onCheckedChange={setRecalculate} disabled={pending} />
              <FieldContent>
                <FieldLabel htmlFor={switchId}>목표도 새 추천값으로 바꾸기</FieldLabel>
                <FieldDescription>
                  {preview}. 끄면 지금 목표를 그대로 둡니다. 직접 입력한 목표는 바뀌지 않습니다.
                </FieldDescription>
              </FieldContent>
            </Field>
          </CardContent>
        </Card>
      )}

      <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        신체 정보는 본인만 볼 수 있으며 목표 추천에만 사용됩니다.
      </p>

      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      {state.savedAt && !pending && (
        <Alert key={state.savedAt} role="status">
          <CircleCheck />
          <AlertDescription>저장했습니다.{state.goalNotice && ` ${state.goalNotice}`}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" size="lg" className="self-start" disabled={pending}>{pending ? "저장 중…" : "저장"}</Button>
    </form>
  );
}
