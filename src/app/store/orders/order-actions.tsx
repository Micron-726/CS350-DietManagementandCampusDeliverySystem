"use client";

import { useActionState } from "react";
import { transitions, type Transition } from "@/lib/order-status";
import { updateOrder } from "./actions";

export function OrderActions({ orderId, actions }: { orderId: string; actions: Transition[] }) {
  const [error, action, pending] = useActionState(updateOrder.bind(null, orderId), null);
  return (
    <form action={action} className="mt-4">
      <fieldset disabled={pending} className="flex flex-wrap gap-2 disabled:opacity-60">
        {actions.map((key) => <button key={key} name="transition" value={key} className={key === "reject"
          ? "rounded-md border border-neutral-400 px-4 py-2 text-sm font-semibold"
          : "rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"}>{transitions[key]}</button>)}
      </fieldset>
      {error && <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</p>}
    </form>
  );
}
