"use client";

import { LineChart as LineChartIcon } from "lucide-react";
import { useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { ContentEmpty } from "@/components/page-ui";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { nutrientNumber } from "@/lib/diet/labels";
import { chartPoints, DEFAULT_WEIGHT_RANGE, WEIGHT_RANGES, type WeightPoint, type WeightRange } from "@/lib/diet/weights";

const rangeLabels: Record<WeightRange, string> = { "30d": "30일", "90d": "90일", all: "전체" };
const chartConfig = { weightKg: { label: "체중", color: "var(--primary)" } } satisfies ChartConfig;
const axisDate = new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", timeZone: "Asia/Seoul" });
const tooltipDate = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });

/** FR-18: weight history as a line over time. Every record is its own point. */
export function WeightChart({ points, today }: { points: WeightPoint[]; today: string }) {
  const [range, setRange] = useState<WeightRange>(DEFAULT_WEIGHT_RANGE);
  const data = chartPoints(points, range, today);
  const weights = data.map(({ weightKg }) => weightKg);
  const summary = data.length
    ? `${rangeLabels[range]} 동안 ${data.length}개 기록, 최저 ${nutrientNumber.format(Math.min(...weights))} kg, 최고 ${nutrientNumber.format(Math.max(...weights))} kg`
    : `${rangeLabels[range]} 동안 기록 없음`;

  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>체중 변화</h2></CardTitle>
        <CardDescription>{summary}</CardDescription>
        <CardAction>
          <div className="flex gap-1" role="group" aria-label="그래프 기간">
            {WEIGHT_RANGES.map((value) => (
              <Button key={value} type="button" size="sm" variant={range === value ? "secondary" : "ghost"}
                aria-pressed={range === value} onClick={() => setRange(value)}>
                {rangeLabels[value]}
              </Button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {data.length === 0 ? (
          <ContentEmpty icon={LineChartIcon} title={points.length ? "이 기간에는 기록이 없습니다." : "체중을 기록하면 그래프가 그려집니다."} />
        ) : (
          <>
            <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full" role="img" aria-label={`체중 그래프: ${summary}`}>
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="time" type="number" scale="time" domain={["dataMin", "dataMax"]}
                  tickFormatter={(time: number) => axisDate.format(time)} tickLine={false} axisLine={false} minTickGap={24} padding={{ left: 12, right: 12 }} />
                <YAxis dataKey="weightKg" width={44} tickLine={false} axisLine={false} unit="kg"
                  domain={[(min: number) => Math.floor(min - 1), (max: number) => Math.ceil(max + 1)]} />
                <ChartTooltip content={<ChartTooltipContent
                  labelFormatter={(_, payload) => {
                    const time = payload?.[0]?.payload?.time;
                    return typeof time === "number" ? tooltipDate.format(time) : "";
                  }}
                  formatter={(value) => `${nutrientNumber.format(Number(value))} kg`} />} />
                <Line dataKey="weightKg" type="linear" stroke="var(--color-weightKg)" strokeWidth={2}
                  dot={{ r: 3, fill: "var(--color-weightKg)" }} activeDot={{ r: 5 }} isAnimationActive={false} />
              </LineChart>
            </ChartContainer>
            {data.length === 1 && <p className="text-sm text-muted-foreground">기록이 2개 이상이면 변화가 선으로 보입니다.</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
