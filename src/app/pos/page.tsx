"use client";

import { FastSale } from "@/components/pos/fast-sale";
import { useInventory } from "@/context/inventory-context";

export default function FastSalePage() {
    const { canEdit, loading } = useInventory();
    if (!loading && !canEdit("sales")) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <p className="text-muted-foreground">Não tem permissão para registar vendas.</p>
            </div>
        );
    }
    return <FastSale />;
}
