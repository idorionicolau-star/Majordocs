"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { mainNavItems, NAV_GROUPS } from "@/lib/data";
import { InventoryContext } from "@/context/inventory-context";
import type { ModulePermission, NavItem } from "@/lib/types";
import { ADVANCED_HREFS, menuMode } from "@/lib/onboarding";

// Só quem fabrica usa produção, encomendas e matéria-prima.
const MANUFACTURING_ONLY = new Set(["production", "orders", "raw-materials"]);

/**
 * Menu por tarefa (Vender, Stock, Pessoas, Dinheiro, Ajustes), com as sub-páginas
 * à vista e sem os módulos que a empresa não usa. Partilhado pelo menu lateral e
 * pelo menu "Mais" do telemóvel.
 */
export function useNavGroups() {
    const pathname = usePathname();
    const { canView, companyData, companyId, sales } = useContext(InventoryContext) || { canView: () => false, companyData: null, companyId: null, sales: [] };
    const reseller = companyData?.businessType === "reseller";

    // Menu simples: uma empresa nova (sem vendas) começa só com o essencial; um toque mostra tudo e a escolha fica guardada.
    const storageKey = `majorstockx-menu-${companyId || "x"}`;
    const [saved, setSaved] = useState<string | null>(null);
    useEffect(() => { try { setSaved(localStorage.getItem(storageKey)); } catch { setSaved(null); } }, [storageKey]);
    const simple = menuMode(saved, sales?.length || 0) === "simple";
    const setSimple = useCallback((on: boolean) => {
        const v = on ? "simple" : "full";
        setSaved(v);
        try { localStorage.setItem(storageKey, v); } catch { /* ignore */ }
    }, [storageKey]);

    const allowed = useMemo(() => mainNavItems.filter((item) => {
        if (!canView(item.id as ModulePermission)) return false;
        if (reseller && MANUFACTURING_ONLY.has(item.id)) return false;
        return true;
    }), [canView, reseller]);
    const hiddenCount = allowed.filter((i) => ADVANCED_HREFS.has(i.href)).length;

    const groups = useMemo(() => {
        const visible = simple ? allowed.filter((i) => !ADVANCED_HREFS.has(i.href)) : allowed;
        return NAV_GROUPS
            .map((g) => ({ ...g, items: visible.filter((i) => (i.group || "ajustes") === g.id) }))
            .filter((g) => g.items.length > 0);
    }, [allowed, simple]);

    // A página activa é a entrada mais específica que corresponde ao endereço
    // (em /inventory/quick acende "Stock Rápido", não também "Inventário").
    const activeHref = useMemo(() => {
        const matches = mainNavItems
            .map((i) => i.href)
            .filter((href) => pathname === href || pathname.startsWith(href + "/"));
        return matches.sort((a, b) => b.length - a.length)[0] || null;
    }, [pathname]);

    const isActive = (item: NavItem) => item.href === activeHref;

    return { groups, isActive, simple, hiddenCount, setSimple };
}
