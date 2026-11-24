import { ArrowUpRight, CircleCheck, GraduationCap, Store, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AuthFrame } from "@/components/auth/auth-frame";
import { RedirectIfSignedIn } from "@/components/auth/redirect-if-signed-in";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SearchParams = Promise<{ deleted?: string }>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <AuthFrame title="로그인" description="이용하실 계정 유형을 선택하세요." footer={
      <>
        <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">학생 회원가입</Link>
        <span aria-hidden="true">·</span>
        <Link href="/signup/store" className="font-medium text-primary underline-offset-4 hover:underline">가게 계정 신청</Link>
      </>
    }>
      <Suspense fallback={null}>
        <RedirectIfSignedIn />
        <DeletedNotice searchParams={searchParams} />
      </Suspense>
      <div className="flex flex-col gap-3">
        <LoginChoice href="/login/student" icon={GraduationCap} title="학생 로그인" description="교내 식당과 내 식사 기록" />
        <LoginChoice href="/login/store" icon={Store} title="가게 로그인" description="교내 식당 메뉴와 주문 관리" />
      </div>
    </AuthFrame>
  );
}

function LoginChoice({ href, icon: Icon, title, description }: { href: string; icon: LucideIcon; title: string; description: string }) {
  return (
    <Link href={href} className="group/choice flex min-w-0 items-center gap-3 rounded-xl border p-3 outline-none transition hover:border-primary/50 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground"><Icon className="size-5" aria-hidden="true" /></span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold">{title}</span>
        <span className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground group-hover/choice:text-primary" aria-hidden="true" />
    </Link>
  );
}

async function DeletedNotice({ searchParams }: { searchParams: SearchParams }) {
  const { deleted } = await searchParams;
  return deleted ? (
    <Alert role="status"><CircleCheck /><AlertDescription>탈퇴가 완료되었습니다. 계정과 기록이 모두 삭제되었습니다.</AlertDescription></Alert>
  ) : null;
}
