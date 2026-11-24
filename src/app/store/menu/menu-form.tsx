"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import { useActionState, useId, useRef, useState } from "react";
import { InputField, NativeSelectField } from "@/components/form-fields";
import { ErrorMessage } from "@/components/page-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { menuComponentLabels, nutritionLabels, type MenuComponentType, type NutritionSource } from "@/lib/menu";
import { emptyLevel, type ComponentDraft, type LevelDraft } from "./draft";

function NutritionField({ label, name, value, source, delta, onValue, onSource }: {
  label: string;
  name?: "kcal" | "protein";
  value: string;
  source: NutritionSource;
  delta?: boolean;
  onValue: (value: string) => void;
  onSource: (value: NutritionSource) => void;
}) {
  return (
    <FieldGroup className="grid grid-cols-2 gap-3">
      <InputField label={label} name={name} type="number" step="any" min={delta ? undefined : 0}
        value={value} onChange={(event) => onValue(event.target.value)} />
      <NativeSelectField label={`${label} 출처`} name={name ? `${name}Source` : undefined}
        value={source} onChange={(event) => onSource(event.target.value as NutritionSource)}>
        {Object.entries(nutritionLabels).filter(([key]) => key !== "user" || key === source).map(([key, text]) => (
          <NativeSelectOption key={key} value={key}>{text}</NativeSelectOption>
        ))}
      </NativeSelectField>
    </FieldGroup>
  );
}

type InitialMenu = {
  name: string;
  category: string | null;
  description: string | null;
  basePriceKrw: number | null;
  sourceUrl: string | null;
  baseKcal: number | null;
  kcalSource: NutritionSource;
  baseProteinG: number | null;
  proteinSource: NutritionSource;
  isAvailable: boolean;
};

