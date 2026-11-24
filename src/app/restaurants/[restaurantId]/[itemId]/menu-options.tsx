"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { maxBagQuantity } from "@/lib/bag";
import { addToBag } from "@/lib/bag-storage";
import { defaultLevel, menuTotals, showNutrition, showPrice, won, type MenuItem } from "@/lib/menu";

const extraNutritionLabels = {
  carbsG: ["탄수화물", "g"], fatG: ["지방", "g"], sugarG: ["당류", "g"],
  saturatedFatG: ["포화지방", "g"], transFatG: ["트랜스지방", "g"],
  sodiumMg: ["나트륨", "mg"], fiberG: ["식이섬유", "g"],
} as const;

const input = "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600 dark:[color-scheme:dark]";

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

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!bagCustomerId) return;
    setFeedback({ error: addToBag(bagCustomerId, { itemId: item.id, levelIds: levels.map(({ id }) => id), quantity: Number(quantity) }) });
  }

  return (
    <div className="space-y-4">
      {components.length > 0 && (
        <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
          <h2 className="mb-4 font-semibold">재료 및 양 옵션</h2>
          <div className="space-y-3">
            {components.map((component) => {
              const index = portionIndex[component.id];
              const level = component.levels[index];
              return (
                <div key={component.id}>
                  {component.levels.length > 1 ? (
                    <label className="block text-sm">
                      <span className="flex justify-between gap-4"><span>{component.name}</span><span>{level.label}</span></span>
                      <input type="range" min={0} max={component.levels.length - 1} step={1} value={index} aria-valuetext={level.label}
                        className="mt-2 w-full accent-emerald-700" onChange={(event) => setPortionIndex((chosen) => ({ ...chosen, [component.id]: Number(event.target.value) }))} />
                    </label>
                  ) : <p className="text-sm">{component.name} · {level.label}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
      <dl aria-live="polite" className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-neutral-100 p-5 text-sm dark:bg-neutral-900">
        <dt>{serving} 가격</dt><dd>{showPrice(total.price)}</dd>
        <dt>{serving} 열량</dt><dd>{showNutrition(total.kcal.value, "kcal", total.kcal.source)}</dd>
        <dt>{serving} 단백질</dt><dd>{showNutrition(total.protein.value, "g", total.protein.source)}</dd>
        {item.extraNutrition && components.every((component) => component.levels[portionIndex[component.id]].isDefault) &&
          (Object.keys(extraNutritionLabels) as (keyof typeof extraNutritionLabels)[]).map((key) => {
            const value = item.extraNutrition?.[key];
            const [label, unit] = extraNutritionLabels[key];
            return value === undefined ? null : <div key={key} className="contents"><dt>{label}</dt><dd>{value} {unit}</dd></div>;
          })}
        {bagCustomerId && total.price !== null && <><dt className="font-semibold">총액</dt><dd className="font-semibold">{won.format(total.price * (Number(quantity) || 0))}</dd></>}
      </dl>
      {bagCustomerId ? (
        <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
          <label className="grid w-24 gap-1 text-sm">수량<input className={input} type="number" min={1} max={maxBagQuantity} step={1} required value={quantity}
            onChange={(event) => setQuantity(event.target.value)} /></label>
          <button className="rounded-md bg-emerald-700 px-5 py-2 font-semibold text-white">장바구니에 담기</button>
          {feedback && (feedback.error ? <p role="alert" className="w-full text-sm text-red-700 dark:text-red-300">{feedback.error}</p> : (
            <p role="status" className="w-full text-sm">장바구니에 담았습니다. <Link href="/bag" className="underline underline-offset-4">장바구니 보기</Link></p>
          ))}
        </form>
      ) : <p className="text-sm text-neutral-500">이 메뉴는 앱에서 주문할 수 없습니다.</p>}
    </div>
  );
}
