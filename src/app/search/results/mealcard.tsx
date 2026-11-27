"use client";

import { ArrowRight, CookingPot } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "@/components/button-link";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { won } from "@/lib/menu";
import type { ComponentOptions, RankedResult, Violation } from "@/lib/ranking";
import { cn } from "@/lib/utils";

type Props = {
  rank: number;
  result: RankedResult;
  restaurantName?: string;
  targetKcal?: number;
  targetProteinG?: number;
};

const violationLabels: Record<Violation, string> = {
  kcal: "칼로리 범위 밖",
  protein: "단백질 범위 밖",
  price: "가격 초과",
  distance: "거리 초과",
};

const number = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 });

export default function MealCard({ rank, result, restaurantName, targetKcal, targetProteinG }: Props) {
  const meal = result.candidate;
  const comps = meal.components.filter((c) => c.levels.length > 0);

  // index of the level the ranking picked for this component
  const startIndex = (comp: ComponentOptions) => {
    const sel = result.selection.find((s) => s.componentId === comp.componentId);
    const i = comp.levels.findIndex((l) => l.levelId === sel?.levelId);
    return i >= 0 ? i : 0;
  };

  const [picked, setPicked] = useState<Record<string, number>>(() =>
    Object.fromEntries(comps.map((c) => [c.componentId, startIndex(c)])),
  );

  // base meal + the chosen level of each component
  let price = meal.basePriceKrw;
  let kcal = meal.baseKcal;
  let protein = meal.baseProteinG;
  for (const comp of comps) {
    const level = comp.levels[picked[comp.componentId]];
    price += level.priceDeltaKrw;
    kcal = kcal === null || level.kcalDelta === null ? null : kcal + level.kcalDelta;
    protein = protein === null || level.proteinDeltaG === null ? null : protein + level.proteinDeltaG;
  }

  const changed = comps.some((c) => picked[c.componentId] !== startIndex(c));
  const percent = (value: number, target: number) => {
    const p = Math.round(((value - target) / target) * 100);
    return `${p > 0 ? "+" : ""}${p}%`;
  };

  return (
    <li className="min-w-0">
      <Card className="h-full">
        <CardHeader>
          <CardDescription className="flex items-center gap-1.5">
            <CookingPot className="size-3.5 shrink-0" aria-hidden="true" />{restaurantName}
          </CardDescription>
          <CardTitle>
            <h2 className="flex items-baseline gap-2">
              <span className="text-muted-foreground tabular-nums" aria-label={`${rank}위`}>{rank}</span>
              <span>{meal.name}</span>
            </h2>
          </CardTitle>
          <CardAction>
            {!changed && (result.violations.length === 0
              ? <Badge>조건 충족</Badge>
              : <Badge variant="destructive">{result.violations.map((v) => violationLabels[v]).join(" · ")}</Badge>)}
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <dl aria-live="polite" className="grid grid-cols-3 gap-3">
            <Stat label="열량" value={kcal === null ? null : `${number.format(kcal)} kcal`}
              note={kcal === null ? "정보 없음" : targetKcal ? `목표 ${percent(kcal, targetKcal)}` : sourceLabel(meal.kcalExact)} />
            <Stat label="단백질" value={protein === null ? null : `${number.format(protein)} g`}
              note={protein === null ? "정보 없음" : targetProteinG ? `목표 ${percent(protein, targetProteinG)}` : sourceLabel(meal.proteinExact)} />
            <Stat label="가격" value={won.format(price)} />
          </dl>

          {comps.length > 0 && (
            <FieldGroup className="gap-4">
              {comps.map((comp) => {
                const index = picked[comp.componentId];
                const level = comp.levels[index];
                const name = level.componentName;
                return (
                  <Field key={comp.componentId} className="gap-2">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span>{name}</span>
                      <Badge variant="secondary">{level.label}</Badge>
                    </div>
                    {/* a slider only makes sense with 2 or more levels (FR-29) */}
                    {comp.levels.length > 1 && (
                      <Slider min={0} max={comp.levels.length - 1} value={[index]}
                        thumbLabel={name} valueText={level.label}
                        onValueChange={(values) => {
                          const value = Array.isArray(values) ? values[0] : values;
                          setPicked((p) => ({ ...p, [comp.componentId]: value }));
                        }} />
                    )}
                  </Field>
                );
              })}
            </FieldGroup>
          )}
        </CardContent>

        <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            {result.exact ? "영양 정보: 가게 제공" : "영양 정보: 추정값"}
          </span>
          <ButtonLink href={`/restaurants/${meal.restaurantId}/${meal.menuItemId}`} variant="outline" size="sm">
            메뉴 보고 주문하기<ArrowRight data-icon="inline-end" />
          </ButtonLink>
        </CardFooter>
      </Card>
    </li>
  );
}

function sourceLabel(exact: boolean) {
  return exact ? "가게 제공" : "추정값";
}

function Stat({ label, value, note }: { label: string; value: string | null; note?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", value === null && "text-muted-foreground")}>{value ?? "—"}</dd>
      {note && <dd className="text-xs text-muted-foreground tabular-nums">{note}</dd>}
    </div>
  );
}
