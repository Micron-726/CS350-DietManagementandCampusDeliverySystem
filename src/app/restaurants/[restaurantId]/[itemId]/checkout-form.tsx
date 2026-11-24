"use client";

import { useActionState, useState } from "react";
import { defaultLevel, menuTotals, showNutrition, won, type MenuItem } from "@/lib/menu";

const input = "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600 dark:[color-scheme:dark]";

export function CheckoutForm({ item, requestId, action }: {
  item: MenuItem;
  requestId: string;
  action?: (previous: string | null, form: FormData) => Promise<string | null>;
}) {
  const [error, submit, busy] = useActionState(action ?? (async () => null), null);
  const [portionIndex, setPortionIndex] = useState(() => Object.fromEntries(item.components.map((component) =>
    [component.id, component.levels.findIndex((level) => level.id === defaultLevel(component)?.id)],
  )));
  const [quantity, setQuantity] = useState("1");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState("approve");
  const components = item.components.filter((component) => component.levels.length > 0);
  const total = menuTotals(item, components.map((component) => component.levels[portionIndex[component.id]]));

  return (
    <form action={submit} className="space-y-4">
      <fieldset className="space-y-4" disabled={busy}>
        <input type="hidden" name="requestId" value={requestId} />
        {components.length > 0 && (
          <div className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <h2 className="mb-4 font-semibold">재료 및 양 옵션</h2>
            <div className="space-y-3">
              {components.map((component) => {
                const index = portionIndex[component.id];
                const level = component.levels[index];
                return (
                  <div key={component.id}>
                    <input type="hidden" name="levelId" value={level.id} />
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
          <dt>1개 가격</dt><dd>{won.format(total.price)}</dd>
          <dt>1개 열량</dt><dd>{showNutrition(total.kcal.value, "kcal", total.kcal.source)}</dd>
          <dt>1개 단백질</dt><dd>{showNutrition(total.protein.value, "g", total.protein.source)}</dd>
          {action && <><dt className="font-semibold">총액</dt><dd className="font-semibold">{won.format(total.price * (Number(quantity) || 0))}</dd></>}
        </dl>
        {action ? (
          <div className="grid gap-4 rounded-xl border border-neutral-200 p-5 dark:border-neutral-700">
            <div><h2 className="font-semibold">모의 주문 및 결제</h2><p className="mt-1 text-sm text-neutral-500">테스트용으로 가상의 배달 위치를 입력해 주세요.</p></div>
            <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
              <label className="grid gap-1 text-sm">수량<input className={input} type="number" name="quantity" min={1} max={20} step={1} required value={quantity}
                onChange={(event) => setQuantity(event.target.value)} /></label>
              <label className="grid gap-1 text-sm">배달 위치<input className={input} name="address" required value={address} maxLength={100} placeholder="예: N14 로비"
                onChange={(event) => setAddress(event.target.value)} /></label>
            </div>
            <label className="grid gap-1 text-sm">모의 결제 결과<select className={input} name="payment" value={payment} onChange={(event) => setPayment(event.target.value)}>
              <option value="approve">승인</option><option value="decline">거절</option>
            </select></label>
            {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
            <button className="justify-self-start rounded-md bg-emerald-700 px-5 py-2 font-semibold text-white disabled:opacity-60">{busy ? "처리 중…" : "모의 주문하기"}</button>
          </div>
        ) : <p className="text-sm text-neutral-500">이 메뉴는 앱에서 주문할 수 없습니다.</p>}
      </fieldset>
    </form>
  );
}
