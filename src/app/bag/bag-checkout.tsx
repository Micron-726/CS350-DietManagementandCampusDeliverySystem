"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { maxBagQuantity, selectionKey, type BagLine, type BagQuote, type QuotedLine } from "@/lib/bag";
import { finishBagCheckout, setBagQuantity, useBag } from "@/lib/bag-storage";
import { won } from "@/lib/menu";
import { checkoutBag, quoteBag } from "./actions";

const input = "w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 dark:border-neutral-600 dark:[color-scheme:dark]";
const stepButton = "min-h-8 min-w-8 rounded border border-neutral-300 px-2 disabled:opacity-40 dark:border-neutral-700";

type Line = { selection: BagLine; quote: QuotedLine };

export function BagCheckout({ customerId }: { customerId: string }) {
  const { ready, bag } = useBag(customerId);
  const router = useRouter();
  const [response, submit, pending] = useActionState(checkoutBag, null);
  const [address, setAddress] = useState("");
  const [paymentChoice, setPaymentChoice] = useState<{ requestId: string; value: string } | null>(null);
  const [reload, setReload] = useState(0);
  const [priced, setPriced] = useState<{ selections: string; reload: number; quote: BagQuote | null } | null>(null);
  const selections = bag ? JSON.stringify(bag.lines.map(({ itemId, levelIds }) => ({ itemId, levelIds }))) : null;
  const current = priced?.selections === selections && priced.reload === reload ? priced : null;

  useEffect(() => {
    if (!selections) return;
    let active = true;
    quoteBag(selections).then(
      (quote) => { if (active) setPriced({ selections, reload, quote }); },
      () => { if (active) setPriced({ selections, reload, quote: null }); },
    );
    return () => { active = false; };
  }, [selections, reload]);

  useEffect(() => {
    if (response && "orderId" in response) {
      finishBagCheckout(customerId, response.requestId, response.declined);
      if (!response.declined) router.replace(`/orders#${response.orderId}`);
    }
  }, [customerId, response, router]);

  if (!ready) return <p>장바구니 불러오는 중…</p>;
  if (!bag) return <p>장바구니가 비어 있습니다. <Link href="/restaurants" className="underline underline-offset-4">메뉴 둘러보기</Link></p>;

  const quoteByKey = new Map(current?.quote?.lines.map((quote) => [quote.key, quote]));
  const groups = new Map<string | null, { name: string; lines: Line[]; subtotal: number }>();
  let total = 0;
  for (const selection of bag.lines) {
    const key = selectionKey(selection);
    const quote = quoteByKey.get(key) ?? {
      key, name: "메뉴 정보 불러오는 중", restaurantId: null, restaurantName: null, unitPrice: null, portions: [],
    };
    const group = groups.get(quote.restaurantId) ?? { name: quote.restaurantName ?? "메뉴", lines: [], subtotal: 0 };
    group.lines.push({ selection, quote });
    if (quote.unitPrice !== null) {
      const amount = quote.unitPrice * selection.quantity;
      group.subtotal += amount;
      total += amount;
    }
    groups.set(quote.restaurantId, group);
  }
  const error = response && "error" in response ? response : null;
  const declined = response && "orderId" in response && response.declined ? response : null;
  const payment = paymentChoice?.requestId === bag.requestId ? paymentChoice.value : "approve";
  const stale = Boolean(error?.staleQuote && error.staleQuote === current?.quote?.revision);
  const canCheckout = Boolean(current?.quote?.revision) && !stale && !pending;

  return (
    <form action={submit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <input type="hidden" name="bag" value={JSON.stringify(bag)} />
      <input type="hidden" name="revision" value={current?.quote?.revision ?? ""} />
      <fieldset disabled={pending} className="space-y-4">
        {[...groups].map(([restaurantId, group]) => (
          <section key={restaurantId ?? "unknown"} className="rounded-xl border border-neutral-200 px-4 dark:border-neutral-700">
            <div className="flex flex-wrap items-center justify-between gap-2 py-4">
              <h2 className="font-semibold">{group.name}</h2>
              {restaurantId && <Link className="text-sm underline underline-offset-4" href={`/restaurants/${restaurantId}`}>메뉴 더 담기</Link>}
            </div>
            <ul className="divide-y divide-neutral-200 border-t border-neutral-200 dark:divide-neutral-700 dark:border-neutral-700">
              {group.lines.map(({ selection, quote }) => (
                <li key={quote.key} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="font-medium">{quote.name}</p>
                    {quote.portions.length > 0 && <p className="mt-1 text-sm text-neutral-500">{quote.portions.join(" · ")}</p>}
                    {quote.error && <p className="mt-1 text-sm text-red-700 dark:text-red-300">{quote.error}</p>}
                    {quote.unitPrice !== null && <p className="mt-1 tabular-nums">{won.format(quote.unitPrice * selection.quantity)}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <button type="button" aria-label={`${quote.name} 수량 줄이기`} className={stepButton} disabled={selection.quantity <= 1}
                      onClick={() => setBagQuantity(customerId, quote.key, selection.quantity - 1)}>−</button>
                    <span className="w-6 text-center tabular-nums" aria-label="수량">{selection.quantity}</span>
                    <button type="button" aria-label={`${quote.name} 수량 늘리기`} className={stepButton} disabled={selection.quantity >= maxBagQuantity}
                      onClick={() => setBagQuantity(customerId, quote.key, selection.quantity + 1)}>+</button>
                    <button type="button" aria-label={`${quote.name} 삭제`} className="ml-2 underline underline-offset-4"
                      onClick={() => setBagQuantity(customerId, quote.key, 0)}>삭제</button>
                  </div>
                </li>
              ))}
            </ul>
            {Boolean(restaurantId && groups.size > 1 && current?.quote?.revision) && (
              <p className="border-t border-neutral-200 py-3 text-right text-sm dark:border-neutral-700">식당 소계 {won.format(group.subtotal)}</p>
            )}
          </section>
        ))}
      </fieldset>
      <fieldset disabled={pending} className="grid gap-4 rounded-xl bg-neutral-100 p-5 dark:bg-neutral-900">
        <div className="flex items-center justify-between gap-3" aria-live="polite">
          <h2 className="font-semibold">총 결제 금액</h2>
          <p className="text-lg font-bold tabular-nums">{current?.quote?.revision ? won.format(total) : "—"}</p>
        </div>
        {groups.size > 1 && <p className="text-sm text-neutral-600 dark:text-neutral-400">한 번에 결제하고 식당별로 주문을 접수합니다.</p>}
        <label className="grid gap-1 text-sm">배달 위치<input className={input} name="address" required value={address} maxLength={100}
          placeholder="예: N14 로비" onChange={(event) => setAddress(event.target.value)} /></label>
        <label className="grid gap-1 text-sm">모의 결제 결과<select className={input} name="payment" value={payment} onChange={(event) => setPaymentChoice({ requestId: bag.requestId, value: event.target.value })}>
          <option value="approve">승인</option><option value="decline">거절</option>
        </select></label>
        {declined && <p role="alert" className="text-sm text-red-700 dark:text-red-300">모의 결제가 거절되었습니다. 다시 시도할 수 있습니다. <Link href={`/orders#${declined.orderId}`} className="underline">주문 내역</Link></p>}
        {error && (!error.staleQuote || stale) && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error.error}</p>}
        {!current && <p role="status" className="text-sm">메뉴와 가격 확인 중…</p>}
        {current && !current.quote && <p role="alert" className="text-sm text-red-700 dark:text-red-300">메뉴를 불러올 수 없습니다.</p>}
        <button disabled={!canCheckout} className="rounded-md bg-emerald-700 px-5 py-2 font-semibold text-white disabled:opacity-50">
          {pending ? "처리 중…" : "한 번에 모의 주문하기"}
        </button>
        {(stale || (current && !current.quote?.revision)) && <button type="button" className="justify-self-start text-sm underline underline-offset-4"
          onClick={() => setReload((value) => value + 1)}>메뉴 및 가격 새로고침</button>}
      </fieldset>
    </form>
  );
}
