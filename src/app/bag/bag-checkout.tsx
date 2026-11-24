"use client";

import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { ButtonLink } from "@/components/button-link";
import { InputField, NativeSelectField } from "@/components/form-fields";
import { ContentEmpty, ErrorMessage, PageLoading } from "@/components/page-ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup, FieldSet } from "@/components/ui/field";
import { NativeSelectOption } from "@/components/ui/native-select";
import { maxBagQuantity, selectionKey, type BagLine, type BagQuote, type QuotedLine } from "@/lib/bag";
import { finishBagCheckout, setBagQuantity, useBag } from "@/lib/bag-storage";
import { won } from "@/lib/menu";
import { checkoutBag, quoteBag } from "./actions";

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

  if (!ready) return <PageLoading />;
  if (!bag) return (
    <ContentEmpty icon={ShoppingBag} title="장바구니가 비어 있습니다.">
      <ButtonLink href="/restaurants">메뉴 둘러보기<ArrowRight data-icon="inline-end" /></ButtonLink>
    </ContentEmpty>
  );

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
    <form action={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <input type="hidden" name="bag" value={JSON.stringify(bag)} />
      <input type="hidden" name="revision" value={current?.quote?.revision ?? ""} />
      <FieldSet disabled={pending} className="min-w-0">
        {[...groups].map(([restaurantId, group]) => (
          <Card key={restaurantId ?? "unknown"}>
            <CardHeader>
              <CardTitle><h2>{group.name}</h2></CardTitle>
              {restaurantId && <CardAction>
                <ButtonLink href={`/restaurants/${restaurantId}`} variant="ghost" size="sm">
                  메뉴 더 담기<Plus data-icon="inline-end" />
                </ButtonLink>
              </CardAction>}
            </CardHeader>
            <CardContent>
              <ul className="divide-y border-t">
                {group.lines.map(({ selection, quote }) => (
                  <li key={quote.key} className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 py-4 last:pb-0">
                    <div className="flex min-w-0 flex-col items-start gap-1">
                      <p className="font-medium">{quote.name}</p>
                      {quote.portions.length > 0 && <div className="flex flex-wrap gap-1.5">
                        {quote.portions.map((portion, index) => <Badge key={index} variant="secondary">{portion}</Badge>)}
                      </div>}
                      {quote.error && <p className="text-sm text-destructive">{quote.error}</p>}
                      {quote.unitPrice !== null && <p className="font-semibold tabular-nums">{won.format(quote.unitPrice * selection.quantity)}</p>}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Button type="button" variant="outline" size="icon" aria-label={`${quote.name} 수량 줄이기`} disabled={selection.quantity <= 1}
                        onClick={() => setBagQuantity(customerId, quote.key, selection.quantity - 1)}><Minus /></Button>
                      <span className="w-6 text-center tabular-nums" aria-label="수량">{selection.quantity}</span>
                      <Button type="button" variant="outline" size="icon" aria-label={`${quote.name} 수량 늘리기`} disabled={selection.quantity >= maxBagQuantity}
                        onClick={() => setBagQuantity(customerId, quote.key, selection.quantity + 1)}><Plus /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label={`${quote.name} 삭제`}
                        onClick={() => setBagQuantity(customerId, quote.key, 0)}><Trash2 /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
            {Boolean(restaurantId && groups.size > 1 && current?.quote?.revision) && (
              <CardFooter className="justify-between gap-2">
                <span className="text-muted-foreground">식당 소계</span>
                <span className="font-semibold tabular-nums">{won.format(group.subtotal)}</span>
              </CardFooter>
            )}
          </Card>
        ))}
      </FieldSet>
      <FieldSet disabled={pending} className="min-w-0 lg:sticky lg:top-6">
        <Card>
          <CardHeader>
            <CardTitle><h2>주문 정보</h2></CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {groups.size > 1 && <p className="text-sm text-muted-foreground">한 번에 결제하고 식당별로 주문을 접수합니다.</p>}
              <InputField label="배달 위치" name="address" required value={address} maxLength={100}
                placeholder="예: N14 로비" onChange={(event) => setAddress(event.target.value)} />
              <NativeSelectField label="모의 결제 결과" name="payment" value={payment}
                onChange={(event) => setPaymentChoice({ requestId: bag.requestId, value: event.target.value })}>
                <NativeSelectOption value="approve">승인</NativeSelectOption>
                <NativeSelectOption value="decline">거절</NativeSelectOption>
              </NativeSelectField>
              {declined && <ErrorMessage>모의 결제가 거절되었습니다. 다시 시도할 수 있습니다. <Link href={`/orders#${declined.orderId}`}>주문 내역</Link></ErrorMessage>}
              {error && (!error.staleQuote || stale) && <ErrorMessage>{error.error}</ErrorMessage>}
              {!current && <p role="status" className="text-sm text-muted-foreground">메뉴와 가격 확인 중…</p>}
              {current && !current.quote && <ErrorMessage>메뉴를 불러올 수 없습니다.</ErrorMessage>}
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3">
            <dl className="flex items-center justify-between gap-3" aria-live="polite">
              <dt className="font-semibold">총 결제 금액</dt>
              <dd className="text-xl font-bold tabular-nums">{current?.quote?.revision ? won.format(total) : "—"}</dd>
            </dl>
            <Button type="submit" size="lg" disabled={!canCheckout}>
              <ShoppingBag data-icon="inline-start" />{pending ? "처리 중…" : "한 번에 모의 주문하기"}
            </Button>
            {(stale || (current && !current.quote?.revision)) && <Button type="button" variant="outline"
              onClick={() => setReload((value) => value + 1)}>메뉴 및 가격 새로고침</Button>}
          </CardFooter>
        </Card>
      </FieldSet>
    </form>
  );
}
