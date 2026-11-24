import Link from "next/link";

export default function StoreLayout({ children }: LayoutProps<"/store">) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <nav aria-label="가게 관리" className="mb-8 flex flex-wrap gap-x-6 gap-y-3 border-b border-neutral-200 pb-4 text-sm font-medium dark:border-neutral-700">
        <Link href="/store">가게 홈</Link>
        <Link href="/store/menu">메뉴 관리</Link>
        <Link href="/store/orders">주문 관리</Link>
        <Link href="/account">내 계정</Link>
      </nav>
      {children}
    </main>
  );
}
