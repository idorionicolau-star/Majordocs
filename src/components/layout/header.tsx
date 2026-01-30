
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { NotificationsDropdown } from "@/components/notifications-dropdown"
import { UserNav } from "@/components/user-nav";
import { Button } from "@/components/ui/button";
import { Settings, Search, Menu, Moon, Sun } from "lucide-react";
import { mainNavItems } from "@/lib/data";
import { SheetTrigger } from "../ui/sheet";
import { ConnectionStatus } from "../connection-status";
import { useTheme } from "../theme-provider";
import React from "react";

export function Header({ onSearchClick }: { onSearchClick: () => void }) {
  const pathname = usePathname();
  const { setMode } = useTheme();
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark')
    setMode(isDark ? 'light' : 'dark')
  }

  const getPageTitle = () => {
    // Handle nested routes like /inventory/history by sorting by path length
    const sortedNavItems = [...mainNavItems].sort((a, b) => b.href.length - a.href.length);

    if (pathname.startsWith('/settings')) return 'Ajustes';

    const matchingItem = sortedNavItems.find(item => pathname.startsWith(item.href));

    if (matchingItem) return matchingItem.title;

    return "Dashboard"; // Fallback
  };

  const pageTitle = getPageTitle();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-white/40 px-4 backdrop-blur-xl dark:bg-slate-950/50 sm:px-6 border-slate-200/60 dark:border-slate-800/60">

      {/* Hamburger menu for mobile, hidden on desktop */}
      <div className="flex items-center gap-3 md:hidden">
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        </SheetTrigger>
      </div>

      {/* Centered Page Title on mobile */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
        <h1 className="text-lg font-bold">{pageTitle}</h1>
      </div>

      {/* Search bar for desktop, hidden on mobile */}
      <div className="hidden md:flex flex-1">
        <Button
          variant="outline"
          className="relative w-full max-w-sm px-4 py-2 h-11 justify-start items-center text-left font-normal bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-300/70 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-800/80 dark:border-slate-700"
          onClick={onSearchClick}
        >
          <Search className="mr-2 h-4 w-4" />
          <span className="flex-1">Pesquisa Rápida</span>
          <kbd className="pointer-events-none hidden h-6 select-none items-center gap-1 rounded border bg-slate-200 border-slate-300 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:bg-slate-700/80 dark:border-slate-600 dark:text-slate-300 sm:flex">
            Ctrl+K
          </kbd>
        </Button>
      </div>

      {/* Right side icons */}
      <div className="flex items-center gap-1 md:gap-4">
        <div className="hidden md:block">
          <ConnectionStatus />
        </div>
        {isMounted ? (
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 md:h-10 md:w-10">
            <Sun className="h-[1rem] w-[1rem] md:h-[1.2rem] md:w-[1.2rem] rotate-0 scale-100 transition-all ease-overshoot duration-500 dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1rem] w-[1rem] md:h-[1.2rem] md:w-[1.2rem] rotate-90 scale-0 transition-all ease-overshoot duration-500 dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        ) : (
          <Button variant="ghost" size="icon" disabled />
        )}
        <NotificationsDropdown />
        <UserNav />
      </div>
    </header>
  );
}
