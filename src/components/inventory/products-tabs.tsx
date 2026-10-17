"use client";

// As abas da secção Produtos: o Stock (Inventário) e o Catálogo (preços) são a mesma coisa vista de dois lados.
// Cada aba é uma página (o endereço muda), para os atalhos e o botão voltar continuarem a funcionar.
import { useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { InventoryContext } from "@/context/inventory-context";
import { cn } from "@/lib/utils";

export function ProductsTabs({ className }: { className?: string }) {
    const pathname = usePathname();
    const ctx = useContext(InventoryContext);
    const canView = ctx?.canView || (() => false);
    const tabs = [
        { href: "/inventory", label: "Stock", show: canView("inventory") },
        { href: "/catalog", label: "Catálogo e preços", show: canView("settings") },
    ].filter((t) => t.show);
    if (tabs.length < 2) return null;
    return (
        <nav data-tour="products-tabs" aria-label="Produtos" className={cn("grid rounded-xl bg-muted p-1", className)} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
            {tabs.map((t) => {
                const active = pathname === t.href;
                return (
                    <Link
                        key={t.href}
                        href={t.href}
                        data-tour={`products-tab:${t.href}`}
                        aria-current={active ? "page" : undefined}
                        className={cn("truncate rounded-lg px-2 py-2 text-center text-sm font-semibold transition-colors", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
                    >
                        {t.label}
                    </Link>
                );
            })}
        </nav>
    );
}
