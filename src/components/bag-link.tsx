"use client";

import Link from "next/link";
import { useBag } from "@/lib/bag-storage";

export function BagLink({ customerId }: { customerId: string }) {
  const { bag } = useBag(customerId);
  const count = bag?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  return <Link href="/bag" className="font-medium underline underline-offset-4">장바구니{count > 0 && ` (${count})`}</Link>;
}
