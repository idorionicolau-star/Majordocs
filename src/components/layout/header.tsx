import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ConnectionStatus } from "@/components/connection-status"
import { UserNav } from "@/components/user-nav"
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import Logo from "../../../public/logo.svg";

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <SidebarTrigger className="sm:hidden" />
      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <Logo className="h-6 w-6 text-primary" />
        </div>
        <h1 className="font-headline text-xl font-semibold hidden sm:block">MajorStockX</h1>
      </div>
      
      <div className="ml-auto flex items-center gap-2 md:gap-4">
        <div className="hidden sm:flex items-center gap-4">
          <ConnectionStatus />
        </div>
        <NotificationsDropdown />
        <UserNav />
      </div>
    </header>
  );
}
