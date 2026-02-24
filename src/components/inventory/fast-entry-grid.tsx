"use client";

import React, { useState, useCallback, useRef } from 'react';
import { DataGrid, renderTextEditor as textEditor, Column, RenderEditCellProps } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Save } from "lucide-react";
import { useInventory } from "@/context/inventory-context";
import { useTheme } from "next-themes";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useFuse } from "@/hooks/use-fuse";
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
    const isMobile = useMediaQuery("(max-width: 640px)");

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
        const [inputValue, setInputValue] = useState(row.name);
        const [highlightedIndex, setHighlightedIndex] = useState(-1);
        const suggestionsRef = useRef<HTMLDivElement>(null);

        const fuzzyResults = useFuse(productNames, inputValue, {
            threshold: 0.3,
        });

        // Limit suggestions for performance and UI constraints
        const suggestions = fuzzyResults.slice(0, 10);

        const commitSelection = (val: string) => {
            const existingProduct = products.find(p => p.name.toLowerCase() === val.toLowerCase());

            if (existingProduct) {
                onRowChange({
                    ...row,
                    name: existingProduct.name,
                    category: existingProduct.category || 'Geral',
                    unit: existingProduct.unit || 'un',
                    price: existingProduct.price.toString(),
                    stock: existingProduct.stock.toString(),
                    minStock: existingProduct.lowStockThreshold?.toString() || '0'
                }, true);
            } else {
                onRowChange({ ...row, name: val }, true);
            }
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'ArrowDown') {
                e.stopPropagation(); // prevent grid navigation
                setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
            } else if (e.key === 'ArrowUp') {
                e.stopPropagation();
                setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
            } else if (e.key === 'Enter') {
                e.stopPropagation();
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    commitSelection(suggestions[highlightedIndex]);
                } else {
                    commitSelection(inputValue);
                }
                onClose(true);
            } else if (e.key === 'Escape') {
                e.stopPropagation();
                onClose();
            } else if (e.key === 'Tab') {
                if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
                    commitSelection(suggestions[highlightedIndex]);
                } else {
                    commitSelection(inputValue);
                }
            }
        };

        // Scroll highlighted item into view
        React.useEffect(() => {
            if (highlightedIndex >= 0 && suggestionsRef.current) {
                const element = suggestionsRef.current.children[highlightedIndex] as HTMLElement;
                if (element) {
                    element.scrollIntoView({ block: 'nearest' });
                }
            }
        }, [highlightedIndex]);

        return (
            <div className="relative w-full h-full flex items-center bg-background">
                <input
                    autoFocus
                    className="w-full h-full border-0 outline-none bg-transparent text-foreground px-2"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setHighlightedIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                        // Delay closing to allow click events on suggestions to fire
                        setTimeout(() => {
                            commitSelection(inputValue);
                            onClose(true);
                        }, 150);
                    }}
                />
                {suggestions.length > 0 && inputValue.length > 0 && (
                    <div
                        ref={suggestionsRef}
                        className="absolute top-full left-0 w-full max-h-48 overflow-auto bg-popover border shadow-lg z-[100] rounded-b-md"
                    >
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={suggestion}
                                className={`px-2 py-1.5 text-sm cursor-pointer ${index === highlightedIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
                                    }`}
                                onMouseDown={(e) => {
                                    // prevent input blur
                                    e.preventDefault();
                                }}
                                onClick={() => {
                                    commitSelection(suggestion);
                                    onClose(true);
                                }}
                            >
                                {suggestion}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const columns: Column<RowData>[] = [
        { key: 'name', name: 'Nome do Produto', renderEditCell: NameEditor, minWidth: isMobile ? 180 : 250 },
        { key: 'category', name: 'Categoria', renderEditCell: CategoryEditor, width: isMobile ? 120 : 160 },
        { key: 'unit', name: 'Unid.', renderEditCell: UnitEditor, width: isMobile ? 80 : 100 },
        { key: 'cost', name: 'Custo (MTn)', renderEditCell: textEditor, width: isMobile ? 100 : 120 },
        { key: 'price', name: 'Venda (MTn)', renderEditCell: textEditor, width: isMobile ? 100 : 120 },
        { key: 'stock', name: 'Físico', renderEditCell: textEditor, width: isMobile ? 80 : 100 },
        { key: 'minStock', name: 'Mínimo', renderEditCell: textEditor, width: isMobile ? 80 : 100 },
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
                <p className="text-sm text-muted-foreground">Adicione produtos. {isMobile ? "Deslize para ver campos." : "Duplo clique para editar, TAB para navegar."}</p>
            </div>

            <div className="border rounded-md shadow-sm overflow-hidden bg-background">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    .grid-with-lines .rdg-cell {
                        border-right: 1px solid var(--border);
                        border-bottom: 1px solid var(--border);
                    }
                    .grid-with-lines .rdg-header-row .rdg-cell {
                        border-bottom: 2px solid var(--border);
                        background-color: var(--muted);
                    }
                `}} />
                <DataGrid
                    columns={columns}
                    rows={rows}
                    onRowsChange={setRows}
                    className={`${gridThemeClass} grid-with-lines`}
                    style={{ height: 'max(500px, 60vh)', width: '100%' }}
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
