"use client";

import { useContext, useState } from "react";
import { getAuth } from "firebase/auth";
import { ImagePlus, Loader2, X } from "lucide-react";
import { InventoryContext } from "@/context/inventory-context";
import { useToast } from "@/hooks/use-toast";
import { uploadProductImage } from "@/lib/upload-product-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/** Foto do produto: comprime e envia para o Vercel Blob; o formulário guarda só o endereço (`imageUrl`). */
export function ProductImageField({ value, onChange }: { value?: string; onChange: (url: string) => void }) {
    const inv = useContext(InventoryContext);
    const { toast } = useToast();
    const [busy, setBusy] = useState(false);
    const id = `product-image-${Math.random().toString(36).slice(2, 8)}`;

    const pick = async (file: File) => {
        if (!inv?.companyId) return;
        setBusy(true);
        try {
            onChange(await uploadProductImage(file, getAuth(), inv.companyId));
        } catch (e: any) {
            toast({ variant: "destructive", title: "Não foi possível enviar a foto", description: e.message });
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex items-center gap-3">
            {value ? (
                <div className="relative">
                    <img src={value} alt="Foto do produto" className="h-16 w-16 rounded-lg border bg-white object-cover" />
                    <button type="button" onClick={() => onChange("")} className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground" aria-label="Remover foto">
                        <X className="h-3 w-3" />
                    </button>
                </div>
            ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed text-muted-foreground"><ImagePlus className="h-6 w-6" /></div>
            )}
            <Label htmlFor={id} className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" asChild>
                    <span>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}{value ? "Alterar foto" : "Adicionar foto"}</span>
                </Button>
            </Label>
            <input id={id} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = ""; }} />
        </div>
    );
}
