"use client";

import { useContext, useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { InventoryContext } from "@/context/inventory-context";
import { getPrintFormat, setPrintFormat, type PrintFormat } from "@/lib/print-format";
import { printSaleReceipt } from "@/lib/utils";
import type { Sale } from "@/lib/types";

const OPTIONS: { value: PrintFormat; label: string; hint: string }[] = [
    { value: "a4", label: "Folha A4", hint: "impressora normal (documento completo)" },
    { value: "80", label: "Talão de 80 mm", hint: "impressora térmica de balcão" },
    { value: "58", label: "Talão de 58 mm", hint: "impressora térmica pequena ou portátil" },
];

/** um talão de exemplo, para experimentar a impressora sem fazer uma venda */
const SAMPLE: Sale[] = [
    { id: "t1", productId: "t1", productName: "Cimento 32,5 (50 kg)", quantity: 2, unit: "saco", unitPrice: 650, subtotal: 1300, totalValue: 1300, amountPaid: 1300 },
    { id: "t2", productId: "t2", productName: "Bloco 15 x 40", quantity: 100, unit: "un", unitPrice: 35, subtotal: 3500, totalValue: 3500, amountPaid: 3500 },
].map((x) => ({ ...x, date: new Date().toISOString(), soldBy: "Teste", guideNumber: "TESTE", status: "Levantado", documentType: "Venda a Dinheiro", clientName: "", paymentMethod: "Numerário" } as unknown as Sale));

/** Definições → Documentos: em que papel imprime este aparelho (A4 ou talão de impressora térmica). */
export function PrintFormatSetting() {
    const company = useContext(InventoryContext)?.companyData || null;
    const [value, setValue] = useState<PrintFormat>("a4");
    useEffect(() => { setValue(getPrintFormat()); }, []);
    const change = (v: string) => { const next = v === "80" || v === "58" ? v : "a4"; setValue(next); setPrintFormat(next); };
    return (
        <Card className="glass-card mb-4">
            <CardHeader>
                <CardTitle>Impressora deste aparelho</CardTitle>
                <CardDescription>Só neste aparelho. Com impressora de talão, o botão Imprimir passa a imprimir o talão; o documento A4 continua no PDF.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <RadioGroup value={value} onValueChange={change} className="gap-3" data-testid="print-format-setting">
                    {OPTIONS.map((o) => (
                        <Label key={o.value} className="flex cursor-pointer items-center gap-3 font-normal">
                            <RadioGroupItem value={o.value} />
                            <span><b className="font-semibold">{o.label}</b> <span className="text-muted-foreground">— {o.hint}</span></span>
                        </Label>
                    ))}
                </RadioGroup>
                {value !== "a4" && (
                    <Button type="button" variant="outline" onClick={() => printSaleReceipt(SAMPLE, company, value === "58" ? 58 : 80)} data-testid="print-test">
                        <Printer className="mr-2 h-4 w-4" />Imprimir talão de teste
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
