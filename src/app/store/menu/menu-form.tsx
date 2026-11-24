"use client";

import { useActionState, useRef, useState } from "react";
import { menuComponentLabels, nutritionLabels, type MenuComponentType, type NutritionSource } from "@/lib/menu";
import { emptyLevel, type ComponentDraft, type LevelDraft } from "./draft";

const input = "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600 dark:[color-scheme:dark]";
const secondary = "rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-600 dark:hover:bg-neutral-800";

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
    <div className="grid grid-cols-2 gap-2">
      <label className="grid gap-1 text-sm">{label}
        <input name={name} type="number" step="any" min={delta ? undefined : 0}
          className={input} value={value} onChange={(event) => onValue(event.target.value)} />
      </label>
      <label className="grid gap-1 text-sm">{label} 출처
        <select name={name ? `${name}Source` : undefined} className={input}
          value={source} onChange={(event) => onSource(event.target.value as NutritionSource)}>
          {Object.entries(nutritionLabels).filter(([key]) => key !== "user" || key === source).map(([key, text]) =>
            <option key={key} value={key}>{text}</option>)}
        </select>
      </label>
    </div>
  );
}

type InitialMenu = {
  name: string;
  category: string | null;
  description: string | null;
  basePriceKrw: number;
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

  return (
    <form action={submit}>
      <fieldset disabled={busy} className="grid gap-6">
        <section className="grid gap-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
          <h2 className="text-lg font-semibold">메뉴 정보</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">메뉴명<input className={input} name="name" required maxLength={160} value={menu.name} onChange={(event) => updateMenu({ name: event.target.value })} /></label>
            <label className="grid gap-1 text-sm">분류<input className={input} name="category" maxLength={80} value={menu.category} onChange={(event) => updateMenu({ category: event.target.value })} /></label>
            <label className="grid gap-1 text-sm">기본 가격 (원)<input className={input} name="price" type="number" required min={0} step={1} value={menu.price} onChange={(event) => updateMenu({ price: event.target.value })} /></label>
            <label className="flex items-center gap-2 self-end py-2"><input name="available" type="checkbox" checked={menu.available} onChange={(event) => updateMenu({ available: event.target.checked })} /> 판매 중</label>
          </div>
          <label className="grid gap-1 text-sm">설명<textarea className={input} name="description" rows={3} maxLength={2000} value={menu.description} onChange={(event) => updateMenu({ description: event.target.value })} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <NutritionField label="열량 (kcal)" name="kcal" value={menu.kcal} source={menu.kcalSource} onValue={(kcal) => updateMenu({ kcal })} onSource={(kcalSource) => updateMenu({ kcalSource })} />
            <NutritionField label="단백질 (g)" name="protein" value={menu.protein} source={menu.proteinSource} onValue={(protein) => updateMenu({ protein })} onSource={(proteinSource) => updateMenu({ proteinSource })} />
          </div>
          <p className="text-sm text-neutral-500">영양 정보가 없으면 수치를 비워 두세요.</p>
        </section>

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">재료 및 양 옵션</h2>
              <p className="text-sm text-neutral-500">기본 옵션은 메뉴 가격과 영양에 포함됩니다. 다른 옵션에는 기본 대비 차이를 입력하세요.</p>
            </div>
            <button className={secondary} type="button" onClick={addComponent}>재료 추가</button>
          </div>
          {components.map((component) => (
            <div key={component.key} className="grid gap-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
              <div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="grid gap-1 text-sm">재료명<input className={input} value={component.name} required maxLength={100}
                  onChange={(event) => changeComponent(component.key, (current) => ({ ...current, name: event.target.value }))} /></label>
                <label className="grid gap-1 text-sm">재료 종류<select className={input} value={component.type}
                  onChange={(event) => changeComponent(component.key, (current) => ({ ...current, type: event.target.value as MenuComponentType }))}>
                  {Object.entries(menuComponentLabels).map(([key, text]) => <option key={key} value={key}>{text}</option>)}
                </select></label>
                <button className={secondary} type="button" onClick={() => setComponents((current) => current.filter((entry) => entry.key !== component.key))}>재료 삭제</button>
              </div>
              {component.levels.map((level) => (
                <fieldset key={level.key} className="grid gap-3 rounded-lg bg-neutral-100 p-4 dark:bg-neutral-900">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="grid flex-1 gap-1 text-sm">옵션명<input className={input} value={level.label} required maxLength={80}
                      onChange={(event) => changeLevel(component, level.key, { label: event.target.value })} /></label>
                    <label className="flex items-center gap-2 py-2 text-sm"><input type="radio" name={`default-${component.key}`} checked={level.isDefault}
                      onChange={() => changeComponent(component.key, (current) => ({ ...current, levels: current.levels.map((entry) => ({
                        ...entry, isDefault: entry.key === level.key,
                        ...(entry.isDefault && entry.key !== level.key ? { kcal: "", protein: "", price: "0" } : {}),
                      })) }))} /> 기본</label>
                    {!level.isDefault && <button className={secondary} type="button" onClick={() => changeComponent(component.key, (current) => ({
                      ...current, levels: current.levels.filter((entry) => entry.key !== level.key),
                    }))}>옵션 삭제</button>}
                  </div>
                  {!level.isDefault && (
                    <div className="grid gap-3 lg:grid-cols-[1fr_2fr_2fr]">
                      <label className="grid gap-1 text-sm">가격 차이 (원)<input className={input} type="number" step={1} value={level.price} required
                        onChange={(event) => changeLevel(component, level.key, { price: event.target.value })} /></label>
                      <NutritionField label="열량 차이 (kcal)" value={level.kcal} source={level.kcalSource} delta
                        onValue={(value) => changeLevel(component, level.key, { kcal: value })}
                        onSource={(value) => changeLevel(component, level.key, { kcalSource: value })} />
                      <NutritionField label="단백질 차이 (g)" value={level.protein} source={level.proteinSource} delta
                        onValue={(value) => changeLevel(component, level.key, { protein: value })}
                        onSource={(value) => changeLevel(component, level.key, { proteinSource: value })} />
                    </div>
                  )}
                </fieldset>
              ))}
              <button className={`${secondary} justify-self-start`} type="button" onClick={() => addLevel(component)}>양 옵션 추가</button>
            </div>
          ))}
        </section>
        <input type="hidden" name="components" value={JSON.stringify(components)} />
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
        <button className="justify-self-start rounded-md bg-emerald-700 px-5 py-2 font-semibold text-white disabled:opacity-60">{busy ? "저장 중…" : "메뉴 저장"}</button>
      </fieldset>
    </form>
  );
}
