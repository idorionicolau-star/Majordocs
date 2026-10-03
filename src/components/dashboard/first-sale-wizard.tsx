"use client";

import { useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";
import { InventoryContext } from "@/context/inventory-context";
import { useFirestore } from "@/firebase/provider";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { commitQuickStock, lineKey, type QuickLine } from "@/lib/quick-stock";
import { guessUnit, suggestCategory } from "@/lib/new-product";
import { checkFirstProduct, type FirstProductInput } from "@/lib/onboarding";

/**
 * Assistente da primeira venda: três campos (nome, preço, quantidade) criam o produto com stock e levam
 * directamente à Venda Rápida com o produto já no carrinho — só falta confirmar. Objectivo: menos de um minuto.
 */
export function FirstSaleWizard() {
    const inv = useContext(InventoryContext);
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [v, setV] = useState<FirstProductInput>({ name: "", price: "", qty: "10" });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<{ field: keyof FirstProductInput; msg: string } | null>(null);
    const refs = { name: useRef<HTMLInputElement>(null), price: useRef<HTMLInputElement>(null), qty: useRef<HTMLInputElement>(null) };
    const { companyId, user, isReadOnly } = inv || ({} as any);

    const set = (k: keyof FirstProductInput) => (e: React.ChangeEvent<HTMLInputElement>) => { setV((x) => ({ ...x, [k]: e.target.value })); if (error?.field === k) setError(null); };

    const submit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (busy) return;
        if (isReadOnly) { toast({ variant: "destructive", title: "Conta em modo leitura", description: "Contacte o suporte para reactivar o acesso completo." }); return; }
        const r = checkFirstProduct(v);
        if (!r.ok) { setError({ field: r.field, msg: r.error }); refs[r.field].current?.focus(); return; }
        if (!firestore || !companyId || !user) return;
        setBusy(true);
        try {
            const { name, price, qty } = r.value;
            const line: QuickLine = {
                key: lineKey(name, ""), name, location: "", sourceIds: [], systemStock: 0, reservedStock: 0,
                unit: guessUnit(name, ["un", "saco", "m", "m²", "m³", "kg", "L"]), qty, price, isNew: true,
                category: suggestCategory(name, [], []).category, addToCatalog: true, addCategory: true,
            };
            await commitQuickStock({ firestore, companyId, user: { id: user.id, username: user.username }, mode: "in", lines: [line], note: "Primeiro produto" });
            router.push(`/pos?add=${encodeURIComponent(name)}`);
        } catch (err: any) {
            toast({ variant: "destructive", title: "Não foi possível criar o produto", description: err?.message || "Tente de novo." });
            setBusy(false);
        }
    };

    const field = (k: keyof FirstProductInput, label: string, props: React.ComponentProps<typeof Input>) => (
        <div className="space-y-1.5">
            <Label htmlFor={`fs-${k}`}>{label}</Label>
            <Input
                id={`fs-${k}`} ref={refs[k]} value={v[k]} onChange={set(k)} aria-invalid={error?.field === k}
                className={`h-12 text-base ${error?.field === k ? "border-destructive" : ""}`} {...props}
            />
        </div>
    );

    return (
        <section className="rounded-2xl border-2 border-primary/40 bg-card p-4 shadow-sm" aria-label="Primeira venda">
            <h3 className="flex items-center gap-2 text-lg font-bold"><ShoppingCart className="h-5 w-5 text-primary" /> A sua primeira venda em segundos</h3>
            <p className="mt-1 text-sm text-muted-foreground">Diga-nos um produto que vende. Nós criamos tudo e deixamos a venda pronta a confirmar.</p>
            <form onSubmit={submit} className="mt-4 space-y-3">
                {field("name", "O que vende?", { placeholder: "Ex.: Cimento", autoFocus: true, autoComplete: "off", enterKeyHint: "next" })}
                <div className="grid grid-cols-2 gap-3">
                    {field("price", "Preço de venda (MZN)", { placeholder: "Ex.: 600", inputMode: "decimal", autoComplete: "off", enterKeyHint: "next" })}
                    {field("qty", "Quantas tem em stock?", { placeholder: "Ex.: 10", inputMode: "decimal", autoComplete: "off", enterKeyHint: "done" })}
                </div>
                {error && <p role="alert" className="text-sm font-medium text-destructive">{error.msg}</p>}
                <Button type="submit" size="lg" className="h-12 w-full text-base" disabled={busy}>
                    {busy ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
                    Criar produto e vender
                </Button>
            </form>
        </section>
    );
}
