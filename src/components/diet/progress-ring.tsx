import { cn } from "@/lib/utils";
import { nutrientNumber } from "@/lib/diet/labels";
import { ringFor } from "@/lib/diet/progress";

/**
 * TEMPORARY circular progress ring for the diet dashboard (IR-01, FR-10).
 * Replace with the team's shared ring component (#1) when it exists; callers only pass numbers.
 */

const SIZE = 132;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ProgressRing({ label, unit, intake, target }: {
  label: string;
  unit: string;
  intake: number;
  /** null: no goal applies, so only the intake is shown. */
  target: number | null;
}) {
  const ring = target === null ? null : ringFor(intake, target);
  const intakeText = `${nutrientNumber.format(intake)} ${unit}`;

  if (!ring || ring.kind === "zero_target") {
    return (
      <figure className="flex flex-col items-center gap-2 text-center">
        <div className="grid size-[132px] place-items-center rounded-full border-[12px] border-muted">
          <span className="text-lg font-bold tabular-nums">{intakeText}</span>
        </div>
        <figcaption className="text-sm">
          <span className="font-medium">{label}</span>
          <span className="block text-muted-foreground">
            {ring ? `목표 0 ${unit} · 섭취 ${intakeText}` : `섭취 ${intakeText}`}
          </span>
        </figcaption>
      </figure>
    );
  }

  const over = ring.status === "over";
  const summary = `${label} ${intakeText} / ${nutrientNumber.format(target!)} ${unit}, ${ring.percent}%`
    + (over ? `, ${nutrientNumber.format(ring.excess)} ${unit} 초과` : ring.status === "met" ? ", 목표 달성" : "");

  return (
    <figure className="flex flex-col items-center gap-2 text-center">
      <div className="relative size-[132px]" role="img" aria-label={summary}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full -rotate-90" aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} className="stroke-muted" />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - ring.fill)}
            className={cn("transition-[stroke-dashoffset] duration-500", over ? "stroke-amber-500" : "stroke-primary")} />
        </svg>
        <div className="absolute inset-0 grid place-content-center" aria-hidden="true">
          <span className={cn("text-2xl font-bold tabular-nums", over && "text-amber-600 dark:text-amber-400")}>{ring.percent}%</span>
        </div>
      </div>
      <figcaption className="text-sm">
        <span className="font-medium">{label}</span>
        <span className="block tabular-nums">{intakeText} / {nutrientNumber.format(target!)} {unit}</span>
        <span className={cn("block", over ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
          {over
            ? `+${nutrientNumber.format(ring.excess)} ${unit} 초과`
            : ring.status === "met" ? "목표 달성" : `${nutrientNumber.format(ring.remaining)} ${unit} 남음`}
        </span>
      </figcaption>
    </figure>
  );
}
