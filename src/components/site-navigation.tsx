"use client";

import { usePathname } from "next/navigation";
import { ClipboardList, House, LayoutGrid, Store } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import type { AccountRole } from "@/lib/auth";

const links = {
  customer: [
    { href: "/", label: "홈", icon: House, exact: true },
    { href: "/restaurants", label: "교내 식당", icon: Store },
    { href: "/orders", label: "내 주문", icon: ClipboardList },
  ],
  restaurant: [
    { href: "/store", label: "가게 홈", icon: House, exact: true },
    { href: "/store/menu", label: "메뉴 관리", icon: LayoutGrid },
    { href: "/store/orders", label: "주문 관리", icon: ClipboardList },
  ],
};

export function SiteNavigation({ role }: { role: AccountRole }) {
  const pathname = usePathname();
  return (
    <nav aria-label={role === "customer" ? "학생 메뉴" : "가게 관리"} className="col-span-2 row-start-2 grid grid-cols-3 gap-1 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:flex sm:justify-center">
      {links[role].map(({ href, label, icon: Icon, exact }) => {
        const active = pathname === href || (!exact && pathname.startsWith(`${href}/`));
        return (
          <ButtonLink key={href} href={href} aria-current={active ? "page" : undefined} variant={active ? "secondary" : "ghost"} size="lg"
            className="min-w-0 gap-1 px-2 has-data-[icon=inline-start]:pl-2 sm:gap-2 sm:px-3">
            <Icon data-icon="inline-start" />{label}
          </ButtonLink>
        );
      })}
    </nav>
  );
}
