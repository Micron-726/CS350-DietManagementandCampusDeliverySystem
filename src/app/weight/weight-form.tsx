"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/diet/confirm-dialog";
import { TextField } from "@/components/diet/fields";
import { useSubmitWithoutReset } from "@/components/diet/use-submit-without-reset";
import { ErrorMessage } from "@/components/page-ui";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { dayLabel, nutrientNumber } from "@/lib/diet/labels";
import { timeInKorea } from "@/lib/diet/meals";
import { PROFILE_LIMITS } from "@/lib/diet/validation";
import { addWeight, updateWeight, type WeightState } from "./actions";

export type WeightValues = { weightKg: string; date: string; time: string };

const initialState: WeightState = { savedAt: null, error: null, fieldErrors: {} };

type Props =
  | { mode: "add"; today: string; initial: WeightValues }
  | { mode: "edit"; today: string; initial: WeightValues; weightId: string; onDone: () => void };

/** Add or edit a weight record (FR-16/17). Submits without React's form reset. */
export function WeightForm(props: Props) {
  const action = props.mode === "add" ? addWeight : updateWeight.bind(null, props.weightId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const submit = useSubmitWithoutReset(formAction);
  const [values, setValues] = useState(props.initial);
  const update = (field: keyof WeightValues) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  // After adding, clear the weight and reset to today and the current time.
  const [handledSave, setHandledSave] = useState(state.savedAt);
  // Only a NEW successful save resets; an error or a same-date conflict (savedAt null) must keep the input.
  if (state.savedAt !== handledSave) {
    setHandledSave(state.savedAt);
    if (props.mode === "add" && state.savedAt !== null) setValues({ weightKg: "", date: props.today, time: timeInKorea() });
  }
  const onDone = props.mode === "edit" ? props.onDone : null;
  useEffect(() => {
    if (state.savedAt && onDone) onDone();
  }, [state.savedAt, onDone]);

  // Same-date record found: ask before overwriting. "아니오" keeps the typed values and saves nothing.
  const formRef = useRef<HTMLFormElement>(null);
  const [answered, setAnswered] = useState<WeightState | null>(null);
  const conflict = state.conflict && answered !== state ? state.conflict : null;
  function overwrite() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    data.set("overwrite", "yes");
    setAnswered(state);
    startTransition(() => formAction(data));
  }

  const errors = state.fieldErrors;
  return (
    <form ref={formRef} onSubmit={submit} className="flex flex-col gap-5">
      <ConfirmDialog open={conflict !== null} title="동일 날짜의 다른 기록이 있습니다. 해당 기록을 덮어씌우시겠습니까?"
        pending={pending} onConfirm={overwrite} onCancel={() => setAnswered(state)}>
        {conflict && (
          <>
            <p>{dayLabel(conflict.date)} 기록: {conflict.records.map((record) => `${record.time} ${nutrientNumber.format(record.weightKg)} kg`).join(", ")}</p>
            <p className="mt-1">예를 누르면 이 기록{conflict.records.length > 1 ? "들" : ""}이 지워지고 새로 입력한 {values.time} {values.weightKg} kg만 남습니다.</p>
          </>
        )}
      </ConfirmDialog>
      <FieldGroup className="grid gap-5 sm:grid-cols-3">
        <TextField label="체중 (kg)" name="weightKg" type="number" inputMode="decimal" step="0.1" required
          min={PROFILE_LIMITS.weightKg.min} max={PROFILE_LIMITS.weightKg.max}
          value={values.weightKg} onChange={update("weightKg")} error={errors.weightKg} disabled={pending} />
        <TextField label="날짜" name="date" type="date" required max={props.today}
          value={values.date} onChange={update("date")} error={errors.date} disabled={pending} />
        <TextField label="시간" name="time" type="time" required
          value={values.time} onChange={update("time")} error={errors.time} disabled={pending} />
      </FieldGroup>
      {state.error && <ErrorMessage>{state.error}</ErrorMessage>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{pending ? "저장 중…" : props.mode === "add" ? "기록 추가" : "수정 저장"}</Button>
        {props.mode === "edit" && <Button type="button" variant="ghost" onClick={props.onDone} disabled={pending}>취소</Button>}
      </div>
    </form>
  );
}
