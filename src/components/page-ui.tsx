import { ArrowLeft, CircleAlert, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ButtonLink } from "@/components/button-link";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function PageMain({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main id="main-content" className={cn("mx-auto flex w-full max-w-6xl flex-col gap-7 px-4 py-8 sm:px-6 sm:py-11 lg:px-8", className)}>
      {children}
    </main>
  );
}

export function PageHeading({ title, description, action }: { title: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {description && <div className="text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</div>}
      </div>
      {action}
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <ButtonLink href={href} variant="ghost" className="self-start">
      <ArrowLeft data-icon="inline-start" />{children}
    </ButtonLink>
  );
}

export function ContentEmpty({ icon: Icon, title, description, children }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="border bg-card py-9">
      <EmptyHeader>
        <EmptyMedia variant="icon"><Icon /></EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children && <EmptyContent>{children}</EmptyContent>}
    </Empty>
  );
}

export function PageLoading() {
  return (
    <div className="flex flex-col gap-4" role="status">
      <span className="sr-only">불러오는 중…</span>
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
