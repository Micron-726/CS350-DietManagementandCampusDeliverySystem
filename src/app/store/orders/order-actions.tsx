"use client";

import { useActionState } from "react";
import { ErrorMessage } from "@/components/page-ui";
import { Button } from "@/components/ui/button";
import { FieldSet } from "@/components/ui/field";
import { transitions, type Transition } from "@/lib/order-status";
import { updateOrder } from "./actions";

export function OrderActions({ orderId, actions }: { orderId: string; actions: Transition[] }) {
  const [error, action, pending] = useActionState(updateOrder.bind(null, orderId), null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FieldSet disabled={pending} className="flex-row flex-wrap gap-2">
        {actions.map((key) => <Button type="submit" key={key} name="transition" value={key} variant={key === "reject" ? "outline" : "default"}>{transitions[key]}</Button>)}
      </FieldSet>
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </form>
  );
}
