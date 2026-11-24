"use client";

import { RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { applyRecommendation, type ApplyState } from "./actions";

const initialState: ApplyState = { message: null, changed: false };

export function RecommendationBanner({ change }: { change: string }) {
  const [state, formAction, pending] = useActionState(applyRecommendation, initialState);
  return (
    <Alert role="status">
      <RefreshCw />
      <AlertTitle>추천값이 달라졌어요. 다시 계산할까요?</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <p>신체 정보가 바뀌어 새 추천은 {change}입니다. 직접 입력한 목표는 바뀌지 않습니다.</p>
        <form action={formAction}>
          <Button type="submit" size="sm" disabled={pending}>{pending ? "적용 중…" : "새 추천값 적용"}</Button>
        </form>
        {state.message && !state.changed && <p>{state.message}</p>}
      </AlertDescription>
    </Alert>
  );
}
