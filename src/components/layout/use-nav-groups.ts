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
    const { canView, companyData, companyId, sales, user } = useContext(InventoryContext) || { canView: () => false, companyData: null, companyId: null, sales: [], user: null };
    // Funcionários e Subscrição: só o Dono e o Administrador (as páginas também o exigem)
    const isManager = user?.role === "Admin" || user?.role === "Dono";
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

    const allowed = useMemo(() => mainNavItems.flatMap((item) => {
        if (reseller && MANUFACTURING_ONLY.has(item.id)) return [];
        if (item.adminOnly && !isManager) return [];
        if (canView(item.id as ModulePermission)) return [item];
        // Produtos sem acesso ao stock mas com acesso ao catálogo (era a permissão do Catálogo): abre o Catálogo
        if (item.href === "/inventory" && canView("settings")) return [{ ...item, href: "/catalog" }];
        return [];
    }), [canView, reseller, isManager]);
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
        const under = (path: string) => pathname === path || pathname.startsWith(path + "/");
        const matches = mainNavItems.flatMap((i) => [i.href, ...(i.also || [])].filter(under).map((path) => ({ path, href: i.href })));
        return matches.sort((a, b) => b.path.length - a.path.length)[0]?.href || null;
    }, [pathname]);

    const isActive = (item: NavItem) => item.href === activeHref || (!!activeHref && mainNavItems.some((i) => i.href === activeHref && i.also?.includes(item.href)));

    return { groups, isActive, simple, hiddenCount, setSimple };
}
