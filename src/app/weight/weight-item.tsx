"use client";

import { useActionState, useCallback, useState } from "react";
import { useDismissOutside } from "@/components/diet/use-dismiss-outside";
import { ErrorMessage } from "@/components/page-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { dayLabel, nutrientNumber } from "@/lib/diet/labels";
import { timeInKorea } from "@/lib/diet/meals";
import type { WeightRow } from "@/lib/diet/rows";
import { deleteWeight, type DeleteState } from "./actions";
import { WeightForm } from "./weight-form";

const koreaDay = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" });

export function WeightItem({ record, today }: { record: WeightRow; today: string }) {
  const [editing, setEditing] = useState(false);
  const closeEditor = useCallback(() => setEditing(false), []);
  const [confirming, setConfirming] = useState(false);
  // "정말 삭제" goes back to "삭제" on any press outside it (or Esc).
  const cancelDelete = useCallback(() => setConfirming(false), []);
  const confirmRef = useDismissOutside<HTMLFormElement>(confirming, cancelDelete);
  const [deleteState, deleteAction, deleting] = useActionState<DeleteState>(() => deleteWeight(record.id), { error: null });
  const date = koreaDay.format(new Date(record.recorded_at));
  const time = timeInKorea(record.recorded_at);

  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-xl font-bold tabular-nums">{nutrientNumber.format(record.weight_kg)} kg</p>
            <time dateTime={record.recorded_at} className="text-sm text-muted-foreground tabular-nums">{dayLabel(date)} {time}</time>
          </div>
          {editing ? (
            <WeightForm mode="edit" weightId={record.id} today={today} onDone={closeEditor}
              initial={{ weightKg: String(record.weight_kg), date, time }} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(true); setConfirming(false); }}>수정</Button>
              {confirming ? (
                <form ref={confirmRef} action={deleteAction} className="flex items-center gap-2">
                  <Button type="submit" variant="destructive" size="sm" disabled={deleting}>{deleting ? "삭제 중…" : "정말 삭제"}</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>취소</Button>
                </form>
              ) : (
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>삭제</Button>
              )}
            </div>
          )}
          {deleteState.error && <ErrorMessage>{deleteState.error}</ErrorMessage>}
        </CardContent>
      </Card>
    </li>
  );
}
