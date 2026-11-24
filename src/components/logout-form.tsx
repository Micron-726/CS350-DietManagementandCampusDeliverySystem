import { LogOut } from "lucide-react";
import { logout } from "@/app/login/actions";
import { Button } from "@/components/ui/button";

export function LogoutForm() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline"><LogOut data-icon="inline-start" />로그아웃</Button>
    </form>
  );
}
