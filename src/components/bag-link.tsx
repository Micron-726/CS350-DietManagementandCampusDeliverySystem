"use client";

import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { ButtonLink } from "@/components/button-link";
import { Badge } from "@/components/ui/badge";
import { useBag } from "@/lib/bag-storage";

export function BagLink({ customerId }: { customerId: string }) {
  const { bag } = useBag(customerId);
  const active = usePathname() === "/bag";
  const count = bag?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  return (
    <ButtonLink href="/bag" variant={active ? "secondary" : "ghost"} size="lg" aria-current={active ? "page" : undefined} aria-label={`장바구니${count > 0 ? ` (${count})` : ""}`}>
      <ShoppingBag data-icon="inline-start" />
      <span className="sr-only md:not-sr-only">장바구니</span>
      {count > 0 && <Badge variant="secondary" className="tabular-nums" aria-hidden="true">{count}</Badge>}
    </ButtonLink>
  );
}
