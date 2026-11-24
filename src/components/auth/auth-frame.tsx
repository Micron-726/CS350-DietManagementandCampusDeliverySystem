import type { ReactNode } from "react";
import { BackLink, PageMain } from "@/components/page-ui";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthFrame({ title, description, backLabel, children, footer }: {
  title: string;
  description?: string;
  backLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <PageMain className="max-w-lg gap-4 sm:py-16">
      {backLabel && <BackLink href="/login">{backLabel}</BackLink>}
      <Card className="[--card-spacing:--spacing(6)] sm:[--card-spacing:--spacing(8)]">
        <CardHeader>
          <CardTitle><h1 className="text-3xl font-bold tracking-tight">{title}</h1></CardTitle>
          {description && <CardDescription className="mt-1 leading-relaxed">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{children}</CardContent>
        {footer && <CardFooter className="flex-wrap gap-x-2 gap-y-1 text-muted-foreground">{footer}</CardFooter>}
      </Card>
    </PageMain>
  );
}
