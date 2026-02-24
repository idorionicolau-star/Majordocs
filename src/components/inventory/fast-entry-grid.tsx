"use client";

import React, { useState, useCallback, useRef } from 'react';
import { DataGrid, renderTextEditor as textEditor, Column, RenderEditCellProps } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Save } from "lucide-react";
import { useInventory } from "@/context/inventory-context";
import { useTheme } from "next-themes";
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
    const { addProduct, companyData, products } = useInventory();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const { theme, systemTheme } = useTheme();

    const currentTheme = theme === 'system' ? systemTheme : theme;
    const gridThemeClass = currentTheme === 'dark' ? 'rdg-dark' : 'rdg-light';

    const categories = React.useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        if (companyData?.validCategories) {
            companyData.validCategories.forEach(c => cats.add(c));
        }
        return Array.from(cats).sort();
    }, [products, companyData]);

    const units = companyData?.validUnits || ['un', 'kg', 'g', 'l', 'ml', 'm', 'cm', 'cx'];

    const CategoryEditor = ({ row, onRowChange, onClose }: RenderEditCellProps<RowData>) => (
        <select
            className="w-full h-full border-2 border-primary outline-none bg-background text-foreground px-2"
            autoFocus
            value={row.category}
            onChange={(e) => onRowChange({ ...row, category: e.target.value }, true)}
            onBlur={() => onClose(true)}
        >
            <option value="">Selecione...</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
    );

    const UnitEditor = ({ row, onRowChange, onClose }: RenderEditCellProps<RowData>) => (
        <select
            className="w-full h-full border-2 border-primary outline-none bg-background text-foreground px-2"
            autoFocus
            value={row.unit}
            onChange={(e) => onRowChange({ ...row, unit: e.target.value }, true)}
            onBlur={() => onClose(true)}
        >
            {units.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
    );

    const productNames = React.useMemo(() => {
        return Array.from(new Set(products.map(p => p.name).filter(Boolean))).sort();
    }, [products]);

    const NameEditor = ({ row, onRowChange, onClose }: RenderEditCellProps<RowData>) => {
        // We use a local state to handle the input value before committing it to the grid row
        // to make typing smoother and to allow the datalist to work correctly.
        return (
            <input
                autoFocus
                className="w-full h-full border-2 border-primary outline-none bg-background text-foreground px-2"
                value={row.name}
                list="product-names-list"
                onChange={(e) => onRowChange({ ...row, name: e.target.value })}
                onBlur={() => onClose(true)}
            />
        );
    };

    const columns: Column<RowData>[] = [
        { key: 'name', name: 'Nome do Produto', renderEditCell: NameEditor, minWidth: 250 },
        { key: 'category', name: 'Categoria', renderEditCell: CategoryEditor, width: 160 },
        { key: 'unit', name: 'Unidade', renderEditCell: UnitEditor, width: 100 },
        { key: 'cost', name: 'Pr. Custo (MTn)', renderEditCell: textEditor, width: 120 },
        { key: 'price', name: 'Pr. Venda (MTn)', renderEditCell: textEditor, width: 120 },
        { key: 'stock', name: 'Físico', renderEditCell: textEditor, width: 100 },
        { key: 'minStock', name: 'Mínimo', renderEditCell: textEditor, width: 100 },
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
            <datalist id="product-names-list">
                {productNames.map(name => <option key={name} value={name} />)}
            </datalist>

            <div className="flex flex-col">
                <h2 className="text-xl font-bold font-headline">Entrada Rápida / Edição em Massa</h2>
                <p className="text-sm text-muted-foreground">Adicione produtos múltiplos rapidamente como se fosse num Excel. Duplo clique para editar, TAB para navegar.</p>
            </div>

            <div className="border rounded-md shadow-sm overflow-hidden bg-background">
                <DataGrid
                    columns={columns}
                    rows={rows}
                    onRowsChange={setRows}
                    className={gridThemeClass}
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
