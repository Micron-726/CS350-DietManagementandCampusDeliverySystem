"use client";

import Link from "next/link";
import { CheckCircle2, Info, ShoppingBag } from "lucide-react";
import { useState, type FormEvent } from "react";
import { InputField } from "@/components/form-fields";
import { NutritionValue } from "@/components/nutrition-value";
import { ErrorMessage } from "@/components/page-ui";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup } from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { maxBagQuantity } from "@/lib/bag";
import { addToBag } from "@/lib/bag-storage";
import { defaultLevel, menuTotals, showPrice, won, type MenuItem } from "@/lib/menu";
import { cn } from "@/lib/utils";

const extraNutritionLabels = {
  carbsG: ["탄수화물", "g"], fatG: ["지방", "g"], sugarG: ["당류", "g"],
  saturatedFatG: ["포화지방", "g"], transFatG: ["트랜스지방", "g"],
  sodiumMg: ["나트륨", "mg"], fiberG: ["식이섬유", "g"],
} as const;

export function MenuOptions({ item, bagCustomerId }: { item: MenuItem; bagCustomerId: string | null }) {
  const [portionIndex, setPortionIndex] = useState(() => Object.fromEntries(item.components.map((component) =>
    [component.id, component.levels.findIndex((level) => level.id === defaultLevel(component)?.id)],
  )));
  const [quantity, setQuantity] = useState("1");
  const [feedback, setFeedback] = useState<{ error: string | null } | null>(null);
  const components = item.components.filter((component) => component.levels.length > 0);
  const levels = components.map((component) => component.levels[portionIndex[component.id]]);
  const total = menuTotals(item, levels);
  const serving = item.serviceDate ? "1식" : "1개";
  const showExtras = item.extraNutrition && levels.every((level) => level.isDefault);

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bagCustomerId) return;
    setFeedback({ error: addToBag(bagCustomerId, { itemId: item.id, levelIds: levels.map(({ id }) => id), quantity: Number(quantity) }) });
  }

  return (
    <form onSubmit={add} className={cn("grid items-start gap-5", bagCustomerId && "md:grid-cols-[minmax(0,1fr)_minmax(17rem,0.75fr)]")}>
      <div className="flex min-w-0 flex-col gap-5">
        {components.length > 0 && (
          <Card>
            <CardHeader><CardTitle><h2>재료 및 양 옵션</h2></CardTitle></CardHeader>
            <CardContent>
              <FieldGroup>
                {components.map((component, index) => {
                  const level = levels[index];
                  return (
                    <Field key={component.id}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{component.name}</span>
                        <Badge variant="secondary">{level.label}</Badge>
                      </div>
                      {component.levels.length > 1 && (
                        <Slider min={0} max={component.levels.length - 1} value={[portionIndex[component.id]]}
                          thumbLabel={component.name} valueText={level.label} className="py-2"
                          onValueChange={(values) => {
                            const value = Array.isArray(values) ? values[0] : values;
                            setPortionIndex((chosen) => ({ ...chosen, [component.id]: value }));
                          }} />
                      )}
                    </Field>
                  );
                })}
              </FieldGroup>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader>
            <CardTitle><h2>영양 정보</h2></CardTitle>
            <CardDescription>{serving} 기준</CardDescription>
          </CardHeader>
          <CardContent aria-live="polite" className="flex flex-col gap-4">
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2">
              <dt className="text-muted-foreground">가격</dt><dd className="text-right font-medium">{showPrice(total.price)}</dd>
              <dt className="text-muted-foreground">열량</dt><dd className="text-right"><NutritionValue value={total.kcal.value} unit="kcal" source={total.kcal.source} /></dd>
              <dt className="text-muted-foreground">단백질</dt><dd className="text-right"><NutritionValue value={total.protein.value} unit="g" source={total.protein.source} /></dd>
            </dl>
            {showExtras && <><Separator /><dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2">
              {(Object.keys(extraNutritionLabels) as (keyof typeof extraNutritionLabels)[]).map((key) => {
                const value = item.extraNutrition?.[key];
                const [label, unit] = extraNutritionLabels[key];
                return value === undefined ? null : (
                  <div key={key} className="contents">
                    <dt className="text-muted-foreground">{label}</dt><dd className="text-right tabular-nums">{value} {unit}</dd>
                  </div>
                );
              })}
            </dl></>}
          </CardContent>
        </Card>
      </div>
      {bagCustomerId ? (
        <Card className="md:sticky md:top-6">
          <CardHeader>
            <CardTitle><h2>주문 옵션</h2></CardTitle>
            <CardDescription>수량을 선택해 장바구니에 담으세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <InputField label="수량" type="number" min={1} max={maxBagQuantity} step={1} required value={quantity}
                onChange={(event) => setQuantity(event.target.value)} />
              {feedback && (feedback.error ? <ErrorMessage>{feedback.error}</ErrorMessage> : (
                <Alert role="status">
                  <CheckCircle2 /><AlertDescription>장바구니에 담았습니다. <Link href="/bag">장바구니 보기</Link></AlertDescription>
                </Alert>
              ))}
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            {total.price !== null && (
              <dl aria-live="polite" className="flex items-center justify-between gap-3">
                <dt className="font-medium">총액</dt>
                <dd className="text-lg font-semibold tabular-nums">{won.format(total.price * (Number(quantity) || 0))}</dd>
              </dl>
            )}
            <Button type="submit" size="lg"><ShoppingBag data-icon="inline-start" />장바구니에 담기</Button>
          </CardFooter>
        </Card>
      ) : (
        <Alert role="note"><Info /><AlertDescription>이 메뉴는 앱에서 주문할 수 없습니다.</AlertDescription></Alert>
      )}
    </form>
  );
}
