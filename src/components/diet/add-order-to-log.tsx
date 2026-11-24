"use client";

import { BookCheck, NotebookPen } from "lucide-react";
import { useActionState } from "react";
import { ButtonLink } from "@/components/button-link";
import { ErrorMessage } from "@/components/page-ui";
import { Button } from "@/components/ui/button";
import { addOrderToLog, type OrderLogState } from "@/lib/diet/order-actions";

/**
 * FR-15: shown on a confirmed/completed order card (OrderCard children). `loggedDate` is the date
 * of the existing food-log entry, or null when the order isn't logged yet.
 */
export function AddOrderToLog({ orderId, loggedDate }: { orderId: string; loggedDate: string | null }) {
  const [state, formAction, pending] = useActionState<OrderLogState>(() => addOrderToLog(orderId), {
    status: "idle", message: null, date: null,
  });
  const date = state.date ?? loggedDate;
  const logged = state.status === "added" || state.status === "exists" || loggedDate !== null;

  if (logged && date) {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground"><BookCheck className="size-4" aria-hidden="true" />식사 기록에 추가됨</span>
        <ButtonLink href={`/diary?date=${date}`} variant="link" size="sm" className="px-0">기록 보기</ButtonLink>
      </div>
    );
  }
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <NotebookPen data-icon="inline-start" />{pending ? "추가 중…" : "식사 기록에 추가"}
      </Button>
      {state.status === "error" && state.message && <ErrorMessage>{state.message}</ErrorMessage>}
    </form>
  );
}
