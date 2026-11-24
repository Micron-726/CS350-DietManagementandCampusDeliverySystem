import { ChevronDown, ReceiptText } from "lucide-react";
import type { ReactNode } from "react";
import { ErrorMessage } from "@/components/page-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { won } from "@/lib/menu";
import type { OrderDetails } from "@/lib/order-data";
import { deliveryLabels, demoPaymentMethod, orderLabels, paymentLabels } from "@/lib/order-status";

const date = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" });
const eventLabels: Record<string, Record<string, string>> = { delivery: deliveryLabels, order: orderLabels, payment: paymentLabels };

export function OrderCard({ order, children }: { order: OrderDetails; children?: ReactNode }) {
  const payment = order.payments[0];
  const status = order.status === "confirmed" || order.status === "completed"
    ? (order.delivery ? deliveryLabels[order.delivery.status] : orderLabels[order.status])
    : orderLabels[order.status];
  const statusVariant = order.status === "failed" || order.status === "cancelled" || order.delivery?.status === "failed"
    ? "destructive" : order.status === "completed" ? "secondary" : "outline";

  return (
    <article id={order.id} className="scroll-mt-4 rounded-xl target:ring-2 target:ring-primary/60">
      <Card>
        <CardHeader>
          <CardTitle><h3>{order.restaurant.name}</h3></CardTitle>
          <CardDescription>{date.format(order.createdAt)}{payment?.method === demoPaymentMethod ? " · 모의 주문" : ""}</CardDescription>
          <CardAction><Badge variant={statusVariant}>{status}</Badge></CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {order.providerOrderId && <p className="break-all text-muted-foreground">주문 번호 {order.providerOrderId}</p>}
          <ul className="divide-y border-y">
            {order.items.map((item) => (
              <li key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3">
                <div className="flex flex-col gap-1">
                  <p className="font-medium">{item.name} × {item.quantity}</p>
                  {item.portions.length > 0 && <p className="text-xs text-muted-foreground">{item.portions.map((portion) => `${portion.componentName} (${portion.label})`).join(" · ")}</p>}
                </div>
                <span className="tabular-nums">{won.format(item.quantity * item.unitPriceKrw)}</span>
              </li>
            ))}
          </ul>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
            <dt className="text-muted-foreground">총액</dt><dd className="font-semibold tabular-nums">{won.format(order.totalPriceKrw)}</dd>
            {payment && <><dt className="text-muted-foreground">결제</dt><dd>{paymentLabels[payment.status]}</dd></>}
            {order.delivery?.addressLabel && <><dt className="text-muted-foreground">배달 위치</dt><dd className="wrap-anywhere">{order.delivery.addressLabel}</dd></>}
          </dl>
          {order.failureReason && <ErrorMessage>{order.failureReason}</ErrorMessage>}
          {children}
        </CardContent>
        {order.events.length > 0 && (
          <CardFooter>
            <details className="group/history w-full">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <ReceiptText className="size-4" aria-hidden="true" />상태 변경 내역
                <ChevronDown className="ml-auto size-4 transition-transform group-open/history:rotate-180" aria-hidden="true" />
              </summary>
              <ol className="mt-3 flex flex-col gap-1.5">
                {order.events.map((event) => <li key={event.id}>{eventLabels[event.kind]?.[event.status] ?? event.status} · {date.format(event.occurredAt)}</li>)}
              </ol>
            </details>
          </CardFooter>
        )}
      </Card>
    </article>
  );
}
