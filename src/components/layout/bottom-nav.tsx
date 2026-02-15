"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Zap,
  Factory,
  Menu,
  ShoppingCart
} from "lucide-react";
import { useContext } from "react";
import { InventoryContext } from "@/context/inventory-context";
import type { ModulePermission } from "@/lib/types";

interface BottomNavProps {
  onMenuClick: () => void;
}

export function BottomNav({ onMenuClick }: BottomNavProps) {
  const pathname = usePathname();
  const { canView, companyData } = useContext(InventoryContext) || {
    canView: () => false,
    companyData: null
  };

  // Logic to determine the 4th item (Production vs Orders)
  let fourthItem: { title: string; href: string; icon: any; id: string } | null = null;

  const showProduction = canView('production' as ModulePermission) &&
    companyData?.businessType !== 'reseller';

  const showOrders = canView('orders' as ModulePermission) &&
    companyData?.businessType !== 'reseller';

  if (showProduction) {
    fourthItem = {
      title: "Produção",
      href: "/production",
      icon: Factory,
      id: "production"
    };
  } else if (showOrders) {
    fourthItem = {
      title: "Encomendas",
      href: "/orders",
      icon: ShoppingCart,
      id: "orders"
    };
  }

  const items = [
    {
      title: "Dash",
      href: "/dashboard",
      icon: LayoutDashboard,
      id: "dashboard"
    },
    {
      title: "Inventário",
      href: "/inventory",
      icon: Package,
      id: "inventory"
    },
    {
      title: "Venda Rápida",
      href: "/pos",
      icon: Zap,
      id: "pos"
    }
  ];

  // Insert 4th item if valid
  if (fourthItem) {
    items.push(fourthItem);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 md:hidden pb-safe">
      <div className="grid h-full grid-flow-col auto-cols-fr">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors relative",
                isActive
                  ? "text-primary dark:text-primary"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <div className={cn(
                "p-1 rounded-xl transition-all",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn("h-5 w-5", isActive && "fill-current")} />
              </div>
              <span className="text-[10px] font-medium leading-none">{item.title}</span>
              {isActive && (
                <span className="absolute top-0 inset-x-0 h-0.5 bg-primary shadow-[0_0_10px_theme(colors.primary.DEFAULT)]" />
              )}
            </Link>
          );
        })}

        {/* Menu Button */}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
        >
          <div className="p-1">
            <Menu className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-medium leading-none">Mais</span>
        </button>
      </div>
    </nav>
  );
}
