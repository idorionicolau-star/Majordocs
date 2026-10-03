"use client";

import { useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Check, PackagePlus, PlayCircle, ShoppingCart, X, type LucideIcon } from "lucide-react";
import { InventoryContext } from "@/context/inventory-context";
import { Button } from "@/components/ui/button";
import { gettingStarted, type StepId } from "@/lib/onboarding";
import { openTour, useTourSeen } from "@/components/onboarding/app-tour";

const dismissKey = (companyId?: string | null) => `majorstockx-started-hidden-${companyId || "x"}`;

const COPY: Record<StepId, { icon: LucideIcon; title: string; hint: string; action: string; href?: string }> = {
    products: { icon: PackagePlus, title: "Adicionar produtos", hint: "Um a um no Stock Rápido, ou vários de uma vez no Catálogo.", action: "Adicionar", href: "/inventory/quick" },
    sale: { icon: ShoppingCart, title: "Fazer a primeira venda", hint: "Leva segundos na Venda Rápida.", action: "Vender", href: "/pos" },
    company: { icon: Building2, title: "Completar os dados da empresa", hint: "NUIT, contactos e logótipo aparecem nos documentos.", action: "Preencher", href: "/settings#company" },
    tour: { icon: PlayCircle, title: "Ver como a app funciona", hint: "Um minuto, seis ecrãs.", action: "Ver" },
};

/** "Primeiros passos" no dashboard: fica até a empresa fazer o essencial (ou até a pessoa o esconder). */
export function GettingStartedCard() {
    const ctx = useContext(InventoryContext);
    const companyId = ctx?.companyId;
    const tourSeen = useTourSeen(companyId);
    const [hidden, setHidden] = useState(true); // escondido até ler a escolha guardada (evita um piscar)
    useEffect(() => {
        try { setHidden(localStorage.getItem(dismissKey(companyId)) === "1"); } catch { setHidden(false); }
    }, [companyId]);

    if (!ctx || ctx.loading || hidden) return null;
    const c = ctx.companyData;
    const g = gettingStarted({
        products: ctx.products.length,
        sales: ctx.sales.length,
        companyDone: !!(c?.taxId && (c?.phone || c?.address)),
        tourSeen,
    });
    if (g.finished) return null;

    const hide = () => {
        try { localStorage.setItem(dismissKey(companyId), "1"); } catch { /* ignore */ }
        setHidden(true);
    };

    return (
        <section aria-label="Primeiros passos" className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="font-semibold">Primeiros passos <span className="font-normal text-muted-foreground">· {g.done} de {g.total}</span></h2>
                    <div className="mt-2 h-1.5 w-40 overflow-hidden rounded-full bg-muted"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${(g.done / g.total) * 100}%` }} /></div>
                </div>
                <button type="button" onClick={hide} aria-label="Esconder primeiros passos" className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <ul className="mt-3 divide-y">
                {g.steps.map((s) => {
                    const t = COPY[s.id];
                    return (
                        <li key={s.id} className="flex items-center gap-3 py-2.5">
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-emerald-500 text-white" : "bg-primary/10 text-primary"}`}>
                                {s.done ? <Check className="h-4 w-4" /> : <t.icon className="h-4 w-4" />}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className={`text-sm font-medium ${s.done ? "text-muted-foreground line-through" : ""}`}>{t.title}</p>
                                {!s.done && <p className="text-xs text-muted-foreground">{t.hint}</p>}
                            </div>
                            {!s.done && (t.href
                                ? <Button asChild size="sm" variant={g.next === s.id ? "default" : "outline"}><Link href={t.href}>{t.action}</Link></Button>
                                : <Button size="sm" variant={g.next === s.id ? "default" : "outline"} onClick={() => openTour()}>{t.action}</Button>)}
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
