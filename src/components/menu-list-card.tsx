import Link from "next/link";
import { ArrowUpRight, CookingPot } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NutritionValue } from "@/components/nutrition-value";
import { showPrice, type NutritionSource } from "@/lib/menu";

type MenuSummary = {
  id: string;
  name: string;
  basePriceKrw: number | null;
  baseKcal: number | null;
  baseProteinG: number | null;
  kcalSource: NutritionSource;
  proteinSource: NutritionSource;
};

export function MenuListCard({ restaurantId, restaurantName, item }: {
  restaurantId: string;
  restaurantName?: string;
  item: MenuSummary;
}) {
  return (
    <li className="min-w-0">
      <Link href={`/restaurants/${restaurantId}/${item.id}`} className="group/menu block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Card className="h-full transition group-hover/menu:ring-primary/45">
          <CardHeader>
            {restaurantName && <CardDescription className="flex items-center gap-1.5"><CookingPot className="size-3.5 shrink-0" />{restaurantName}</CardDescription>}
            <CardTitle><h3 className="font-semibold">{item.name}</h3></CardTitle>
            <CardAction><ArrowUpRight className="size-4 text-muted-foreground transition group-hover/menu:text-primary" aria-hidden="true" /></CardAction>
          </CardHeader>
          <CardContent className="mt-auto flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <dl className="flex flex-col gap-0.5 text-xs">
              <div className="flex gap-1.5"><dt className="text-muted-foreground">열량</dt><dd><NutritionValue value={item.baseKcal} unit="kcal" source={item.kcalSource} /></dd></div>
              <div className="flex gap-1.5"><dt className="text-muted-foreground">단백질</dt><dd><NutritionValue value={item.baseProteinG} unit="g" source={item.proteinSource} /></dd></div>
            </dl>
            <span className="font-semibold tabular-nums">{showPrice(item.basePriceKrw)}</span>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
