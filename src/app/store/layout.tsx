import { PageMain } from "@/components/page-ui";

export default function StoreLayout({ children }: LayoutProps<"/store">) {
  return <PageMain>{children}</PageMain>;
}
