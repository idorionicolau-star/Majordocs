"use client";

// As abas da secção Produtos: o Stock (Inventário) e o Catálogo (preços) são a mesma coisa vista de dois lados.
import { SectionTabs, type SectionTab } from "@/components/layout/section-tabs";

export const PRODUCT_TABS: SectionTab[] = [
    { href: "/inventory", label: "Stock", perm: "inventory" },
    { href: "/catalog", label: "Catálogo e preços", perm: "settings" },
];

export function ProductsTabs({ className }: { className?: string }) {
    return <SectionTabs tabs={PRODUCT_TABS} label="Produtos" tourId="products-tabs" className={className} />;
}
