"use client";

import { useState, useContext, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCRM } from '@/context/crm-context';
import { InventoryContext } from '@/context/inventory-context';
import { useFirestore } from '@/firebase/provider';
import { collection, doc, runTransaction } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, downloadSaleDocument } from '@/lib/utils';
import { DatePicker } from '@/components/ui/date-picker';
import { CatalogProductSelector } from '@/components/catalog/catalog-product-selector';
import type { Sale, Product } from '@/lib/types';
import {
    ArrowLeft,
    Loader2,
    Plus,
    Trash2,
    FileText,
    Printer,
    Save,
} from 'lucide-react';
import Link from 'next/link';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;

type DocumentItem = {
    id: string;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
};

const DOCUMENT_TYPES = [
    { value: 'Cotação', label: 'Cotação / Proposta' },
    { value: 'Factura Proforma', label: 'Factura Proforma' },
    { value: 'Factura', label: 'Factura' },
    { value: 'Recibo', label: 'Recibo' },
    { value: 'Guia de Remessa', label: 'Guia de Remessa' },
    { value: 'Venda a Dinheiro', label: 'Venda a Dinheiro' },
] as const;

const NON_FINANCIAL_TYPES = ['Cotação', 'Factura Proforma'];

function generateId() {
    return `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function NewDocumentPage() {
    const router = useRouter();
    const { toast } = useToast();
    const firestore = useFirestore();
    const inventoryContext = useContext(InventoryContext);
    const { customers } = useCRM();

    const {
        catalogProducts,
        catalogCategories,
        user,
        companyId,
        companyData,
    } = inventoryContext || {
        catalogProducts: [], catalogCategories: [], user: null, companyId: null, companyData: null,
    };

    // --- State ---
    const [documentType, setDocumentType] = useState<Sale['documentType']>('Cotação');
    const [clientName, setClientName] = useState('');
    const [issueDate, setIssueDate] = useState<Date>(new Date());
    const [validityDate, setValidityDate] = useState<Date | undefined>(undefined);
    const [notes, setNotes] = useState('');
    const [saveToHistory, setSaveToHistory] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Discount & VAT
    const [discountType, setDiscountType] = useState<'fixed' | 'percentage'>('fixed');
    const [discountValue, setDiscountValue] = useState(0);
    const [applyVat, setApplyVat] = useState(false);
    const [vatPercentage, setVatPercentage] = useState(17);

    // Items
    const [items, setItems] = useState<DocumentItem[]>([
        { id: generateId(), description: '', quantity: 1, unit: 'un', unitPrice: 0 },
    ]);

    // Auto-toggle save based on document type
    const isNonFinancial = NON_FINANCIAL_TYPES.includes(documentType);

    // --- Calculations ---
    const subtotal = useMemo(() =>
        items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0),
        [items]
    );

    const discountAmount = useMemo(() => {
        if (discountType === 'percentage') {
            return subtotal * (discountValue / 100);
        }
        return discountValue;
    }, [discountType, discountValue, subtotal]);

    const totalAfterDiscount = Math.max(0, subtotal - discountAmount);
    const vatAmount = applyVat ? totalAfterDiscount * (vatPercentage / 100) : 0;
    const totalValue = totalAfterDiscount + vatAmount;

    // --- Item Management ---
    const addItem = useCallback(() => {
        setItems(prev => [...prev, { id: generateId(), description: '', quantity: 1, unit: 'un', unitPrice: 0 }]);
    }, []);

    const removeItem = useCallback((id: string) => {
        setItems(prev => prev.length > 1 ? prev.filter(item => item.id !== id) : prev);
    }, []);

    const updateItem = useCallback((id: string, field: keyof DocumentItem, value: string | number) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));
    }, []);

    const handleProductSelect = useCallback((itemId: string, productName: string, product?: CatalogProduct) => {
        setItems(prev => prev.map(item =>
            item.id === itemId ? {
                ...item,
                description: productName,
                unitPrice: product?.price || item.unitPrice,
                unit: (product?.unit as string) || item.unit,
            } : item
        ));
    }, []);

    // --- Submit ---
    async function handleEmit() {
        // Validate at least one item
        const validItems = items.filter(i => i.description.trim() && i.quantity > 0);
        if (validItems.length === 0) {
            toast({ variant: 'destructive', title: 'Sem itens', description: 'Adicione pelo menos um item com descrição e quantidade.' });
            return;
        }

        if (!user) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Utilizador não autenticado.' });
            return;
        }

        setIsSubmitting(true);

        try {
            let guideNumber = `DOC-${Date.now().toString().slice(-8)}`;

            // Generate proper numbering if saving to history
            if (saveToHistory && firestore && companyId) {
                const companyRef = doc(firestore, `companies/${companyId}`);
                await runTransaction(firestore, async (transaction) => {
                    const companyDoc = await transaction.get(companyRef);
                    if (!companyDoc.exists()) throw new Error("Empresa não encontrada.");

                    const compData = companyDoc.data();
                    const allNumbering = compData.documentNumbering || {};
                    const typeConfig = allNumbering[documentType];
                    const newSaleCounter = (compData.saleCounter || 0) + 1;

                    if (typeConfig && typeConfig.prefix) {
                        const num = typeConfig.nextNumber || 1;
                        const padded = typeConfig.padding > 0 ? String(num).padStart(typeConfig.padding, '0') : String(num);
                        guideNumber = `${typeConfig.prefix}${typeConfig.separator || ''}${padded}`;
                    } else {
                        const prefix = documentType === 'Cotação' ? 'COT'
                            : documentType === 'Factura Proforma' ? 'FP'
                                : documentType === 'Recibo' ? 'REC'
                                    : documentType === 'Guia de Remessa' ? 'GR'
                                        : documentType === 'Factura' ? 'FAT'
                                            : 'VD';
                        guideNumber = `${prefix}-${String(newSaleCounter).padStart(6, '0')}`;
                    }

                    // Save each item as a sale record
                    const salesRef = collection(firestore, `companies/${companyId}/sales`);
                    const perItemDiscount = validItems.length > 0 ? discountAmount / validItems.length : 0;
                    const perItemVat = validItems.length > 0 ? vatAmount / validItems.length : 0;

                    validItems.forEach((item, idx) => {
                        const itemSubtotal = item.quantity * item.unitPrice;
                        const itemTotal = itemSubtotal - perItemDiscount + perItemVat;

                        const newSale: Omit<Sale, 'id'> = {
                            date: issueDate.toISOString(),
                            productId: item.description,
                            productName: item.description,
                            quantity: item.quantity,
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                            subtotal: itemSubtotal,
                            discount: idx === 0 ? discountAmount : 0,
                            vat: idx === 0 ? vatAmount : 0,
                            totalValue: idx === 0 ? totalValue : itemSubtotal,
                            amountPaid: isNonFinancial ? 0 : (idx === 0 ? totalValue : itemSubtotal),
                            soldBy: user.username,
                            guideNumber: guideNumber,
                            status: isNonFinancial ? 'Pendente' : 'Pago',
                            documentType: documentType,
                            clientName: clientName || undefined,
                            notes: idx === 0 ? notes : undefined,
                            transactionId: guideNumber,
                        };
                        transaction.set(doc(salesRef), newSale);
                    });

                    transaction.update(companyRef, {
                        saleCounter: newSaleCounter,
                        ...(typeConfig && typeConfig.prefix ? { [`documentNumbering.${documentType}.nextNumber`]: (typeConfig.nextNumber || 1) + 1 } : {})
                    });
                });
            } else {
                // Generate a simple number for the preview
                const prefix = documentType === 'Cotação' ? 'COT'
                    : documentType === 'Factura Proforma' ? 'FP'
                        : documentType === 'Recibo' ? 'REC'
                            : documentType === 'Guia de Remessa' ? 'GR'
                                : documentType === 'Factura' ? 'FAT'
                                    : 'VD';
                guideNumber = `${prefix}-${Date.now().toString().slice(-6)}`;
            }

            // Build Sale objects for document generation
            const salesForDoc: Sale[] = validItems.map((item, idx) => ({
                id: item.id,
                date: issueDate.toISOString(),
                productId: item.description,
                productName: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: item.unitPrice,
                subtotal: item.quantity * item.unitPrice,
                discount: idx === 0 ? discountAmount : 0,
                vat: idx === 0 ? vatAmount : 0,
                totalValue: idx === 0 ? totalValue : item.quantity * item.unitPrice,
                amountPaid: 0,
                soldBy: user.username,
                guideNumber: guideNumber,
                status: 'Pendente' as const,
                documentType: documentType,
                clientName: clientName || undefined,
                notes: idx === 0 ? notes : undefined,
            }));

            // Generate and open document
            downloadSaleDocument(salesForDoc, companyData);

            toast({
                title: 'Documento Emitido',
                description: saveToHistory
                    ? `${documentType} nº ${guideNumber} emitida e guardada no histórico.`
                    : `${documentType} nº ${guideNumber} emitida com sucesso.`,
            });

            if (saveToHistory) {
                router.push('/sales');
            }

        } catch (error: any) {
            console.error("Error generating document:", error);
            toast({ variant: 'destructive', title: 'Erro', description: error.message || 'Não foi possível emitir o documento.' });
        } finally {
            setIsSubmitting(false);
        }
    }

    if (!inventoryContext) return null;

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full pb-20 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="rounded-full">
                    <Link href="/sales">
                        <ArrowLeft className="h-5 w-5" />
                        <span className="sr-only">Voltar</span>
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-headline font-bold">Emitir Documento</h1>
                    <p className="text-muted-foreground text-sm">Crie cotações, facturas, recibos e guias — sem necessidade de stock.</p>
                </div>
            </div>

            <Card className="glass-panel p-6 border-none shadow-lg">
                <div className="space-y-6">

                    {/* Document Type & Client */}
                    <div className="space-y-4 rounded-lg border p-4">
                        <h3 className="font-semibold leading-none tracking-tight">Tipo de Documento & Cliente</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Documento</Label>
                                <Select value={documentType} onValueChange={(v) => setDocumentType(v as Sale['documentType'])}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {DOCUMENT_TYPES.map(dt => (
                                            <SelectItem key={dt.value} value={dt.value}>{dt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nome do Cliente</Label>
                                <Input
                                    placeholder="Consumidor Final"
                                    value={clientName}
                                    onChange={e => setClientName(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Data de Emissão</Label>
                                <DatePicker date={issueDate} setDate={(d) => d && setIssueDate(d)} />
                            </div>
                            {isNonFinancial && (
                                <div className="space-y-2">
                                    <Label>Válido até (Opcional)</Label>
                                    <DatePicker date={validityDate} setDate={setValidityDate} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-4 rounded-lg border p-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold leading-none tracking-tight">Itens do Documento</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1">
                                <Plus className="h-4 w-4" /> Adicionar Linha
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {/* Header */}
                            <div className="hidden sm:grid sm:grid-cols-[1fr_100px_80px_120px_40px] gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                                <span>Descrição</span>
                                <span className="text-right">Qtd.</span>
                                <span>Unid.</span>
                                <span className="text-right">Preço Un.</span>
                                <span></span>
                            </div>

                            {items.map((item) => (
                                <div key={item.id} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_80px_120px_40px] gap-2 items-start p-3 sm:p-1 rounded-lg bg-muted/30 sm:bg-transparent">
                                    <div>
                                        <Label className="sm:hidden text-xs text-muted-foreground mb-1">Descrição / Produto</Label>
                                        <CatalogProductSelector
                                            products={catalogProducts || []}
                                            categories={catalogCategories || []}
                                            selectedValue={item.description}
                                            onValueChange={(name, product) => handleProductSelect(item.id, name, product)}
                                            placeholder="Produto ou descrição livre..."
                                        />
                                    </div>
                                    <div>
                                        <Label className="sm:hidden text-xs text-muted-foreground mb-1">Quantidade</Label>
                                        <Input
                                            type="number"
                                            step="any"
                                            min="0.01"
                                            value={item.quantity || ''}
                                            onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                                            className="text-right"
                                            placeholder="1"
                                        />
                                    </div>
                                    <div>
                                        <Label className="sm:hidden text-xs text-muted-foreground mb-1">Unidade</Label>
                                        <Select value={item.unit} onValueChange={v => updateItem(item.id, 'unit', v)}>
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="un">un</SelectItem>
                                                <SelectItem value="m²">m²</SelectItem>
                                                <SelectItem value="m">m</SelectItem>
                                                <SelectItem value="cj">cj</SelectItem>
                                                <SelectItem value="outro">outro</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label className="sm:hidden text-xs text-muted-foreground mb-1">Preço Unitário</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unitPrice || ''}
                                            onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            className="text-right"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="flex items-end sm:items-center justify-end sm:justify-center h-10">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeItem(item.id)}
                                            disabled={items.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Discount & VAT */}
                    <div className="space-y-4 rounded-lg border p-4">
                        <h3 className="font-semibold leading-none tracking-tight">Descontos & Impostos (Opcional)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Tipo de Desconto</Label>
                                <Select value={discountType} onValueChange={v => setDiscountType(v as 'fixed' | 'percentage')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="fixed">Valor Fixo (MT)</SelectItem>
                                        <SelectItem value="percentage">Percentual (%)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Valor do Desconto</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={discountValue || ''}
                                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between rounded-lg border p-3 h-full">
                                    <Label className="cursor-pointer">Adicionar IVA</Label>
                                    <Switch checked={applyVat} onCheckedChange={setApplyVat} />
                                </div>
                            </div>
                        </div>
                        {applyVat && (
                            <div className="max-w-xs space-y-2">
                                <Label>Taxa do IVA (%)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={vatPercentage}
                                    onChange={e => setVatPercentage(parseFloat(e.target.value) || 0)}
                                    placeholder="17"
                                />
                            </div>
                        )}
                    </div>

                    {/* Notes */}
                    <div className="space-y-2 rounded-lg border p-4">
                        <Label>Notas / Condições (Opcional)</Label>
                        <Textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="Ex: Válido por 30 dias. Entrega em 5 dias úteis após confirmação..."
                            rows={3}
                        />
                    </div>

                    {/* Save Toggle */}
                    <div className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                            <Label className="text-base font-semibold cursor-pointer">Guardar no Histórico de Vendas</Label>
                            <p className="text-xs text-muted-foreground">
                                {isNonFinancial
                                    ? "Cotações e proformas normalmente não são guardadas como vendas."
                                    : "Facturas e recibos são normalmente registados no histórico."}
                            </p>
                        </div>
                        <Switch checked={saveToHistory} onCheckedChange={setSaveToHistory} />
                    </div>

                    {/* Totals */}
                    <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 p-5 border border-emerald-100 dark:border-emerald-900 shadow-sm">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-emerald-800 dark:text-emerald-300 opacity-80">Subtotal ({items.filter(i => i.description.trim()).length} {items.filter(i => i.description.trim()).length === 1 ? 'item' : 'itens'})</span>
                                <span className="font-medium text-emerald-900 dark:text-emerald-200">{formatCurrency(subtotal)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-emerald-800 dark:text-emerald-300 opacity-80">
                                        Desconto ({discountType === 'percentage' ? `${discountValue}%` : 'Fixo'})
                                    </span>
                                    <span className="font-medium text-rose-500">- {formatCurrency(discountAmount)}</span>
                                </div>
                            )}
                            {applyVat && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-emerald-800 dark:text-emerald-300 opacity-80">IVA ({vatPercentage}%)</span>
                                    <span className="font-medium text-amber-600 dark:text-amber-500">+ {formatCurrency(vatAmount)}</span>
                                </div>
                            )}
                            <Separator className="my-3 bg-emerald-200 dark:bg-emerald-800/50" />
                            <div className="flex justify-between items-center text-xl">
                                <span className="font-bold text-emerald-950 dark:text-emerald-100">Total</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(totalValue)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-border">
                        <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:w-auto h-12"
                            onClick={() => router.push('/sales')}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            className="w-full sm:w-auto h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                            onClick={handleEmit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                            {saveToHistory ? 'Emitir e Guardar' : 'Emitir Documento'}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
