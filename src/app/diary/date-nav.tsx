"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { ButtonLink } from "@/components/button-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dayLabel } from "@/lib/diet/labels";
import { isIsoDate, shiftDate } from "@/lib/diet/meals";

const href = (date: string) => `/diary?date=${date}`;

/** FR-11/FR-38: move between days. Future days are not reachable. */
export function DateNav({ date, today }: { date: string; today: string }) {
  const router = useRouter();
  const isToday = date === today;
  return (
    <nav aria-label="날짜 이동" className="flex flex-wrap items-center gap-2">
      <ButtonLink href={href(shiftDate(date, -1))} variant="outline" size="icon" aria-label="이전 날">
        <ChevronLeft />
      </ButtonLink>
      <label className="sr-only" htmlFor="diary-date">날짜 선택</label>
      <Input id="diary-date" type="date" className="w-auto" value={date} max={today}
        onChange={(event) => {
          const next = event.target.value;
          if (isIsoDate(next) && next <= today) router.push(href(next));
        }} />
      {isToday ? (
        <Button variant="outline" size="icon" disabled aria-label="다음 날 (오늘 이후는 볼 수 없습니다)"><ChevronRight /></Button>
      ) : (
        <ButtonLink href={href(shiftDate(date, 1))} variant="outline" size="icon" aria-label="다음 날"><ChevronRight /></ButtonLink>
      )}
      {!isToday && <ButtonLink href="/diary" variant="ghost">오늘로</ButtonLink>}
      <p className="ml-auto text-sm text-muted-foreground" aria-live="polite">{dayLabel(date)}{isToday && " (오늘)"}</p>
    </nav>
  );
}
