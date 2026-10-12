"use client";

import { useContext, useMemo } from "react";
import Link from "next/link";
import { CalendarClock, Factory, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InventoryContext } from "@/context/inventory-context";
import { analyzeBusiness, PLAN_COVER_DAYS, suggestedQuantity } from "@/lib/business-analysis";
import { links } from "@/lib/deep-links";

const fmt = (n: number) => (Number.isInteger(n) ? n : Number(n.toFixed(1))).toLocaleString("pt-PT");

/**
 * "Planear produção" (aviso do painel): o que vai esgotar nas próximas 2 semanas, ao ritmo de venda do último mês,
 * e quanto produzir para cobrir um mês — cada linha abre o registo de produção já preenchido.
 */
export function ProductionPlan({ onClose, canRegister }: { onClose: () => void; canRegister: boolean }) {
    const inv = useContext(InventoryContext);
    const products = inv?.products;
    const sales = inv?.sales;
    const locations = inv?.locations || [];
    const multi = !!inv?.isMultiLocation;

    const plan = useMemo(() => analyzeBusiness({ products: products || [], sales: sales || [], businessType: "manufacturer", multiLocation: multi })
        .stock.runout.map((r) => ({ ...r, suggested: suggestedQuantity(r) })), [products, sales, multi]);

    const locName = (id?: string) => (multi ? locations.find((l) => l.id === id)?.name || (!id ? locations[0]?.name : id) : "");

    return (
        <section data-tour="production-plan" className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4">
            <div className="mb-3 flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                    <h2 className="font-semibold leading-snug">O que produzir</h2>
                    <p className="text-sm text-muted-foreground">
                        Produtos que esgotam em 14 dias ou menos, ao ritmo de venda do último mês. A sugestão cobre {PLAN_COVER_DAYS} dias de vendas.
                    </p>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar plano"><X className="h-4 w-4" /></Button>
            </div>
            {plan.length === 0 ? (
                <p className="text-sm text-emerald-600">Nada vai esgotar nas próximas 2 semanas. 🎉</p>
            ) : (
                <ul className="divide-y rounded-xl border bg-background">
                    {plan.map((r) => (
                        <li key={`${r.name}|${r.location || ""}`} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                            <div className="min-w-[12rem] flex-1">
                                <p className="font-medium leading-snug">
                                    {r.name}
                                    {locName(r.location) && <span className="text-sm font-normal text-muted-foreground"> · {locName(r.location)}</span>}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {r.daysLeft <= 0 ? <span className="font-medium text-red-600">Já esgotado</span> : <>Esgota em ~{r.daysLeft} {r.daysLeft === 1 ? "dia" : "dias"}</>}
                                    {" · "}{fmt(Math.max(0, r.available))} {r.unit} disponíveis · vende ~{fmt(r.soldPerDay)} {r.unit}/dia
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Produzir</p>
                                <p className="font-bold">{fmt(r.suggested)} {r.unit}</p>
                            </div>
                            {canRegister && (
                                <Button asChild size="sm">
                                    <Link href={links.newProduction(r.name, r.suggested, r.location, links.productionPlan())}>
                                        <Factory className="mr-1.5 h-4 w-4" /> Registar
                                    </Link>
                                </Button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
