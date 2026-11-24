import { showNutrition, type NutritionSource } from "@/lib/menu";
import { cn } from "@/lib/utils";

export function NutritionValue({ value, unit, source }: { value: number | null; unit: string; source: NutritionSource }) {
  return <span className={cn("tabular-nums", value === null && "text-muted-foreground")}>{showNutrition(value, unit, source)}</span>;
}
