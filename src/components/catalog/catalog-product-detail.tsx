"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Copy, Edit, ImageOff, ScanBarcode, Trash2, TrendingDown, TrendingUp, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { marginPct, nameKey } from "@/lib/catalog-view";
import { formatCurrency } from "@/lib/utils";
import type { Location, Product, Sale } from "@/lib/types";

type Item = Omit<Product, "stock" | "instanceId" | "reservedStock" | "location" | "lastUpdated"> & { id?: string };

const fmtDate = (iso?: string) => { const d = iso ? new Date(iso) : null; return d && !isNaN(d.getTime()) ? d.toLocaleDateString("pt-PT") : ""; };
const fmtQty = (n: number) => new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 2 }).format(n);

/**
 * Ficha do produto do catálogo: foto, preço, custo e margem, código de barras, quanto há em cada local,
 * últimas vendas e histórico de preços. Abre ao tocar num produto; daqui edita-se, duplica-se ou apaga-se.
 */
export function CatalogProductDetail({ product, inventory, sales, locations, readOnly, onClose, onEdit, onDuplicate, onDelete }: {
    product: Item | null;
    inventory: Product[];
    sales: Sale[];
    locations: Location[];
    readOnly: boolean;
    onClose: () => void;
    onEdit: (p: Item) => void;
    onDuplicate: (p: Item) => void;
    onDelete: (p: Item) => void;
}) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const key = product ? nameKey(product.name) : "";
    const stock = useMemo(() => (product ? inventory.filter((p) => !p.deletedAt && nameKey(p.name) === key) : []), [inventory, key, product]);
    const recent = useMemo(
        () => (product ? sales.filter((s) => !s.deletedAt && nameKey(s.productName || "") === key).sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 5) : []),
        [sales, key, product],
    );
    const margin = product ? marginPct(product.price, product.cost) : null;
    const history = [...(product?.priceHistory || [])].reverse().slice(0, 6);
    const locName = (id?: string) => (!id || id === "Principal" ? locations.find((l) => l.id === id)?.name || "Principal" : locations.find((l) => l.id === id)?.name || id);
    const totalStock = stock.reduce((t, p) => t + (p.stock || 0), 0);
    const totalReserved = stock.reduce((t, p) => t + (p.reservedStock || 0), 0);
    const unit = product?.unit && product.unit !== "un" ? `/${product.unit}` : "";

    return (
        <Sheet open={!!product} onOpenChange={(o) => !o && onClose()}>
            <SheetContent side={isDesktop ? "right" : "bottom"} className={isDesktop ? "w-[420px] overflow-y-auto sm:max-w-[420px]" : "max-h-[90vh] overflow-y-auto rounded-t-2xl"}>
                {product && (
                    <div className="space-y-5 pb-4">
                        <SheetHeader className="text-left">
                            <div className="flex gap-3">
                                {product.imageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={product.imageUrl} alt="" className="h-24 w-24 shrink-0 rounded-xl border object-cover" />
                                ) : (
                                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border bg-muted/40 text-muted-foreground"><ImageOff className="h-6 w-6 opacity-50" /></div>
                                )}
                                <div className="min-w-0">
                                    <SheetTitle className="break-words text-lg leading-tight">{product.name}</SheetTitle>
                                    <SheetDescription>{product.category || "Sem categoria"}</SheetDescription>
                                    {product.barcode && <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><ScanBarcode className="h-3.5 w-3.5" /> <span className="font-mono">{product.barcode}</span></p>}
                                </div>
                            </div>
                        </SheetHeader>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-xl border p-2.5"><p className="text-[11px] text-muted-foreground">Preço</p><p className="text-sm font-bold tabular-nums">{formatCurrency(product.price || 0)}<span className="text-xs font-normal text-muted-foreground">{unit}</span></p></div>
                            <div className="rounded-xl border p-2.5"><p className="text-[11px] text-muted-foreground">Custo</p><p className="text-sm font-bold tabular-nums">{product.cost ? formatCurrency(product.cost) : "—"}</p></div>
                            <div className={`rounded-xl border p-2.5 ${margin !== null && margin < 0 ? "border-destructive/50 bg-destructive/5" : ""}`}><p className="text-[11px] text-muted-foreground">Margem</p><p className="text-sm font-bold tabular-nums">{margin === null ? "—" : `${margin}%`}</p></div>
                        </div>

                        <section aria-label="Stock">
                            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><Warehouse className="h-4 w-4" /> Stock no inventário</h3>
                            {stock.length === 0 ? (
                                <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">Ainda não há stock deste produto. Faça uma entrada no Stock Rápido.</p>
                            ) : (
                                <ul className="divide-y rounded-xl border text-sm">
                                    {stock.map((p, i) => (
                                        <li key={p.id || i} className="flex items-center justify-between px-3 py-2">
                                            <span>{locName(p.location)}</span>
                                            <span className="tabular-nums"><b>{fmtQty(p.stock || 0)}</b> {p.unit || "un"}{(p.reservedStock || 0) > 0 && <span className="text-muted-foreground"> · {fmtQty(p.reservedStock || 0)} reservado</span>}</span>
                                        </li>
                                    ))}
                                    {stock.length > 1 && <li className="flex items-center justify-between bg-muted/30 px-3 py-2 font-medium"><span>Total</span><span className="tabular-nums">{fmtQty(totalStock)}{totalReserved > 0 ? ` · ${fmtQty(totalReserved)} reservado` : ""}</span></li>}
                                </ul>
                            )}
                        </section>

                        {recent.length > 0 && (
                            <section aria-label="Últimas vendas">
                                <h3 className="mb-2 text-sm font-semibold">Últimas vendas</h3>
                                <ul className="divide-y rounded-xl border text-sm">
                                    {recent.map((s) => (
                                        <li key={s.id} className="flex items-center justify-between px-3 py-2">
                                            <span className="text-muted-foreground">{fmtDate(s.date)}{s.clientName ? ` · ${s.clientName}` : ""}</span>
                                            <span className="tabular-nums">{fmtQty(s.quantity)} × {formatCurrency(s.unitPrice || 0)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {history.length > 0 && (
                            <section aria-label="Histórico de preços">
                                <h3 className="mb-2 text-sm font-semibold">Histórico de preços</h3>
                                <ul className="divide-y rounded-xl border text-sm">
                                    {history.map((h, i) => (
                                        <li key={i} className="flex items-center justify-between px-3 py-2">
                                            <span className="text-muted-foreground">{fmtDate(h.at)}{h.by ? ` · ${h.by}` : ""}</span>
                                            <span className="flex items-center gap-1 tabular-nums">
                                                {formatCurrency(h.from)} → <b>{formatCurrency(h.to)}</b>
                                                {h.to > h.from ? <TrendingUp className="h-3.5 w-3.5 text-emerald-600" /> : <TrendingDown className="h-3.5 w-3.5 text-rose-600" />}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <div className="flex flex-wrap gap-2 pt-1">
                            <Button disabled={readOnly} onClick={() => onEdit(product)}><Edit className="mr-1.5 h-4 w-4" /> Editar</Button>
                            <Button variant="outline" disabled={readOnly} onClick={() => onDuplicate(product)}><Copy className="mr-1.5 h-4 w-4" /> Duplicar</Button>
                            <Button variant="outline" asChild><Link href={`/inventory?search=${encodeURIComponent(product.name)}`}>Ver no inventário</Link></Button>
                            <Button variant="ghost" className="text-destructive" disabled={readOnly} onClick={() => onDelete(product)}><Trash2 className="mr-1.5 h-4 w-4" /> Apagar</Button>
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
