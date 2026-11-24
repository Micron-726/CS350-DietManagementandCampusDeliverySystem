import { Suspense } from "react";
import { connection } from "next/server";
import { LogoutForm } from "@/components/logout-form";
import { BackLink, PageHeading, PageLoading, PageMain } from "@/components/page-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HOME_BY_ROLE, requireAccount } from "@/lib/auth";
import { DeleteAccountForm } from "./delete-account-form";

export default function AccountPage() {
  return (
    <PageMain className="max-w-3xl">
      <Suspense fallback={<PageLoading />}><AccountDetails /></Suspense>
    </PageMain>
  );
}

async function AccountDetails() {
  await connection();
  const account = await requireAccount();

  return (
    <>
      <BackLink href={HOME_BY_ROLE[account.role]}>처음 화면</BackLink>
      <PageHeading title="내 계정" action={<LogoutForm />} />
      <Card>
        <CardHeader><CardTitle><h2>계정 정보</h2></CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-3">
            <dt className="text-muted-foreground">이메일</dt><dd className="wrap-anywhere">{account.email}</dd>
            <dt className="text-muted-foreground">계정 유형</dt><dd><Badge variant="secondary">{account.role === "restaurant" ? "가게" : "학생"}</Badge></dd>
            {account.role === "restaurant" && (
              <>
                <dt className="text-muted-foreground">식당</dt>
                <dd>{account.restaurants.map(({ name }) => name).join(", ") || "연결된 식당 없음"}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle><h2>회원 탈퇴</h2></CardTitle>
          <CardDescription>
            {account.role === "restaurant"
              ? "가게 계정이 삭제됩니다. 식당과 메뉴 정보는 남고 계정 연결만 끊깁니다."
              : "프로필, 목표, 식사·체중 기록, 검색·주문 내역이 모두 삭제되며 되돌릴 수 없습니다."}
          </CardDescription>
        </CardHeader>
        <CardContent><DeleteAccountForm /></CardContent>
      </Card>
    </>
  );
}