export function MenuForm({ item, initialComponents, action }: {
  item?: InitialMenu;
  initialComponents: ComponentDraft[];
  action: (previous: string | null, form: FormData) => Promise<string | null>;
}) {
  const [error, submit, busy] = useActionState(action, null);
  const [components, setComponents] = useState(initialComponents);
  const [menu, setMenu] = useState({
    name: item?.name ?? "", category: item?.category ?? "", description: item?.description ?? "",
    price: String(item?.basePriceKrw ?? ""), available: item?.isAvailable ?? true,
    kcal: String(item?.baseKcal ?? ""), kcalSource: item?.kcalSource ?? "provider",
    protein: String(item?.baseProteinG ?? ""), proteinSource: item?.proteinSource ?? "provider",
  });
  const nextKey = useRef(0);
  const formId = useId();

  function updateMenu(fields: Partial<typeof menu>) {
    setMenu((current) => ({ ...current, ...fields }));
  }

  function addComponent() {
    const key = `new-${nextKey.current++}`;
    setComponents((current) => [...current, { key, name: "", type: "other", levels: [emptyLevel(key, true)] }]);
  }

  function addLevel(component: ComponentDraft) {
    const level = emptyLevel(`new-${nextKey.current++}`, false);
    changeComponent(component.key, (current) => ({ ...current, levels: [...current.levels, level] }));
  }

  function changeComponent(key: string, update: (component: ComponentDraft) => ComponentDraft) {
    setComponents((current) => current.map((component) => component.key === key ? update(component) : component));
  }

  function changeLevel(component: ComponentDraft, key: string, fields: Partial<LevelDraft>) {
    changeComponent(component.key, (current) => ({ ...current, levels: current.levels.map((level) =>
      level.key === key ? { ...level, ...fields } : level),
    }));
  }

  function setDefaultLevel(component: ComponentDraft, level: LevelDraft) {
    changeComponent(component.key, (current) => ({
      ...current,
      levels: current.levels.map((entry) => ({
        ...entry, isDefault: entry.key === level.key,
        ...(entry.isDefault && entry.key !== level.key ? { kcal: "", protein: "", price: "0" } : {}),
      })),
    }));
  }

  return (
    <form action={submit}>
      <FieldSet disabled={busy} className="min-w-0 gap-6">
        <Card>
          <CardHeader>
            <CardTitle><h2>메뉴 정보</h2></CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <FieldGroup className="grid sm:grid-cols-2">
                <InputField label="메뉴명" name="name" required maxLength={160} value={menu.name}
                  onChange={(event) => updateMenu({ name: event.target.value })} />
                <InputField label="분류" name="category" maxLength={80} value={menu.category}
                  onChange={(event) => updateMenu({ category: event.target.value })} />
                <InputField label="기본 가격 (원)" name="price" type="number" required={!item?.sourceUrl} min={0} step={1} value={menu.price}
                  onChange={(event) => updateMenu({ price: event.target.value })} />
                <Field orientation="horizontal" className="max-w-fit self-end pb-2.5">
                  <Switch id={`${formId}-available`} name="available" checked={menu.available} disabled={busy}
                    onCheckedChange={(available) => updateMenu({ available })} />
                  <FieldLabel htmlFor={`${formId}-available`}>판매 중</FieldLabel>
                </Field>
              </FieldGroup>
              <Field>
                <FieldLabel htmlFor={`${formId}-description`}>설명</FieldLabel>
                <Textarea id={`${formId}-description`} name="description" rows={3} maxLength={2000} value={menu.description}
                  onChange={(event) => updateMenu({ description: event.target.value })} />
              </Field>
              <Separator />
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <NutritionField label="열량 (kcal)" name="kcal" value={menu.kcal} source={menu.kcalSource}
                  onValue={(kcal) => updateMenu({ kcal })} onSource={(kcalSource) => updateMenu({ kcalSource })} />
                <NutritionField label="단백질 (g)" name="protein" value={menu.protein} source={menu.proteinSource}
                  onValue={(protein) => updateMenu({ protein })} onSource={(proteinSource) => updateMenu({ proteinSource })} />
              </FieldGroup>
              <p className="text-sm text-muted-foreground">영양 정보가 없으면 수치를 비워 두세요.</p>
            </FieldGroup>
          </CardContent>
        </Card>

        <section aria-labelledby="ingredient-options" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="ingredient-options" className="text-xl font-semibold">재료 및 양 옵션</h2>
              <p className="max-w-xl text-sm text-muted-foreground">기본 옵션은 메뉴 가격과 영양에 포함됩니다. 다른 옵션에는 기본 대비 차이를 입력하세요.</p>
            </div>
            <Button type="button" variant="outline" onClick={addComponent}><Plus data-icon="inline-start" />재료 추가</Button>
          </div>
          {components.map((component) => (
            <Card key={component.key}>
              <CardHeader>
                <CardTitle><h3>{component.name || "새 재료"}</h3></CardTitle>
                <CardDescription>재료와 제공하는 양을 설정하세요.</CardDescription>
                <CardAction>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setComponents((current) => current.filter((entry) => entry.key !== component.key))}>
                    <Trash2 data-icon="inline-start" />재료 삭제
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <FieldGroup>
                  <FieldGroup className="grid sm:grid-cols-2">
                    <InputField label="재료명" value={component.name} required maxLength={100}
                      onChange={(event) => changeComponent(component.key, (current) => ({ ...current, name: event.target.value }))} />
                    <NativeSelectField label="재료 종류" value={component.type}
                      onChange={(event) => changeComponent(component.key, (current) => ({ ...current, type: event.target.value as MenuComponentType }))}>
                      {Object.entries(menuComponentLabels).map(([key, text]) => <NativeSelectOption key={key} value={key}>{text}</NativeSelectOption>)}
                    </NativeSelectField>
                  </FieldGroup>
                  {component.levels.map((level) => {
                    const defaultId = `${formId}-default-${component.key}-${level.key}`;
                    return (
                      <FieldSet key={level.key} className="min-w-0 rounded-lg border px-3 pb-3 sm:px-4">
                        <FieldLegend variant="label" className="flex items-center gap-2 px-1">양 옵션 {level.isDefault && <Badge variant="secondary">기본</Badge>}</FieldLegend>
                        <FieldGroup>
                          <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-36 flex-1">
                              <InputField label="옵션명" value={level.label} required maxLength={80}
                                onChange={(event) => changeLevel(component, level.key, { label: event.target.value })} />
                            </div>
                            <Field orientation="horizontal" className="max-w-fit self-end pb-2">
                              <input id={defaultId} type="radio" name={`default-${component.key}`} checked={level.isDefault} className="size-4 accent-primary"
                                onChange={() => setDefaultLevel(component, level)} />
                              <FieldLabel htmlFor={defaultId}>기본</FieldLabel>
                            </Field>
                            {!level.isDefault && <Button type="button" variant="ghost" onClick={() => changeComponent(component.key, (current) => ({
                              ...current, levels: current.levels.filter((entry) => entry.key !== level.key),
                            }))}><Trash2 data-icon="inline-start" />옵션 삭제</Button>}
                          </div>
                          {!level.isDefault && (
                            <FieldGroup className="grid gap-4 xl:grid-cols-[1fr_2fr_2fr]">
                              <InputField label="가격 차이 (원)" type="number" step={1} value={level.price} required
                                onChange={(event) => changeLevel(component, level.key, { price: event.target.value })} />
                              <NutritionField label="열량 차이 (kcal)" value={level.kcal} source={level.kcalSource} delta
                                onValue={(value) => changeLevel(component, level.key, { kcal: value })}
                                onSource={(value) => changeLevel(component, level.key, { kcalSource: value })} />
                              <NutritionField label="단백질 차이 (g)" value={level.protein} source={level.proteinSource} delta
                                onValue={(value) => changeLevel(component, level.key, { protein: value })}
                                onSource={(value) => changeLevel(component, level.key, { proteinSource: value })} />
                            </FieldGroup>
                          )}
                        </FieldGroup>
                      </FieldSet>
                    );
                  })}
                </FieldGroup>
              </CardContent>
              <CardFooter><Button type="button" variant="outline" onClick={() => addLevel(component)}><Plus data-icon="inline-start" />양 옵션 추가</Button></CardFooter>
            </Card>
          ))}
        </section>
        <input type="hidden" name="components" value={JSON.stringify(components)} />
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <Button type="submit" size="lg" disabled={busy} className="self-start">
          <Save data-icon="inline-start" />{busy ? "저장 중…" : "메뉴 저장"}
        </Button>
      </FieldSet>
    </form>
  );
}
