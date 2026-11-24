"use client";

import { CircleCheck } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { ButtonLink } from "@/components/button-link";
import { SelectField, TextField } from "@/components/diet/fields";
import { useSubmitWithoutReset } from "@/components/diet/use-submit-without-reset";
import { ErrorMessage } from "@/components/page-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { NativeSelectOption } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import {
  ADJUSTMENT_OPTIONS,
  type GoalMode,
  type RecommendationResult,
  type TargetSource,
  missingProfileFields,
  recommendTargets,
} from "@/lib/diet/goals";
import { dayLabel, goalModeLabels, kcalNumber, profileFieldLabels } from "@/lib/diet/labels";
import { type GoalRow, type ProfileRow, profileFields } from "@/lib/diet/rows";
import { CUSTOM_TARGET_LIMITS } from "@/lib/diet/validation";
import { saveGoal, type GoalState } from "./actions";

const initialState: GoalState = { savedAt: null, error: null, fieldErrors: {} };
const MODES: GoalMode[] = ["deficit", "maintenance", "surplus"];

export function GoalForm({ profile, goal, today }: { profile: ProfileRow; goal: GoalRow | null; today: string }) {
  const [state, formAction, pending] = useActionState(saveGoal, initialState);
  const submit = useSubmitWithoutReset(formAction);
  const body = profileFields(profile);
  const missing = missingProfileFields(body);

  const [goalMode, setGoalMode] = useState<GoalMode>(goal?.goal_mode ?? "maintenance");
  const [adjustment, setAdjustment] = useState(String(goal && goal.adjustment_kcal > 0 ? goal.adjustment_kcal : 300));
  const adjustmentKcal = goalMode === "maintenance" ? 0 : Number(adjustment);
  const recommendation = recommendTargets(body, goalMode, adjustmentKcal);
  const fallbackSource: TargetSource = recommendation.ok ? "calculated" : "custom";

  const [calorie, setCalorie] = useState({
    source: goal?.calorie_target_source ?? fallbackSource,
    value: goal?.calorie_target_source === "custom" ? String(goal.calorie_target_kcal) : "",
  });
  const [protein, setProtein] = useState({
    source: goal?.protein_target_source ?? fallbackSource,
    value: goal?.protein_target_source === "custom" ? String(goal.protein_target_g) : "",
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle><h2>목표 유형</h2></CardTitle>
          <CardDescription>추천 칼로리를 유지 칼로리보다 적게 또는 많게 잡습니다. 단백질 추천에는 영향이 없습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <FieldSet>
              <FieldLegend variant="label">모드</FieldLegend>
              <input type="hidden" name="goalMode" value={goalMode} />
              <div className="grid grid-cols-3 gap-2" role="group" aria-label="목표 모드">
                {MODES.map((mode) => (
                  <Button key={mode} type="button" variant={goalMode === mode ? "default" : "outline"} aria-pressed={goalMode === mode}
                    onClick={() => setGoalMode(mode)} disabled={pending}>
                    {goalModeLabels[mode]}
                  </Button>
                ))}
              </div>
              {state.fieldErrors.goalMode && <FieldError>{state.fieldErrors.goalMode}</FieldError>}
            </FieldSet>
            {goalMode !== "maintenance" && (
              <SelectField label="하루 조정량" name="adjustmentKcal" value={adjustment} onChange={(event) => setAdjustment(event.target.value)}
                error={state.fieldErrors.adjustmentKcal}
                hint={`유지 칼로리보다 하루 ${adjustment} kcal ${goalMode === "deficit" ? "적게" : "많게"} 먹는 목표입니다.`}>
                {ADJUSTMENT_OPTIONS.map((value) => <NativeSelectOption key={value} value={value}>{value} kcal</NativeSelectOption>)}
              </SelectField>
            )}
          </FieldGroup>
        </CardContent>
      </Card>

      <RecommendationCard recommendation={recommendation} missing={missing.map((field) => profileFieldLabels[field])} />

      <Card>
        <CardHeader>
          <CardTitle><h2>목표값</h2></CardTitle>
          <CardDescription>칼로리와 단백질을 각각 추천값으로 쓰거나 직접 입력할 수 있습니다. 직접 입력한 값은 다시 계산되지 않습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <TargetChoice name="calorie" label="칼로리" unit="kcal" limits={CUSTOM_TARGET_LIMITS.calorieKcal}
              choice={calorie} onChange={setCalorie} pending={pending}
              recommended={recommendation.ok ? recommendation.value.calorieKcal : null}
              sourceError={state.fieldErrors.calorieSource} valueError={state.fieldErrors.customCalorieKcal} />
            <TargetChoice name="protein" label="단백질" unit="g" limits={CUSTOM_TARGET_LIMITS.proteinG}
              choice={protein} onChange={setProtein} pending={pending}
              recommended={recommendation.ok ? recommendation.value.proteinG : null}
              sourceError={state.fieldErrors.proteinSource} valueError={state.fieldErrors.customProteinG} />
          </FieldGroup>
        </CardContent>
      </Card>

      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      {state.savedAt && !pending && (
        <Alert key={state.savedAt} role="status">
          <CircleCheck />
          <AlertDescription>목표를 저장했습니다. {dayLabel(today)}부터 적용됩니다.</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>{pending ? "저장 중…" : "목표 저장"}</Button>
        <p className="text-sm text-muted-foreground">저장하면 오늘({dayLabel(today)})부터 적용되고, 지난 날짜의 목표는 그대로 남습니다.</p>
      </div>
    </form>
  );
}

function RecommendationCard({ recommendation, missing }: { recommendation: RecommendationResult; missing: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>추천 계산</h2></CardTitle>
        <CardDescription>Mifflin-St Jeor 기초대사량 × 활동 계수 ± 조정량, 단백질은 체중 1kg당 1.6g입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {recommendation.ok ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Stat label="기초대사량" value={`${kcalNumber.format(recommendation.value.bmrKcal)} kcal`} />
            <Stat label="유지 칼로리" value={`${kcalNumber.format(recommendation.value.maintenanceKcal)} kcal`} />
            <Stat label="추천 칼로리" value={`${kcalNumber.format(recommendation.value.calorieKcal)} kcal`} strong />
            <Stat label="추천 단백질" value={`${kcalNumber.format(recommendation.value.proteinG)} g`} strong />
          </dl>
        ) : recommendation.reason === "incomplete_profile" ? (
          <div className="flex flex-col items-start gap-3">
            <p>추천값을 계산하려면 신체 정보가 필요합니다. 비어 있는 항목: <strong>{missing.join(", ")}</strong></p>
            <ButtonLink href="/profile" variant="outline" size="sm">신체 정보 입력</ButtonLink>
          </div>
        ) : (
          <p>입력한 신체 정보로는 추천 칼로리가 0 이하로 계산되어 추천값을 쓸 수 없습니다. 목표를 직접 입력해 주세요.</p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={strong ? "text-lg font-bold tabular-nums" : "tabular-nums"}>{value}</dd>
    </div>
  );
}

type Choice = { source: TargetSource; value: string };

function TargetChoice({ name, label, unit, limits, choice, onChange, recommended, pending, sourceError, valueError }: {
  name: "calorie" | "protein";
  label: string;
  unit: string;
  limits: { min: number; max: number };
  choice: Choice;
  onChange: (choice: Choice) => void;
  recommended: number | null;
  pending: boolean;
  sourceError?: string;
  valueError?: string;
}) {
  const switchId = useId();
  const custom = choice.source === "custom";
  const field = name === "calorie" ? "customCalorieKcal" : "customProteinG";
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <input type="hidden" name={`${name}Source`} value={choice.source} />
      <Field orientation="horizontal" data-invalid={sourceError ? true : undefined}>
        <Switch id={switchId} checked={custom} disabled={pending}
          onCheckedChange={(checked) => onChange({ ...choice, source: checked ? "custom" : "calculated" })} />
        <FieldContent>
          <FieldLabel htmlFor={switchId}>{label} 직접 입력</FieldLabel>
          <FieldDescription>
            {recommended === null
              ? custom ? "추천값을 계산할 수 없어 직접 입력합니다." : "추천값을 계산할 수 없습니다. 직접 입력을 켜 주세요."
              : custom
                ? `끄면 추천값 ${kcalNumber.format(recommended)} ${unit}을 씁니다.`
                : `추천값 ${kcalNumber.format(recommended)} ${unit}을 씁니다.`}
          </FieldDescription>
          {sourceError && <FieldError>{sourceError}</FieldError>}
        </FieldContent>
      </Field>
      {custom && (
        <TextField label={`${label} 목표 (${unit})`} name={field} type="number" inputMode="numeric" step="1"
          min={limits.min} max={limits.max} required value={choice.value} disabled={pending}
          onChange={(event) => onChange({ ...choice, value: event.target.value })} error={valueError} />
      )}
    </div>
  );
}
