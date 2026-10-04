// Produtos fictícios da venda de demonstração. Só existem no ecrã: nunca são gravados.
import type { Product } from "@/lib/types";
import { rememberSeen } from "@/lib/seen-store";

const base = { reservedStock: 0, lowStockThreshold: 10, criticalStockThreshold: 5, lastUpdated: "", location: "" };

export const DEMO_PRODUCTS: Product[] = [
    { ...base, id: "demo-cimento", instanceId: "demo-cimento", name: "Cimento 32,5N (exemplo)", category: "Cimentos", unit: "saco", price: 650, cost: 540, stock: 120 },
    { ...base, id: "demo-bloco", instanceId: "demo-bloco", name: "Bloco 15 (exemplo)", category: "Blocos", unit: "un", price: 45, cost: 30, stock: 800 },
    { ...base, id: "demo-areia", instanceId: "demo-areia", name: "Areia grossa (exemplo)", category: "Agregados", unit: "m³", price: 2500, cost: 1800, stock: 30 },
    { ...base, id: "demo-varao", instanceId: "demo-varao", name: "Varão 10 mm (exemplo)", category: "Ferro", unit: "un", price: 520, cost: 430, stock: 200 },
    { ...base, id: "demo-tinta", instanceId: "demo-tinta", name: "Tinta branca 20 L (exemplo)", category: "Tintas", unit: "lata", price: 4800, cost: 3900, stock: 15 },
];

export const isDemoProduct = (p: { id?: string }) => !!p.id && p.id.startsWith("demo-");

/** Marca no aparelho que a pessoa já fez a venda de demonstração (para a lista de primeiros passos). */
const demoKey = (companyId?: string | null) => `majorstockx-demo-sale-${companyId || "x"}`;

export function isDemoSaleDone(companyId?: string | null): boolean {
    try {
        return localStorage.getItem(demoKey(companyId)) === "1";
    } catch {
        return false;
    }
}

export function markDemoSaleDone(companyId?: string | null) {
    try {
        localStorage.setItem(demoKey(companyId), "1");
    } catch {
        /* ignore */
    }
    rememberSeen(demoKey(companyId));
    if (typeof window !== "undefined") window.dispatchEvent(new Event("msx:guide-done"));
}
