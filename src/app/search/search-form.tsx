"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Priority } from "@/lib/ranking";
import LocationButton from "./locationbutton";

export type SearchDefaults = {
  kcal?: number;
  protein?: number;
  price?: number;
  distance?: number;
  priority: Priority;
  /** Where the kcal/protein defaults came from, shown under the targets. */
  note?: string;
};

const priorities: { value: Priority; label: string }[] = [
  { value: "balanced", label: "균형" },
  { value: "calories", label: "칼로리" },
  { value: "protein", label: "단백질" },
  { value: "price", label: "가격" },
  { value: "distance", label: "거리" },
];

/**
 * Search form (IR-03). Submits a plain GET to /search/results; the field names are the ones the
 * results page reads (kcal, protein, price, distance, lat, lng, priority).
 */
export function SearchForm({ defaults }: { defaults: SearchDefaults }) {
  const [priority, setPriority] = useState<Priority>(defaults.priority);

  return (
    <form action="/search/results" method="get" className="grid items-start gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle><h2>목표</h2></CardTitle>
          <CardDescription>칼로리나 단백질 중 하나만 적어도 됩니다. 비슷한 메뉴까지 찾아 드립니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <NumberField id="kcal" label="칼로리" unit="kcal" step={10} defaultValue={defaults.kcal} />
            <NumberField id="protein" label="단백질" unit="g" step={1} defaultValue={defaults.protein} />
            {defaults.note && <FieldDescription>{defaults.note}</FieldDescription>}
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h2>조건</h2></CardTitle>
          <CardDescription>비워 두면 제한하지 않습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <NumberField id="price" label="최대 가격" unit="원" step={500} defaultValue={defaults.price} />
            <Field>
              <NumberField id="distance" label="최대 거리" unit="m" step={100} defaultValue={defaults.distance} />
              <LocationButton />
            </Field>
            <Field>
              <FieldLabel id="priority-label">가장 중요한 것</FieldLabel>
              <input type="hidden" name="priority" value={priority} />
              <ToggleGroup aria-labelledby="priority-label" variant="outline" spacing={0} className="w-full"
                value={[priority]}
                onValueChange={(value) => { if (value[0]) setPriority(value[0] as Priority); }}>
                {priorities.map((option) => (
                  <ToggleGroupItem key={option.value} value={option.value} className="flex-1 aria-pressed:bg-primary aria-pressed:text-primary-foreground">
                    {option.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <FieldDescription className="break-keep">균형은 Team 12 공식 그대로, 나머지는 고른 항목을 더 중요하게 봅니다.</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter>
          <Button type="submit" size="lg" className="w-full"><Search data-icon="inline-start" />메뉴 찾기</Button>
        </CardFooter>
      </Card>
    </form>
  );
}

function NumberField({ id, label, unit, step, defaultValue }: {
  id: string; label: string; unit: string; step: number; defaultValue?: number;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <InputGroup>
        <InputGroupInput id={id} name={id} type="number" inputMode="numeric" min={0} step={step}
          defaultValue={defaultValue} className="tabular-nums" />
        <InputGroupAddon align="inline-end"><InputGroupText>{unit}</InputGroupText></InputGroupAddon>
      </InputGroup>
    </Field>
  );
}
