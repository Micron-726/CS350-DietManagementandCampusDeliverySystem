import { UserRound, Utensils } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { ButtonLink } from "@/components/button-link";
import { HOME_BY_ROLE, getCurrentAccount } from "@/lib/auth";
import { BagLink } from "@/components/bag-link";
import { SiteNavigation } from "@/components/site-navigation";

const headerClass = "border-b bg-card/95";
const contentClass = "mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:px-6 lg:px-8";

function SiteBrand({ href = "/login" }: { href?: string }) {
  return (
    <Link href={href} className="flex w-fit items-center gap-2.5 rounded-lg text-base font-bold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-lg">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Utensils className="size-4" aria-hidden="true" /></span>
      <span>캠퍼스 식탁</span>
    </Link>
  );
}

export function HeaderFallback() {
  return <header className={headerClass}><div className={contentClass}><SiteBrand /></div></header>;
}

export async function SiteHeader() {
  await connection();
  const account = await getCurrentAccount();
  if (!account) return <HeaderFallback />;

  return (
    <header className={headerClass}>
      <div className={contentClass}>
        <SiteBrand href={HOME_BY_ROLE[account.role]} />
        <SiteNavigation role={account.role} />
        <div className="col-start-2 row-start-1 flex items-center justify-end gap-1 sm:col-start-3 sm:gap-2">
          {account.role === "customer" && <BagLink customerId={account.id} />}
          <ButtonLink href="/account" size="icon-lg" variant="outline" aria-label="내 계정">
            <UserRound />
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
