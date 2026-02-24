"use client";

import React, { useState, useCallback, useRef } from 'react';
import { DataGrid, renderTextEditor as textEditor, Column, RenderEditCellProps } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Save } from "lucide-react";
import { useInventory } from "@/context/inventory-context";
import type { Product } from "@/lib/types";

interface RowData {
    name: string;
    category: string;
    unit: string;
    price: string;
    cost: string;
    stock: string;
    minStock: string;
}

const initialRows: RowData[] = Array.from({ length: 5 }, () => ({
    name: '',
    category: '',
    unit: 'un',
    price: '',
    cost: '',
    stock: '0',
    minStock: '0',
}));


export function FastEntryGrid({ onSuccess }: { onSuccess?: () => void }) {
    const [rows, setRows] = useState<RowData[]>(initialRows);
    const { addProduct } = useInventory();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    // Focus navigation utility could be added here if needed, 
    // but react-data-grid handles Tab for cell navigation out of the box.

    const columns: Column<RowData>[] = [
        { key: 'name', name: 'Nome do Produto', renderEditCell: textEditor, width: '40%' },
        { key: 'category', name: 'Categoria', renderEditCell: textEditor },
        { key: 'unit', name: 'Unidade', renderEditCell: textEditor, width: 80 },
        { key: 'cost', name: 'Pr. Custo (€)', renderEditCell: textEditor, width: 100 },
        { key: 'price', name: 'Pr. Venda (€)', renderEditCell: textEditor, width: 100 },
        { key: 'stock', name: 'Físico', renderEditCell: textEditor, width: 80 },
        { key: 'minStock', name: 'Mínimo', renderEditCell: textEditor, width: 80 },
    ];

    const handleAddRow = () => {
        setRows([...rows, { name: '', category: '', unit: 'un', price: '', cost: '', stock: '0', minStock: '0' }]);
    };

    const handleSave = async () => {
        const validRows = rows.filter(row => row.name.trim() !== '');
        if (validRows.length === 0) {
            toast({ title: "Aviso", description: "Nenhum produto válido para guardar.", variant: "destructive" });
            return;
        }

        setIsSaving(true);
        let successCount = 0;

        for (const row of validRows) {
            try {
                const productData: Omit<Product, 'id' | 'companyId' | 'instanceId'> = {
                    name: row.name,
                    category: row.category || 'Geral',
                    price: parseFloat(row.price) || 0,
                    stock: parseFloat(row.stock) || 0,
                    reservedStock: 0,
                    unit: row.unit || 'un',
                    lastUpdated: new Date().toISOString(),
                    lowStockThreshold: parseFloat(row.minStock) || 0,
                    criticalStockThreshold: Math.floor((parseFloat(row.minStock) || 0) / 2),
                };
                await addProduct(productData);
                successCount++;
            } catch (error) {
                console.error("Erro ao adicionar produto:", error, row);
            }
        }

        setIsSaving(false);
        toast({
            title: "Sucesso",
            description: `${successCount} produto(s) adicionados!`,
        });

        if (onSuccess) onSuccess();

        // Reset keeping 5 rows
        setRows(Array.from({ length: 5 }, () => ({
            name: '', category: '', unit: 'un', price: '', cost: '', stock: '0', minStock: '0',
        })));
    };

    return (
        <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col">
                <h2 className="text-xl font-bold font-headline">Entrada Rápida / Edição em Massa</h2>
                <p className="text-sm text-muted-foreground">Adicione produtos múltiplos rapidamente como se fosse num Excel. Use TAB para navegar.</p>
            </div>

            <div className="border rounded-md shadow-sm overflow-hidden bg-background">
                <DataGrid
                    columns={columns}
                    rows={rows}
                    onRowsChange={setRows}
                    className="rdg-light"
                    style={{ height: 'max(400px, 50vh)', width: '100%' }}
                />
            </div>

            <div className="flex justify-between items-center bg-muted/30 p-2 rounded-md border border-dashed">
                <Button onClick={handleAddRow} variant="outline" size="sm">
                    <PlusCircle className="mr-2 h-4 w-4" /> Mais uma Linha (Enter)
                </Button>

                <Button onClick={handleSave} disabled={isSaving || rows.filter(r => r.name.trim() !== '').length === 0}>
                    {isSaving ? (
                        <>
                            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            A Gravar...
                        </>
                    ) : (
                        <>
                            <Save className="mr-2 h-4 w-4" /> Guardar {rows.filter(r => r.name.trim() !== '').length} Produtos
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
