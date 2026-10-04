"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";
import { nameKey } from "@/lib/catalog-view";
import { renameClash, renamePairs, type RenamePair } from "@/lib/rename";
import { cn } from "@/lib/utils";

/** Quem pode mudar nomes: quem gere o catálogo e o inventário. */
export function useCanRename() {
    const { canEdit, isReadOnly } = useInventory();
    return !isReadOnly && canEdit("settings") && canEdit("inventory");
}

/**
 * "Mudar nome": muda em todo o programa (catálogo, stock em todas as localizações, receitas, encomendas em aberto).
 * Num produto com variações, pode mudar só esta variação ou o nome da família toda.
 */
export function RenameProductDialog({ name, open, onClose, onDone }: {
    name: string;
    open: boolean;
    onClose: () => void;
    onDone?: (pairs: RenamePair[]) => void;
}) {
    const { catalogProducts, products, renameProduct } = useInventory();
    const { toast } = useToast();
    const all = useMemo(() => [...(catalogProducts || []), ...(products || [])], [catalogProducts, products]);
    const product = useMemo(() => all.find((p) => nameKey(p.name) === nameKey(name)), [all, name]);
    const group = product?.variantGroup;
    const familySize = useMemo(() => (group ? new Set((catalogProducts || []).filter((p) => p.variantGroup && nameKey(p.variantGroup) === nameKey(group)).map((p) => nameKey(p.name))).size : 0), [catalogProducts, group]);
    const [family, setFamily] = useState(false);
    const [value, setValue] = useState(name);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!open) return;
        setFamily(false);
        setValue(name);
        setSaving(false);
    }, [open, name]);

    const pairs = product ? renamePairs(product, value, all, family) : [];
    const clash = pairs.length ? renameClash(pairs, all) : null;

    const save = async () => {
        if (!pairs.length || clash || saving) return;
        setSaving(true);
        const ok = await renameProduct(name, value, { family });
        setSaving(false);
        if (!ok) return;
        toast({ title: "Nome mudado", description: pairs.length > 1 ? `${pairs.length} variações passam a «${value.trim()} - …».` : `«${pairs[0].from}» passa a «${pairs[0].to}» em todo o programa.` });
        onDone?.(pairs);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-left">
                    <DialogTitle>Mudar nome</DialogTitle>
                    <DialogDescription>
                        Muda no catálogo, no stock de todas as localizações, nas receitas e nas encomendas em aberto.
                        As vendas e os movimentos antigos passam a aparecer com o nome novo; as facturas já emitidas ficam como estão.
                    </DialogDescription>
                </DialogHeader>
                {group && familySize > 1 && (
                    <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                        {[{ v: false, label: "Só esta variação" }, { v: true, label: `A família (${familySize})` }].map((o) => (
                            <button
                                key={String(o.v)}
                                type="button"
                                onClick={() => { setFamily(o.v); setValue(o.v ? group : name); }}
                                className={cn("h-10 rounded-lg text-sm font-semibold", family === o.v ? "bg-background shadow-sm" : "text-muted-foreground")}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                )}
                <div className="space-y-1.5">
                    <label htmlFor="rename-input" className="text-sm font-medium">{family ? "Nome da família" : "Nome novo"}</label>
                    <Input
                        id="rename-input"
                        value={value}
                        autoFocus
                        onChange={(e) => setValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); save(); } }}
                        className="h-12 text-base"
                        autoComplete="off"
                    />
                    {clash ? (
                        <p className="text-sm text-destructive">Já há um produto chamado «{clash}».</p>
                    ) : family && pairs.length > 0 ? (
                        <p className="text-xs text-muted-foreground">Ex.: «{pairs[0].from}» → <b className="text-foreground">«{pairs[0].to}»</b></p>
                    ) : null}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                    <Button type="button" onClick={save} disabled={!pairs.length || !!clash || saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Mudar nome
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
