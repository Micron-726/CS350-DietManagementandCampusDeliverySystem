"use client";

import { useState } from "react";
import type { ComponentOptions, RankedResult } from "@/lib/ranking";

type Props = {
  result: RankedResult;
  restaurantName?: string;
  targetKcal?: number;
  targetProteinG?: number;
};

export default function MealCard({ result, restaurantName, targetKcal, targetProteinG }: Props) {
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
    <div className="rounded border p-4">
      <div className="flex justify-between">
        <h2 className="font-semibold">{meal.name}</h2>
        <span className="text-sm text-gray-500">{restaurantName}</span>
      </div>

      <p className="text-sm">
        {kcal ?? "?"} kcal · {protein ?? "?"} g protein · {price.toLocaleString()} KRW
      </p>

      {(targetKcal || targetProteinG) && (
        <p className="text-xs text-gray-500">
          {targetKcal && kcal !== null ? `Calories ${percent(kcal, targetKcal)}` : ""}
          {targetProteinG && protein !== null ? ` · Protein ${percent(protein, targetProteinG)}` : ""}
        </p>
      )}

      {comps.length > 0 && (
        <div className="mt-3 space-y-2">
          {comps.map((comp) => {
            const index = picked[comp.componentId];
            const level = comp.levels[index];
            const name = level.componentName;
            // a slider only makes sense with 2 or more levels
            if (comp.levels.length < 2) {
              return (
                <p key={comp.componentId} className="text-xs text-gray-500">
                  {name}: {level.label}
                </p>
              );
            }
            return (
              <label key={comp.componentId} className="block text-xs">
                <span className="flex justify-between">
                  <span>{name}</span>
                  <span className="font-medium">{level.label}</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={comp.levels.length - 1}
                  step={1}
                  value={index}
                  onChange={(e) =>
                    setPicked((p) => ({ ...p, [comp.componentId]: Number(e.target.value) }))
                  }
                  className="w-full"
                />
              </label>
            );
          })}
        </div>
      )}

      {!changed && result.violations.length > 0 && (
        <p className="mt-2 text-xs text-red-600">Misses: {result.violations.join(", ")}</p>
      )}
      {!result.exact && <p className="text-xs text-gray-400">Nutrition values are estimates</p>}
    </div>
  );
}