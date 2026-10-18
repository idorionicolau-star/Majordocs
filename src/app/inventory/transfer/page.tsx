"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowLeftRight, Check, Loader2, Minus, Plus, Search, Trash2, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";
import { clampQty, filterCandidates, transferCandidates, type TransferRow } from "@/lib/transfer-core";
import { cn } from "@/lib/utils";
import { softFocus } from "@/lib/keyboard";

const fmt = (n: number) => (Number.isInteger(n) ? n : Number(n.toFixed(3))).toLocaleString("pt-PT");

/**
 * Transferir stock entre localizações, ao estilo da Venda Rápida: escolhe-se de onde e para onde, pesquisa-se (ou
 * toca-se na lista) e juntam-se vários produtos; um botão transfere tudo. Antes era um produto de cada vez, numa
 * lista sem pesquisa.
 */
export default function TransferStockPage() {
    const { products, locations, isMultiLocation, transferStock, canEdit, isReadOnly } = useInventory();
    const { toast } = useToast();
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [text, setText] = useState("");
    const [basket, setBasket] = useState<Record<string, string>>({}); // nome → quantidade (texto, como escrito)
    const [busy, setBusy] = useState(false);
    const searchRef = useRef<HTMLInputElement>(null);

    // por defeito: da primeira localização para a segunda
    useEffect(() => {
        if (!locations?.length) return;
        setFrom((f) => f || locations[0].id);
        setTo((t) => t || locations[1]?.id || "");
    }, [locations]);

    const rows = useMemo(() => transferCandidates(products || [], from, to), [products, from, to]);
    const byName = useMemo(() => new Map(rows.map((r) => [r.name, r])), [rows]);
    const shown = useMemo(() => filterCandidates(rows, text), [rows, text]);
    const items = Object.entries(basket).filter(([n]) => byName.has(n));
    const valid = items.map(([n, q]) => ({ row: byName.get(n)!, qty: clampQty(q, byName.get(n)!.available) })).filter((x) => x.qty > 0);
    const locName = (id: string) => locations?.find((l) => l.id === id)?.name || id;

    const add = (r: TransferRow) => {
        setBasket((b) => ({ ...b, [r.name]: b[r.name] || "1" }));
        setText("");
        requestAnimationFrame(() => document.getElementById(`tq-${r.name}`)?.focus());
    };
    const setQty = (name: string, v: string) => setBasket((b) => ({ ...b, [name]: v }));
    const step = (r: TransferRow, d: number) => setQty(r.name, String(Math.max(0, Math.min(r.available, (clampQty(basket[r.name], r.available) || 0) + d))));
    const remove = (name: string) => setBasket((b) => { const n = { ...b }; delete n[name]; return n; });
    const swap = () => { setFrom(to); setTo(from); setBasket({}); };
    const changeFrom = (id: string) => { setFrom(id); if (id === to) setTo(from); setBasket({}); };
    const changeTo = (id: string) => { setTo(id); if (id === from) setFrom(to); };

    const submit = async () => {
        if (!valid.length || busy || !from || !to || from === to) return;
        setBusy(true);
        const failed: string[] = [];
        let done = 0;
        for (const { row, qty } of valid) {
            try {
                const r = await transferStock(row.name, from, to, qty, { silent: true });
                if (r.ok) done++; else failed.push(`${row.name}: ${r.error}`);
            } catch (e) {
                failed.push(`${row.name}: ${e instanceof Error ? e.message : "erro"}`);
            }
        }
        setBusy(false);
        if (done) setBasket((b) => Object.fromEntries(Object.entries(b).filter(([n]) => failed.some((f) => f.startsWith(`${n}:`)))));
        toast({
            variant: failed.length && !done ? "destructive" : undefined,
            title: done ? `${done} ${done === 1 ? "produto transferido" : "produtos transferidos"}` : "Nada foi transferido",
            description: [done ? `De ${locName(from)} para ${locName(to)}.` : "", failed.length ? `Falharam: ${failed.join(" · ")}` : ""].filter(Boolean).join(" "),
        });
        softFocus(searchRef.current);
    };

    if (!canEdit("inventory")) return <div className="p-8 text-center text-muted-foreground">Sem permissão para mexer no stock.</div>;
    if (!isMultiLocation || (locations?.length || 0) < 2) {
        return (
            <div className="mx-auto max-w-lg p-8 text-center">
                <p className="text-muted-foreground">Para transferir stock precisa de pelo menos duas localizações.</p>
                <Button asChild variant="outline" className="mt-4"><Link href="/settings">Criar localizações em Ajustes</Link></Button>
            </div>
        );
    }

    const LocPick = ({ label, value, onPick, other }: { label: string; value: string; onPick: (id: string) => void; other: string }) => (
        <div className="min-w-0 flex-1">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <div className="flex flex-wrap gap-1.5">
                {locations.map((l) => (
                    <button key={l.id} type="button" onClick={() => onPick(l.id)} aria-pressed={value === l.id}
                        className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition",
                            value === l.id ? "border-primary bg-primary text-primary-foreground" : l.id === other ? "opacity-50" : "hover:border-primary/60")}>
                        {l.name}
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-28">
            <div className="flex items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Transferir stock</h1>
                    <p className="text-sm text-muted-foreground">Escolha de onde e para onde, procure os produtos e junte-os à lista.</p>
                </div>
            </div>

            <div data-tour="tr-locations" className="flex items-end gap-2 rounded-2xl border bg-card p-3">
                <LocPick label="De" value={from} onPick={changeFrom} other={to} />
                <Button type="button" variant="outline" size="icon" onClick={swap} aria-label="Trocar origem e destino" className="mb-0.5 shrink-0 rounded-full">
                    <ArrowLeftRight className="h-4 w-4" />
                </Button>
                <LocPick label="Para" value={to} onPick={changeTo} other={from} />
            </div>

            <div className="relative" data-tour="tr-search">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input ref={searchRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Procurar em ${locName(from)}…`}
                    aria-label="Procurar produto" className="h-12 rounded-2xl pl-12 pr-10 text-base" autoComplete="off"
                    onKeyDown={(e) => { if (e.key === "Enter" && shown[0]) { e.preventDefault(); add(shown[0]); } }} />
                {text && <button type="button" aria-label="Limpar" onClick={() => setText("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"><X className="h-5 w-5" /></button>}
            </div>

            {items.length > 0 && (
                <section data-tour="tr-basket" className="rounded-2xl border border-primary/40 bg-primary/5 p-3">
                    <p className="mb-2 text-sm font-semibold">A transferir ({items.length})</p>
                    <ul className="space-y-2">
                        {items.map(([name, q]) => {
                            const r = byName.get(name)!;
                            const over = Number(String(q).replace(",", ".")) > r.available;
                            return (
                                <li key={name} className="flex flex-wrap items-center gap-2 rounded-xl bg-background px-3 py-2">
                                    <div className="min-w-[10rem] flex-1">
                                        <p className="font-medium leading-snug">{name}</p>
                                        <p className={cn("text-xs", over ? "text-red-600" : "text-muted-foreground")}>Disponível: {fmt(r.available)} {r.unit}{over ? " — só pode transferir isto" : ""}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button type="button" size="icon" variant="outline" className="h-9 w-9" onClick={() => step(r, -1)} aria-label={`Menos ${name}`}><Minus className="h-4 w-4" /></Button>
                                        <Input id={`tq-${name}`} inputMode="decimal" value={q} onChange={(e) => setQty(name, e.target.value)} onFocus={(e) => e.target.select()}
                                            aria-label={`Quantidade de ${name}`} className="h-9 w-20 text-center" />
                                        <Button type="button" size="icon" variant="outline" className="h-9 w-9" onClick={() => step(r, 1)} aria-label={`Mais ${name}`}><Plus className="h-4 w-4" /></Button>
                                        <Button type="button" size="sm" variant="ghost" className="h-9 px-2 text-xs" onClick={() => setQty(name, String(r.available))}>Tudo</Button>
                                        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground" onClick={() => remove(name)} aria-label={`Tirar ${name}`}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <section data-tour="tr-list">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {text ? `Resultados (${shown.length})` : `Em ${locName(from)} (${rows.length})`}
                </p>
                {shown.length === 0 ? (
                    <p className="rounded-2xl border p-4 text-sm text-muted-foreground">
                        {rows.length === 0 ? `Não há stock disponível em ${locName(from)}.` : "Nenhum produto com esse nome nesta localização."}
                    </p>
                ) : (
                    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                        {shown.map((r) => {
                            const inBasket = r.name in basket;
                            return (
                                <li key={r.name}>
                                    <button type="button" onClick={() => add(r)} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/50", inBasket && "bg-primary/5")}>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium">{r.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {fmt(r.available)} {r.unit} em {locName(from)} · {fmt(r.atDestination)} em {locName(to)}
                                            </p>
                                        </div>
                                        {inBasket ? <Check className="h-5 w-5 shrink-0 text-primary" /> : <Plus className="h-5 w-5 shrink-0 text-muted-foreground" />}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <div className="fixed inset-x-0 bottom-16 z-30 px-4 md:bottom-4 md:left-auto md:right-6 md:w-[28rem] md:px-0">
                <Button type="button" onClick={submit} disabled={!valid.length || busy || isReadOnly || !from || !to || from === to}
                    className="h-14 w-full rounded-2xl text-base shadow-xl" data-tour="tr-submit">
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Truck className="mr-2 h-5 w-5" />}
                    {busy ? "A transferir…" : valid.length ? `Transferir ${valid.length} ${valid.length === 1 ? "produto" : "produtos"} para ${locName(to)}` : "Escolha os produtos"}
                </Button>
            </div>
        </div>
    );
}
