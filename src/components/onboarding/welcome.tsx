"use client";

import { useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, GraduationCap, HelpCircle, ShoppingCart } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InventoryContext } from "@/context/inventory-context";
import { startGuide, useGuideState } from "@/components/guide/guide-store";
import { openTour } from "@/components/onboarding/app-tour";
import { rememberSeen } from "@/lib/seen-store";

const seenKey = (companyId?: string | null) => `majorstockx-welcome-seen-${companyId || "x"}`;

export function isWelcomeSeen(companyId?: string | null): boolean {
    try {
        return localStorage.getItem(seenKey(companyId)) === "1";
    } catch {
        return false;
    }
}

function markWelcomeSeen(companyId?: string | null) {
    try {
        localStorage.setItem(seenKey(companyId), "1");
    } catch {
        /* ignore */
    }
    rememberSeen(seenKey(companyId));
}

type Ctx = { companyId?: string | null; user?: { role?: string } | null; sales?: unknown[] } | null | undefined;

/** A janela de boas-vindas ainda vai aparecer aqui? (empresa nova, sem vendas, dono/admin, no dashboard) */
export function isWelcomePending(ctx: Ctx, pathname: string): boolean {
    if (!ctx || pathname !== "/dashboard") return false;
    const privileged = ctx.user?.role === "Admin" || ctx.user?.role === "Dono";
    return privileged && (ctx.sales?.length || 0) === 0 && !isWelcomeSeen(ctx.companyId);
}

/**
 * Boas-vindas na primeira entrada de uma empresa nova: propõe a venda de demonstração (nada é gravado)
 * seguida do catálogo (a sério). Aparece uma vez; depois, cada página tem o seu tutorial no botão "?".
 */
export function OnboardingWelcome() {
    const ctx = useContext(InventoryContext);
    const pathname = usePathname();
    const guide = useGuideState();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!ctx || ctx.loading || guide || open) return;
        if (isWelcomePending(ctx, pathname)) setOpen(true);
    }, [ctx, pathname, guide, open]);

    const close = () => {
        markWelcomeSeen(ctx?.companyId);
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
                <DialogHeader className="text-left">
                    <DialogTitle className="text-xl">Bem-vindo à MajorStockX 👋</DialogTitle>
                    <DialogDescription className="text-base">Em dois minutos mostramos-lhe como trabalhar, passo a passo, a mostrar onde tocar.</DialogDescription>
                </DialogHeader>
                <ol className="space-y-3">
                    <li className="flex gap-3 rounded-xl border p-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-600"><ShoppingCart className="h-5 w-5" /></span>
                        <span className="min-w-0 text-sm">
                            <b className="block text-base">1. Uma venda de demonstração</b>
                            Com produtos de exemplo, do princípio ao fim. <b>Nada é gravado.</b>
                        </span>
                    </li>
                    <li className="flex gap-3 rounded-xl border p-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span>
                        <span className="min-w-0 text-sm">
                            <b className="block text-base">2. O seu catálogo</b>
                            Adicionar e editar os <b>seus</b> produtos — este já é a sério.
                        </span>
                    </li>
                    <li className="flex gap-3 rounded-xl border border-dashed p-3 text-sm text-muted-foreground">
                        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0" />
                        <span>Depois, cada página tem o seu tutorial no botão <b className="text-foreground">?</b> lá em cima.</span>
                    </li>
                </ol>
                <div className="flex flex-col gap-2 pt-1">
                    <Button size="lg" className="h-12 text-base" onClick={() => { close(); startGuide("venda-demo"); }}>
                        <GraduationCap className="mr-2 h-5 w-5" /> Começar
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" onClick={() => { close(); openTour(); }}>Ver resumo da app</Button>
                        <Button variant="ghost" onClick={close}>Agora não</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
