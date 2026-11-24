import type { ReactNode } from "react";
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

  return (
    <article id={order.id} className="scroll-mt-4 rounded-xl border border-neutral-200 p-5 target:border-emerald-600 dark:border-neutral-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{order.restaurant.name}</h3>
          <p className="mt-1 text-sm text-neutral-500">{date.format(order.createdAt)}{payment?.method === demoPaymentMethod ? " · 모의 주문" : ""}</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium dark:bg-neutral-800">{status}</span>
      </div>
      {order.providerOrderId && <p className="mt-3 break-all text-sm">주문 번호 {order.providerOrderId}</p>}
      <ul className="my-4 divide-y divide-neutral-200 border-y border-neutral-200 text-sm dark:divide-neutral-700 dark:border-neutral-700">
        {order.items.map((item) => (
          <li key={item.id} className="grid grid-cols-[1fr_auto] gap-3 py-3">
            <div><p>{item.name} × {item.quantity}</p>
              {item.portions.length > 0 && <p className="mt-1 text-neutral-500">{item.portions.map((portion) => `${portion.componentName} (${portion.label})`).join(" · ")}</p>}
            </div>
            <span className="tabular-nums">{won.format(item.quantity * item.unitPriceKrw)}</span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-neutral-500">총액</dt><dd className="font-medium tabular-nums">{won.format(order.totalPriceKrw)}</dd>
        {payment && <><dt className="text-neutral-500">결제</dt><dd>{paymentLabels[payment.status]}</dd></>}
        {order.delivery?.addressLabel && <><dt className="text-neutral-500">배달 위치</dt><dd>{order.delivery.addressLabel}</dd></>}
      </dl>
      {order.failureReason && <p className="mt-3 text-sm text-red-700 dark:text-red-300">{order.failureReason}</p>}
      {children}
      {order.events.length > 0 && (
        <details className="mt-4 text-sm">
          <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">상태 변경 내역</summary>
          <ol className="mt-2 space-y-1">
            {order.events.map((event) => <li key={event.id}>{eventLabels[event.kind]?.[event.status] ?? event.status} · {date.format(event.occurredAt)}</li>)}
          </ol>
        </details>
      )}
    </article>
  );
}
