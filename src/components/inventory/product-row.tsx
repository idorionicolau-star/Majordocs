"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";
import { getStockStatus } from "./columns";

const STOCK_TONE = {
    bom: "text-[hsl(var(--chart-2))]",
    baixo: "text-[hsl(var(--chart-4))]",
    critico: "text-destructive",
    "sem-estoque": "text-destructive",
} as const;

const STATUS_LABEL = { baixo: "Baixo", critico: "Crítico", "sem-estoque": "Esgotado" } as const;

/** Linha compacta do inventário — mostra 3 a 4 vezes mais produtos por ecrã do que os cartões. */
export function ProductRow({ product, canEdit, locationName }: { product: Product; canEdit: boolean; locationName?: string }) {
    const status = getStockStatus(product);
    const available = product.stock - product.reservedStock;
    const noCost = product.cost === undefined || product.cost <= 0;
    const href = canEdit
        ? `/inventory/${product.instanceId || product.id}/edit`
        : `/inventory/history?productName=${encodeURIComponent(product.name)}`;

    return (
        <Link href={href} className="flex items-center gap-3 border-b border-border/60 px-3 py-2.5 hover:bg-muted/50 active:bg-muted">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{product.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                    {formatCurrency(product.price)}
                    {product.category && ` · ${product.category}`}
                    {locationName && ` · ${locationName}`}
                    {noCost && <span className="text-amber-600 dark:text-amber-400"> · sem custo</span>}
                    {product.reservedStock > 0 && <span className="text-primary"> · {product.reservedStock} reservado{product.reservedStock === 1 ? "" : "s"}</span>}
                </p>
            </div>
            <div className="shrink-0 text-right">
                <p className={cn("text-base font-black leading-none", STOCK_TONE[status])}>
                    {available}<span className="ml-0.5 text-[10px] font-bold text-muted-foreground">{product.unit || "un"}</span>
                </p>
                {status !== "bom" && (
                    <p className={cn("mt-0.5 text-[9px] font-black uppercase tracking-wider", STOCK_TONE[status])}>{STATUS_LABEL[status]}</p>
                )}
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" />
        </Link>
    );
}
