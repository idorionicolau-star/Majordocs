"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/context/inventory-context";
import { QuickStock } from "@/components/inventory/quick-stock";
import type { QuickMode } from "@/lib/quick-stock";

function QuickStockPageInner() {
    const { canEdit } = useInventory();
    const params = useSearchParams();
    const m = params.get("modo");
    const initialMode: QuickMode = m === "saida" ? "out" : m === "contagem" ? "count" : "in";

    if (!canEdit("inventory")) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <p className="text-muted-foreground">Não tem permissão para aceder a esta página.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                    <Link href="/inventory" aria-label="Voltar ao inventário"><ArrowLeft className="h-5 w-5" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Stock Rápido</h1>
                    <p className="text-xs text-muted-foreground">Entradas, saídas e contagem em segundos.</p>
                </div>
            </div>
            <QuickStock initialMode={initialMode} />
        </div>
    );
}

export default function QuickStockPage() {
    return (
        <Suspense fallback={null}>
            <QuickStockPageInner />
        </Suspense>
    );
}
