"use client";

import { useActionState, useCallback, useState } from "react";
import { NutritionValue } from "@/components/nutrition-value";
import { useDismissOutside } from "@/components/diet/use-dismiss-outside";
import { ErrorMessage } from "@/components/page-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mealTypeLabels } from "@/lib/diet/labels";
import { timeInKorea } from "@/lib/diet/meals";
import type { MealRow } from "@/lib/diet/rows";
import { deleteMeal, type DeleteState } from "./actions";
import { MealForm } from "./meal-form";

const text = (value: number | null) => (value === null ? "" : String(value));

export function MealItem({ meal, today }: { meal: MealRow; today: string }) {
  const [editing, setEditing] = useState(false);
  const closeEditor = useCallback(() => setEditing(false), []);
  const [confirming, setConfirming] = useState(false);
  // "정말 삭제" goes back to "삭제" on any press outside it (or Esc).
  const cancelDelete = useCallback(() => setConfirming(false), []);
  const confirmRef = useDismissOutside<HTMLFormElement>(confirming, cancelDelete);
  const [deleteState, deleteAction, deleting] = useActionState<DeleteState>(() => deleteMeal(meal.id), { error: null });
  const time = timeInKorea(meal.eaten_at);

  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-4 gap-y-1">
            <time dateTime={meal.eaten_at} className="pt-0.5 text-sm text-muted-foreground tabular-nums">{time}</time>
            <div className="flex flex-col gap-1.5">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {meal.name}
                {meal.meal_type && <Badge variant="secondary">{mealTypeLabels[meal.meal_type]}</Badge>}
                {meal.source === "order" && <Badge variant="outline">주문</Badge>}
              </p>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                <span>칼로리 <NutritionValue value={meal.kcal} unit="kcal" source={meal.kcal_source} /></span>
                <span>단백질 <NutritionValue value={meal.protein_g} unit="g" source={meal.protein_source} /></span>
              </p>
            </div>
          </div>

          {editing ? (
            <MealForm mode="edit" mealId={meal.id} today={today} onDone={closeEditor} initial={{
              name: meal.name, date: meal.log_date, time, mealType: meal.meal_type ?? "",
              kcal: text(meal.kcal), proteinG: text(meal.protein_g),
            }} />
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
