"use client";

import { useActionState, useEffect, useState } from "react";
import { SelectField, TextField } from "@/components/diet/fields";
import { useSubmitWithoutReset } from "@/components/diet/use-submit-without-reset";
import { ErrorMessage } from "@/components/page-ui";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { NativeSelectOption } from "@/components/ui/native-select";
import { mealTypeLabels } from "@/lib/diet/labels";
import { MEAL_TYPES, timeInKorea } from "@/lib/diet/meals";
import { MEAL_LIMITS } from "@/lib/diet/validation";
import { addMeal, type MealState, updateMeal } from "./actions";

export type MealValues = { name: string; date: string; time: string; mealType: string; kcal: string; proteinG: string };

const initialState: MealState = { savedAt: null, error: null, fieldErrors: {} };

type Props =
  | { mode: "add"; today: string; initial: MealValues }
  | { mode: "edit"; today: string; initial: MealValues; mealId: string; onDone: () => void };

/** Add or edit a food entry (FR-12..14). Submits without React's form reset (see useSubmitWithoutReset). */
export function MealForm(props: Props) {
  const action = props.mode === "add" ? addMeal : updateMeal.bind(null, props.mealId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const submit = useSubmitWithoutReset(formAction);
  const [values, setValues] = useState(props.initial);
  const update = (field: keyof MealValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  // After adding, clear the form for the next entry (same day, current time).
  const [handledSave, setHandledSave] = useState(state.savedAt);
  // Only a NEW successful save resets; an error or a conflict (savedAt null) must keep the input.
  if (state.savedAt !== handledSave) {
    setHandledSave(state.savedAt);
    if (props.mode === "add" && state.savedAt !== null) setValues({ ...props.initial, time: timeInKorea() });
  }
  // After editing, close the editor.
  const onDone = props.mode === "edit" ? props.onDone : null;
  useEffect(() => {
    if (state.savedAt && onDone) onDone();
  }, [state.savedAt, onDone]);

  const errors = state.fieldErrors;
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <TextField label="음식 이름" name="name" required maxLength={MEAL_LIMITS.name} value={values.name}
        onChange={update("name")} error={errors.name} disabled={pending} />
      <FieldGroup className="grid gap-5 sm:grid-cols-2">
        {props.mode === "edit" ? (
          <TextField label="날짜" name="date" type="date" required max={props.today} value={values.date}
            onChange={update("date")} error={errors.date} disabled={pending} />
        ) : <input type="hidden" name="date" value={values.date} />}
        <TextField label="먹은 시간" name="time" type="time" required value={values.time}
          onChange={update("time")} error={errors.time ?? (props.mode === "add" ? errors.date : undefined)} disabled={pending} />
        <SelectField label="식사 구분 (선택)" name="mealType" value={values.mealType} onChange={update("mealType")}
          error={errors.mealType} disabled={pending}>
          <NativeSelectOption value="">선택 안 함</NativeSelectOption>
          {MEAL_TYPES.map((type) => <NativeSelectOption key={type} value={type}>{mealTypeLabels[type]}</NativeSelectOption>)}
        </SelectField>
      </FieldGroup>
      <FieldGroup className="grid gap-5 sm:grid-cols-2">
        <TextField label="칼로리 (kcal)" name="kcal" type="number" inputMode="decimal" step="any"
          min={MEAL_LIMITS.kcal.min} max={MEAL_LIMITS.kcal.max} placeholder="모르면 비워 두세요"
          value={values.kcal} onChange={update("kcal")} error={errors.kcal} disabled={pending} />
        <TextField label="단백질 (g)" name="proteinG" type="number" inputMode="decimal" step="any"
          min={MEAL_LIMITS.proteinG.min} max={MEAL_LIMITS.proteinG.max} placeholder="모르면 비워 두세요"
          value={values.proteinG} onChange={update("proteinG")} error={errors.proteinG} disabled={pending} />
      </FieldGroup>
      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "저장 중…" : props.mode === "add" ? "기록 추가" : "수정 저장"}
        </Button>
        {props.mode === "edit" && <Button type="button" variant="ghost" onClick={props.onDone} disabled={pending}>취소</Button>}
      </div>
    </form>
  );
}
