"use client";

import { useContext, useMemo } from "react";
import { usePathname } from "next/navigation";
import { mainNavItems, NAV_GROUPS } from "@/lib/data";
import { InventoryContext } from "@/context/inventory-context";
import type { ModulePermission, NavItem } from "@/lib/types";

// Só quem fabrica usa produção, encomendas e matéria-prima.
const MANUFACTURING_ONLY = new Set(["production", "orders", "raw-materials"]);

/**
 * Menu por tarefa (Vender, Stock, Pessoas, Dinheiro, Ajustes), com as sub-páginas
 * à vista e sem os módulos que a empresa não usa. Partilhado pelo menu lateral e
 * pelo menu "Mais" do telemóvel.
 */
export function useNavGroups() {
    const pathname = usePathname();
    const { canView, companyData } = useContext(InventoryContext) || { canView: () => false, companyData: null };
    const reseller = companyData?.businessType === "reseller";

    const groups = useMemo(() => {
        const visible = mainNavItems.filter((item) => {
            if (!canView(item.id as ModulePermission)) return false;
            if (reseller && MANUFACTURING_ONLY.has(item.id)) return false;
            return true;
        });
        return NAV_GROUPS
            .map((g) => ({ ...g, items: visible.filter((i) => (i.group || "ajustes") === g.id) }))
            .filter((g) => g.items.length > 0);
    }, [canView, reseller]);

    // A página activa é a entrada mais específica que corresponde ao endereço
    // (em /inventory/quick acende "Stock Rápido", não também "Inventário").
    const activeHref = useMemo(() => {
        const matches = mainNavItems
            .map((i) => i.href)
            .filter((href) => pathname === href || pathname.startsWith(href + "/"));
        return matches.sort((a, b) => b.length - a.length)[0] || null;
    }, [pathname]);

    const isActive = (item: NavItem) => item.href === activeHref;

    return { groups, isActive };
}
