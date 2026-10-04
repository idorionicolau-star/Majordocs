"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Layers, Loader2, Pencil, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";
import { nameKey, pushPriceHistory } from "@/lib/catalog-view";
import { renameClash, renamePairs, type RenamePair } from "@/lib/rename";
import { optionsOfFamily, SUGGESTED_OPTIONS, SUGGESTED_VALUES, variantName, type VariantValues } from "@/lib/variants";
import type { Product } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

/** Quem pode mudar nomes e variações: quem gere o inventário. */
export function useCanRename() {
    const { canEdit, isReadOnly } = useInventory();
    return !isReadOnly && canEdit("inventory");
}

/** Variação nova com a quantidade que entrou agora (só em Entrada) — vai para o lote do Stock Rápido. */
export type NewVariantEntry = { product: Product; qty: number };

const clean = (s: string) => s.trim().replace(/\s+/g, " ");
const toQty = (s: string) => { const n = Number(String(s).replace(",", ".")); return Number.isFinite(n) && n > 0 ? n : 0; };

/**
 * Editar um produto no Stock Rápido: mudar o nome (em todo o programa) e as variações —
 * criar variações num produto que ainda não as tem, mudar o valor de uma, acrescentar novas.
 */
export function RenameProductDialog({ name, open, onClose, onDone, location, withQty, onEntries }: {
    name: string;
    open: boolean;
    onClose: () => void;
    /** nomes que mudaram (para o lote do Stock Rápido seguir) */
    onDone?: (pairs: RenamePair[]) => void;
    /** localização do Stock Rápido (para mostrar o stock de cada variação) */
    location?: string;
    /** Entrada: pede a quantidade que entrou de cada variação nova */
    withQty?: boolean;
    onEntries?: (entries: NewVariantEntry[]) => void;
}) {
    const { catalogProducts, products, renameProduct, addCatalogProduct, updateCatalogProducts, updateProduct, canEdit, user } = useInventory();
    const { toast } = useToast();
    const catalog = useMemo(() => (catalogProducts || []).filter((c) => !c.deletedAt), [catalogProducts]);
    const all = useMemo(() => [...catalog, ...(products || [])], [catalog, products]);
    const product = useMemo(() => all.find((p) => nameKey(p.name) === nameKey(name)), [all, name]);
    const group = product?.variantGroup;

    // a família: um por nome (catálogo + stock), com o stock desta localização
    const members = useMemo(() => {
        type Row = { name: string; values: VariantValues; stock: number; unit: string; price: number; fromCatalog: boolean };
        if (!group) return [] as Row[];
        const k = nameKey(group);
        const by = new Map<string, Row>();
        for (const p of all) {
            if (!p.variantGroup || nameKey(p.variantGroup) !== k) continue;
            const key = nameKey(p.name);
            const isStock = "instanceId" in p && !!(p as Product).instanceId;
            const cur = by.get(key) || { name: p.name, values: p.variantValues || {}, stock: 0, unit: p.unit || "un", price: 0, fromCatalog: false };
            // o preço do catálogo manda; sem catálogo, o do stock
            if (!isStock && p.price) { cur.price = p.price; cur.fromCatalog = true; } else if (!cur.fromCatalog && p.price) cur.price = p.price;
            if (isStock && (!location || ((p as Product).location || "") === location)) cur.stock += (p as Product).stock || 0;
            by.set(key, cur);
        }
        return [...by.values()].sort((a, b) => a.name.localeCompare(b.name, "pt", { numeric: true }));
    }, [all, group, location]);
    const options = useMemo(() => optionsOfFamily(members.map((m) => ({ variantValues: m.values }))), [members]);
    const order = options.map((o) => o.name);

    // ---- nome
    const [family, setFamily] = useState(false);
    const [value, setValue] = useState(name);
    const [saving, setSaving] = useState(false);
    // ---- variações
    const [editing, setEditing] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<VariantValues>({});
    const [editPrice, setEditPrice] = useState("");
    const [adding, setAdding] = useState<VariantValues>({});
    const [addQty, setAddQty] = useState("");
    const [addPrice, setAddPrice] = useState("");
    // ---- criar variações num produto que não as tem
    const [converting, setConverting] = useState(false);
    const [type, setType] = useState("Cor");
    const [current, setCurrent] = useState("");
    const [others, setOthers] = useState<{ value: string; qty: string; price: string }[]>([]);
    const [otherText, setOtherText] = useState("");

    useEffect(() => {
        if (!open) return;
        setFamily(false); setValue(name); setSaving(false);
        setEditing(null); setAdding({}); setAddQty(""); setAddPrice("");
        setConverting(false); setType("Cor"); setCurrent(""); setOthers([]); setOtherText("");
    }, [open, name]);

    const pairs = product ? renamePairs(product, value, all, family) : [];
    const clash = pairs.length ? renameClash(pairs, all) : null;
    const taken = (n: string) => all.some((p) => nameKey(p.name) === nameKey(n));

    /** o modelo para variações novas: preço, custo, unidade, categoria, alertas e foto */
    const model = () => {
        const src = catalog.find((c) => nameKey(c.name) === nameKey(name)) || product;
        const p = (src || {}) as Partial<Product>;
        return {
            category: p.category || "Geral", price: p.price || 0, cost: p.cost || 0, unit: p.unit || "un",
            lowStockThreshold: p.lowStockThreshold ?? 10, criticalStockThreshold: p.criticalStockThreshold ?? 5,
            ...(p.imageUrl ? { imageUrl: p.imageUrl } : {}),
        };
    };
    /** cria as variações no catálogo e (em Entrada) junta ao lote as que trazem quantidade */
    const createVariants = async (base: string, list: { values: VariantValues; qty: number; price?: number }[], ord: string[]) => {
        const m = model();
        const entries: NewVariantEntry[] = [];
        for (const v of list) {
            const n = variantName(base, v.values, ord);
            const price = v.price && v.price > 0 ? v.price : m.price;
            await addCatalogProduct({ ...m, price, name: n, variantGroup: base, variantValues: v.values } as Parameters<typeof addCatalogProduct>[0]);
            if (v.qty > 0) entries.push({ qty: v.qty, product: { ...m, price, name: n, variantGroup: base, variantValues: v.values, instanceId: `new-${n}`, stock: 0, reservedStock: 0, lastUpdated: "" } as Product });
        }
        if (entries.length) onEntries?.(entries);
    };

    const saveName = async () => {
        if (!pairs.length || clash || saving) return;
        setSaving(true);
        const ok = await renameProduct(name, value, { family });
        setSaving(false);
        if (!ok) return;
        toast({ title: "Nome mudado", description: pairs.length > 1 ? `${pairs.length} variações passam a «${clean(value)} - …».` : `«${pairs[0].from}» passa a «${pairs[0].to}» em todo o programa.` });
        onDone?.(pairs);
        onClose();
    };

    /** preço de uma variação: no catálogo (com histórico de preços) e no stock de todas as localizações */
    const setPrice = async (productName: string, price: number) => {
        const k = nameKey(productName);
        const cat = catalog.filter((c) => c.id && nameKey(c.name) === k);
        if (cat.length && canEdit("settings")) {
            const at = new Date().toISOString();
            await updateCatalogProducts(cat.map((c) => ({ id: c.id!, data: { price, priceHistory: pushPriceHistory(c.priceHistory, { at, from: c.price || 0, to: price, by: user?.username }) } })));
        }
        for (const p of (products || []).filter((x) => nameKey(x.name) === k && x.instanceId)) await updateProduct(p.instanceId, { price });
    };

    const saveEdit = async (m: { name: string; values: VariantValues; price: number }) => {
        const values = Object.fromEntries(order.map((k) => [k, clean(editValues[k] ?? m.values[k] ?? "")]));
        if (order.some((k) => !values[k]) || !group) return;
        const to = variantName(group, values, order);
        const renamed = nameKey(to) !== nameKey(m.name);
        const newPrice = toQty(editPrice);
        const repriced = editPrice.trim() !== "" && newPrice > 0 && newPrice !== m.price;
        if (!renamed && !repriced) { setEditing(null); return; }
        if (renamed && taken(to)) { toast({ variant: "destructive", title: "Essa variação já existe", description: to }); return; }
        setSaving(true);
        if (renamed && !(await renameProduct(m.name, to, { set: { variantValues: values } }))) { setSaving(false); return; }
        if (repriced) await setPrice(renamed ? to : m.name, newPrice);
        setSaving(false);
        setEditing(null);
        toast({ title: "Variação actualizada", description: [renamed ? `«${m.name}» passa a «${to}».` : "", repriced ? `Preço: ${formatCurrency(newPrice)}.` : ""].filter(Boolean).join(" ") });
        if (renamed) onDone?.([{ from: m.name, to }]);
    };

    const addOne = async () => {
        if (!group) return;
        const values = Object.fromEntries(order.map((k) => [k, clean(adding[k] || "")]));
        if (order.some((k) => !values[k])) return;
        const n = variantName(group, values, order);
        if (taken(n)) { toast({ variant: "destructive", title: "Essa variação já existe", description: n }); return; }
        setSaving(true);
        await createVariants(group, [{ values, qty: withQty ? toQty(addQty) : 0, price: toQty(addPrice) }], order);
        setSaving(false);
        setAdding({}); setAddQty(""); setAddPrice("");
        toast({ title: "Variação criada", description: withQty && toQty(addQty) ? `«${n}» — ${toQty(addQty)} no lote, confirme para dar entrada.` : `«${n}» está no catálogo.` });
    };

    const addOther = () => {
        const v = clean(otherText);
        if (!v) return;
        if (nameKey(v) === nameKey(current) || others.some((o) => nameKey(o.value) === nameKey(v))) { setOtherText(""); return; }
        setOthers([...others, { value: v, qty: "", price: "" }]);
        setOtherText("");
    };
    const convertNames = () => {
        const base = name;
        const t = clean(type) || "Cor";
        return { base, t, first: variantName(base, { [t]: clean(current) }, [t]), rest: others.map((o) => variantName(base, { [t]: o.value }, [t])) };
    };
    const convertClash = (() => {
        if (!converting || !clean(current)) return null;
        const c = convertNames();
        return [c.first, ...c.rest].find((n) => nameKey(n) !== nameKey(name) && taken(n)) || null;
    })();

    const convert = async () => {
        if (!clean(current) || convertClash || saving) return;
        const { base, t, first } = convertNames();
        setSaving(true);
        const values = { [t]: clean(current) };
        // o produto actual (com o seu stock e histórico) passa a ser a 1.ª variação
        const ok = await renameProduct(name, first, { set: { variantGroup: base, variantValues: values } });
        if (!ok) { setSaving(false); return; }
        // não estava no catálogo (só no stock): entra agora, para a família ficar completa
        if (!catalog.some((c) => nameKey(c.name) === nameKey(name))) {
            await addCatalogProduct({ ...model(), name: first, variantGroup: base, variantValues: values } as Parameters<typeof addCatalogProduct>[0]);
        }
        await createVariants(base, others.map((o) => ({ values: { [t]: o.value }, qty: withQty ? toQty(o.qty) : 0, price: toQty(o.price) })), [t]);
        setSaving(false);
        toast({ title: `«${base}» tem agora ${others.length + 1} variações`, description: `O stock que já havia ficou em «${first}».` });
        onDone?.([{ from: name, to: first }]);
        onClose();
    };

    const typeSuggestions = SUGGESTED_VALUES[clean(type)] || [];

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
                <DialogHeader className="text-left">
                    <DialogTitle>Editar «{name}»</DialogTitle>
                    <DialogDescription>O nome e as variações mudam em todo o programa: catálogo, stock de todas as localizações, receitas e encomendas em aberto.</DialogDescription>
                </DialogHeader>

                {/* ---------- Nome ---------- */}
                <section className="space-y-2">
                    <h3 className="text-sm font-semibold">Nome</h3>
                    {group && members.length > 1 && (
                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                            {[{ v: false, label: "Só esta variação" }, { v: true, label: `A família (${members.length})` }].map((o) => (
                                <button key={String(o.v)} type="button" onClick={() => { setFamily(o.v); setValue(o.v ? group : name); }}
                                    className={cn("h-10 rounded-lg text-sm font-semibold", family === o.v ? "bg-background shadow-sm" : "text-muted-foreground")}>
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex gap-2">
                        <Input id="rename-input" aria-label={family ? "Nome da família" : "Nome novo"} value={value} onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveName(); } }} className="h-11 text-base" autoComplete="off" />
                        <Button type="button" className="h-11 shrink-0" onClick={saveName} disabled={!pairs.length || !!clash || saving}>
                            {saving && !editing && !converting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mudar nome"}
                        </Button>
                    </div>
                    {clash ? <p className="text-sm text-destructive">Já há um produto chamado «{clash}».</p>
                        : family && pairs.length > 0 ? <p className="text-xs text-muted-foreground">Ex.: «{pairs[0].from}» → <b className="text-foreground">«{pairs[0].to}»</b></p> : null}
                    <p className="text-xs text-muted-foreground">As vendas antigas passam a aparecer com o nome novo; as facturas já emitidas ficam como estão.</p>
                </section>

                {/* ---------- Variações ---------- */}
                <section className="space-y-2 border-t pt-4" data-tour="qs-edit-variants">
                    <h3 className="flex items-center gap-1.5 text-sm font-semibold"><Layers className="h-4 w-4" /> Variações {group && <span className="font-normal text-muted-foreground">de {group}</span>}</h3>

                    {group ? (
                        <>
                            <ul className="divide-y rounded-xl border">
                                {members.map((m) => (
                                    <li key={m.name} className="px-3 py-2">
                                        {editing === m.name ? (
                                            <div className="space-y-2">
                                                {order.map((k) => (
                                                    <div key={k} className="flex items-center gap-2">
                                                        <span className="w-20 shrink-0 text-xs text-muted-foreground">{k}</span>
                                                        <Input value={editValues[k] ?? m.values[k] ?? ""} autoFocus={k === order[0]} list={`ev-${k}`}
                                                            onChange={(e) => setEditValues({ ...editValues, [k]: e.target.value })}
                                                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(m); } }} className="h-9" />
                                                        <datalist id={`ev-${k}`}>{(SUGGESTED_VALUES[k] || []).map((v) => <option key={v} value={v} />)}</datalist>
                                                    </div>
                                                ))}
                                                <div className="flex items-center gap-2">
                                                    <span className="w-20 shrink-0 text-xs text-muted-foreground">Preço</span>
                                                    <Input inputMode="decimal" aria-label={`Preço de ${m.name}`} value={editPrice} placeholder={m.price ? String(m.price) : "0"}
                                                        onChange={(e) => setEditPrice(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(m); } }} className="h-9 w-32" />
                                                </div>
                                                <div className="flex justify-end gap-2">
                                                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
                                                    <Button type="button" size="sm" onClick={() => saveEdit(m)} disabled={saving}><Check className="mr-1 h-4 w-4" /> Guardar</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className={cn("truncate text-sm", nameKey(m.name) === nameKey(name) && "font-semibold")}>{order.map((k) => m.values[k]).filter(Boolean).join(" / ") || m.name}</p>
                                                    <p className="text-xs text-muted-foreground">{m.stock} {m.unit}{location ? " aqui" : ""}{m.price ? ` · ${formatCurrency(m.price)}` : ""}</p>
                                                </div>
                                                <button type="button" aria-label={`Mudar ${m.name}`} onClick={() => { setEditing(m.name); setEditValues({}); setEditPrice(m.price ? String(m.price) : ""); }}
                                                    className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <div className="space-y-2 rounded-xl border border-dashed p-3" data-tour="qs-add-variant">
                                <p className="text-sm font-medium">Nova variação</p>
                                {order.map((k) => {
                                    const used = options.find((o) => o.name === k)?.values || [];
                                    return (
                                        <div key={k} className="flex items-center gap-2">
                                            <span className="w-20 shrink-0 text-xs text-muted-foreground">{k}</span>
                                            <Input value={adding[k] || ""} list={`nv-${k}`} placeholder={`Ex.: ${(SUGGESTED_VALUES[k] || []).find((v) => !used.includes(v)) || ""}`}
                                                onChange={(e) => setAdding({ ...adding, [k]: e.target.value })}
                                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOne(); } }} className="h-10" autoComplete="off" />
                                            <datalist id={`nv-${k}`}>{(SUGGESTED_VALUES[k] || []).filter((v) => !used.includes(v)).map((v) => <option key={v} value={v} />)}</datalist>
                                        </div>
                                    );
                                })}
                                <div className="flex items-center gap-2">
                                    <span className="w-20 shrink-0 text-xs text-muted-foreground">Preço</span>
                                    <Input inputMode="decimal" aria-label="Preço da variação nova" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} placeholder={String(model().price || 0)} className="h-10 w-28" />
                                    <span className="text-xs text-muted-foreground">vazio = o mesmo</span>
                                </div>
                                {withQty && (
                                    <div className="flex items-center gap-2">
                                        <span className="w-20 shrink-0 text-xs text-muted-foreground">Entrou agora</span>
                                        <Input inputMode="decimal" aria-label="Quantidade que entrou" value={addQty} onChange={(e) => setAddQty(e.target.value)} placeholder="0" className="h-10 w-28" />
                                    </div>
                                )}
                                <Button type="button" size="sm" variant="secondary" className="w-full" onClick={addOne} disabled={saving || order.some((k) => !clean(adding[k] || ""))}>
                                    <Plus className="mr-1 h-4 w-4" /> Acrescentar variação
                                </Button>
                            </div>
                        </>
                    ) : !converting ? (
                        <div className="rounded-xl border border-dashed p-3 text-sm">
                            <p className="text-muted-foreground">Este produto ainda não tem variações. Tem cores, texturas ou tamanhos diferentes?</p>
                            <Button type="button" variant="secondary" className="mt-2 w-full" onClick={() => setConverting(true)}>
                                <Layers className="mr-1.5 h-4 w-4" /> Criar variações
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3 rounded-xl border p-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium" htmlFor="var-type">Tipo de variação</label>
                                <Input id="var-type" value={type} list="var-types" onChange={(e) => setType(e.target.value)} className="h-10" autoComplete="off" />
                                <datalist id="var-types">{SUGGESTED_OPTIONS.map((o) => <option key={o} value={o} />)}</datalist>
                                <div className="flex flex-wrap gap-1.5">
                                    {SUGGESTED_OPTIONS.map((o) => (
                                        <button key={o} type="button" onClick={() => setType(o)} className={cn("rounded-full border px-2.5 py-0.5 text-xs", clean(type) === o ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground")}>{o}</button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium" htmlFor="var-current">O que já tem em stock é…</label>
                                <Input id="var-current" value={current} list="var-vals" placeholder={`Ex.: ${typeSuggestions[0] || "Cinzento"}`} onChange={(e) => setCurrent(e.target.value)} className="h-10" autoComplete="off" />
                                <p className="text-xs text-muted-foreground">O stock e o histórico de «{name}» ficam nesta variação{clean(current) ? <>: <b className="text-foreground">«{variantName(name, { [clean(type) || "Cor"]: clean(current) })}»</b></> : null}.</p>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium" htmlFor="var-other">Outras opções de {clean(type) || "Cor"}</label>
                                <p className="text-xs text-muted-foreground">{withQty ? "Quanto entrou agora e o preço de cada uma" : "O preço de cada uma"} (preço vazio = {formatCurrency(model().price || 0)}).</p>
                                {others.map((o, i) => (
                                    <div key={o.value} className="flex items-center gap-2">
                                        <span className="min-w-0 flex-1 truncate rounded-lg bg-muted px-3 py-2 text-sm">{o.value}</span>
                                        {withQty && <Input inputMode="decimal" aria-label={`Quantidade de ${o.value}`} value={o.qty} placeholder="qtd" onChange={(e) => setOthers(others.map((x, j) => (j === i ? { ...x, qty: e.target.value } : x)))} className="h-9 w-16" />}
                                        <Input inputMode="decimal" aria-label={`Preço de ${o.value}`} value={o.price} placeholder={String(model().price || "preço")} onChange={(e) => setOthers(others.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className="h-9 w-20" />
                                        <button type="button" aria-label={`Tirar ${o.value}`} onClick={() => setOthers(others.filter((_, j) => j !== i))} className="rounded-full p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <Input id="var-other" value={otherText} list="var-vals" placeholder={`Ex.: ${typeSuggestions[1] || "Vermelho"}`} onChange={(e) => setOtherText(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOther(); } }} className="h-10" autoComplete="off" />
                                    <Button type="button" variant="outline" className="h-10 shrink-0" onClick={addOther} disabled={!clean(otherText)}><Plus className="h-4 w-4" /></Button>
                                </div>
                                <datalist id="var-vals">{typeSuggestions.map((v) => <option key={v} value={v} />)}</datalist>
                            </div>
                            {convertClash && <p className="text-sm text-destructive">Já há um produto chamado «{convertClash}».</p>}
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" onClick={() => setConverting(false)}>Cancelar</Button>
                                <Button type="button" className="flex-1" onClick={convert} disabled={!clean(current) || !!convertClash || saving}>
                                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar {others.length + 1} variaç{others.length ? "ões" : "ão"}
                                </Button>
                            </div>
                        </div>
                    )}
                </section>
            </DialogContent>
        </Dialog>
    );
}
