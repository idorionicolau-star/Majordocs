import Link from "next/link";
import Image from "next/image";
import { ConnectionStatus } from "@/components/connection-status"
import { UserNav } from "@/components/user-nav"
import { NotificationsDropdown } from "@/components/notifications-dropdown"

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur-sm sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <div className="flex items-center gap-2">
        <div className="block">
          <Image src="/logo.svg" alt="MajorStockX Logo" width={24} height={24} className="text-primary" />
        </div>
        <h1 className="font-headline text-xl font-semibold block">MajorStockX</h1>
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
