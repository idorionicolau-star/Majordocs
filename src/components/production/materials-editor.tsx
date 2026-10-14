"use client";

import { FlaskConical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MaterialLine } from "@/lib/production-core";
import type { RawMaterial } from "@/lib/types";

/** Linha em edição: a quantidade fica como texto enquanto se escreve ("2," a meio de "2,5"). */
export type MaterialDraft = { rawMaterialId: string; name: string; qty: string; unit?: string };

export const toDrafts = (lines: MaterialLine[]): MaterialDraft[] => lines.map((l) => ({ rawMaterialId: l.rawMaterialId, name: l.name, unit: l.unit, qty: String(l.quantity) }));
export const fromDrafts = (drafts: MaterialDraft[]): MaterialLine[] =>
    drafts.map((d) => ({ rawMaterialId: d.rawMaterialId, name: d.name, unit: d.unit, quantity: Number(String(d.qty).replace(",", ".")) || 0 }));

/**
 * A matéria-prima gasta numa produção (sacos de cimento, areia, tinta…): vem da receita e pode ser corrigida,
 * acrescentada ou tirada. O stock de matéria-prima desconta exactamente o que ficar aqui.
 */
export function MaterialsEditor({ value, onChange, rawMaterials, recipe, onUseRecipe }: {
    value: MaterialDraft[];
    onChange: (v: MaterialDraft[]) => void;
    rawMaterials: RawMaterial[];
    /** a lista que a receita daria (para o botão "Usar a receita") */
    recipe?: MaterialLine[];
    onUseRecipe?: () => void;
}) {
    const used = new Set(value.map((v) => v.rawMaterialId));
    const free = rawMaterials.filter((r) => !used.has(r.id)).sort((a, b) => a.name.localeCompare(b.name, "pt"));
    const stockOf = (id: string) => rawMaterials.find((r) => r.id === id);
    const set = (i: number, patch: Partial<MaterialDraft>) => onChange(value.map((v, j) => (j === i ? { ...v, ...patch } : v)));

    return (
        <div className="space-y-2" data-tour="prod-materials">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><FlaskConical className="h-3.5 w-3.5" /> Matéria-prima usada</p>
                {onUseRecipe && recipe && recipe.length > 0 && (
                    <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onUseRecipe}><RotateCcw className="mr-1 h-3.5 w-3.5" /> Usar a receita</Button>
                )}
            </div>
            {value.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma — o stock de matéria-prima não mexe.</p>}
            {value.map((m, i) => {
                const r = stockOf(m.rawMaterialId);
                return (
                    <div key={m.rawMaterialId} className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{m.name}</p>
                            {r && <p className="text-[11px] text-muted-foreground">Em stock: {r.stock} {r.unit}</p>}
                        </div>
                        <Input inputMode="decimal" value={m.qty} onChange={(e) => set(i, { qty: e.target.value })} onFocus={(e) => e.target.select()}
                            aria-label={`Quantidade de ${m.name}`} className="h-9 w-20 text-center" />
                        <span className="w-12 truncate text-xs text-muted-foreground">{m.unit || r?.unit || ""}</span>
                        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label={`Tirar ${m.name}`}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                );
            })}
            {free.length > 0 && (
                <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <select aria-label="Juntar matéria-prima" value="" className="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 text-sm"
                        onChange={(e) => {
                            const r = rawMaterials.find((x) => x.id === e.target.value);
                            if (r) onChange([...value, { rawMaterialId: r.id, name: r.name, unit: r.unit, qty: "1" }]);
                        }}>
                        <option value="">Juntar matéria-prima…</option>
                        {free.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.stock} {r.unit})</option>)}
                    </select>
                </div>
            )}
            {rawMaterials.length === 0 && <p className="text-xs text-muted-foreground">Ainda não há matéria-prima registada (menu Matéria-Prima).</p>}
        </div>
    );
}
