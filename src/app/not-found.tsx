import { FileQuestion } from "lucide-react";
import { ButtonLink } from "@/components/button-link";
import { ContentEmpty, PageMain } from "@/components/page-ui";

export default function NotFound() {
  return (
    <PageMain className="max-w-xl sm:py-16">
      <ContentEmpty icon={FileQuestion} title="페이지를 찾을 수 없습니다." description="주소가 바뀌었거나 메뉴가 더 이상 제공되지 않을 수 있습니다.">
        <ButtonLink href="/">처음 화면</ButtonLink>
      </ContentEmpty>
    </PageMain>
  );
}
