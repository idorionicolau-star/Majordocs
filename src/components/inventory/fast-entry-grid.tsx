"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DataGrid, renderTextEditor as textEditor, Column, RenderEditCellProps } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, Save, Camera, Upload, Loader2 } from "lucide-react";
import { useInventory } from "@/context/inventory-context";
import { useAuth } from "@/firebase/provider";
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
    isCategorizing?: boolean;
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
    const { addProduct, addCatalogProduct, catalogProducts, addCatalogCategory, catalogCategories, companyData, products, companyId, categorizeProductWithAI } = useInventory();
    const { toast } = useToast();
    const auth = useAuth();
    const [isSaving, setIsSaving] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { theme, systemTheme } = useTheme();
    const isMobile = useMediaQuery("(max-width: 640px)");

    // Auto-categorize new entries
    useEffect(() => {
        let mounted = true;

        rows.forEach((row, index) => {
            if (row.name && row.name.trim() !== '' && row.category === '' && !row.isCategorizing) {
                const existingProduct = products.find(p => p.name.toLowerCase() === row.name.toLowerCase());

                if (!existingProduct && categorizeProductWithAI) {
                    setRows(currentRows => {
                        const newRows = [...currentRows];
                        newRows[index] = { ...newRows[index], isCategorizing: true, category: 'A carregar IA...' };
                        return newRows;
                    });

                    categorizeProductWithAI(row.name).then(suggestedCategory => {
                        if (!mounted) return;
                        setRows(currentRows => {
                            // Check if the row still exists and is currently categorizing 
                            if (!currentRows[index] || !currentRows[index].isCategorizing) return currentRows;

                            const newRows = [...currentRows];
                            const currentRow = newRows[index];

                            if (currentRow.name === row.name) {
                                // ONLY apply AI suggestion if the user hasn't typed their own category in the meantime
                                if (currentRow.category === 'A carregar IA...' || currentRow.category === '') {
                                    newRows[index] = { ...currentRow, category: suggestedCategory || 'Geral', isCategorizing: false };
                                } else {
                                    // User already typed something, just remove the loading flag
                                    newRows[index] = { ...currentRow, isCategorizing: false };
                                }
                            } else {
                                // Race condition: The name changed mid-flight. 
                                // We MUST clear the loading state so the next effect cycle can pick up the new name.
                                // We also clear the category back to empty ONLY if it was our placeholder, so the next cycle can run.
                                if (currentRow.category === 'A carregar IA...') {
                                    newRows[index] = { ...currentRow, isCategorizing: false, category: '' };
                                } else {
                                    newRows[index] = { ...currentRow, isCategorizing: false };
                                }
                            }
                            return newRows;
                        });
                    });
                }
            }
        });

        return () => { mounted = false; };
    }, [rows, products, categorizeProductWithAI]);

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
        <input
            className="w-full h-full border-2 border-primary outline-none bg-background text-foreground px-2"
            autoFocus
            value={row.category}
            list="categories-list"
            onChange={(e) => onRowChange({ ...row, category: e.target.value })}
            onBlur={() => onClose(true)}
        />
    );

    const UnitEditor = ({ row, onRowChange, onClose }: RenderEditCellProps<RowData>) => (
        <input
            className="w-full h-full border-2 border-primary outline-none bg-background text-foreground px-2"
            autoFocus
            value={row.unit}
            list="units-list"
            onChange={(e) => onRowChange({ ...row, unit: e.target.value })}
            onBlur={() => onClose(true)}
        />
    );

    const productNames = React.useMemo(() => {
        return Array.from(new Set(products.map(p => p.name).filter(Boolean))).sort();
    }, [products]);

    const NameEditor = ({ row, onRowChange, onClose }: RenderEditCellProps<RowData>) => {
        const [inputValue, setInputValue] = useState(row.name);
        const [highlightedIndex, setHighlightedIndex] = useState(-1);
        const suggestionsRef = useRef<HTMLDivElement>(null);
        const inputRef = useRef<HTMLInputElement>(null);
        const [inputRect, setInputRect] = useState<DOMRect | null>(null);

        useEffect(() => {
            const updateRect = () => {
                if (inputRef.current) {
                    setInputRect(inputRef.current.getBoundingClientRect());
                }
            };
            updateRect();
            // True param captures scroll events from the grid container
            window.addEventListener('scroll', updateRect, true);
            window.addEventListener('resize', updateRect);
            return () => {
                window.removeEventListener('scroll', updateRect, true);
                window.removeEventListener('resize', updateRect);
            };
        }, []);

        const fuzzyResults = useFuse(productNames, inputValue, {
            threshold: 0.3,
        });

        // Limit suggestions for performance and UI constraints
        const suggestions = fuzzyResults.slice(0, 8);

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
        useEffect(() => {
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
                    ref={inputRef}
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
                {suggestions.length > 0 && inputValue.length > 0 && typeof document !== 'undefined' && inputRect && createPortal(
                    <div
                        ref={suggestionsRef}
                        className="fixed bg-popover border shadow-lg z-[9999] rounded-b-md"
                        style={{
                            top: inputRect.bottom,
                            left: inputRect.left,
                            width: Math.max(inputRect.width, isMobile ? 200 : 250),
                            maxHeight: '200px',
                            overflow: 'auto',
                        }}
                    >
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={suggestion}
                                className={`px-2 py-3 text-sm cursor-pointer border-b last:border-0 ${index === highlightedIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
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
                    </div>,
                    document.body
                )}
            </div>
        );
    };

    const columns: Column<RowData>[] = [
        { key: 'name', name: 'Nome do Produto', renderEditCell: NameEditor, minWidth: isMobile ? 220 : 250, frozen: true },
        { key: 'category', name: 'Categoria', renderEditCell: CategoryEditor, width: isMobile ? 140 : 160 },
        { key: 'unit', name: 'Unid.', renderEditCell: UnitEditor, width: isMobile ? 90 : 100 },
        {
            key: 'cost',
            name: 'Custo (MTn)',
            renderEditCell: textEditor,
            width: isMobile ? 110 : 120,
            renderCell: ({ row }) => {
                const cost = parseFloat(row.cost);
                const isZero = isNaN(cost) || cost <= 0;
                return (
                    <div className={isZero ? "bg-destructive/20 text-destructive font-bold h-full flex items-center px-2" : "h-full flex items-center px-2"}>
                        {row.cost}
                    </div>
                );
            }
        },
        { key: 'price', name: 'Venda (MTn)', renderEditCell: textEditor, width: isMobile ? 110 : 120 },
        { key: 'stock', name: 'Físico', renderEditCell: textEditor, width: isMobile ? 90 : 100 },
        { key: 'minStock', name: 'Mínimo', renderEditCell: textEditor, width: isMobile ? 90 : 100 },
    ];

    const handleAddRow = () => {
        setRows([...rows, { name: '', category: '', unit: 'un', price: '', cost: '', stock: '0', minStock: '0' }]);
    };

    const handleSave = async () => {
        const validRows = rows.filter(row =>
            row.name.trim() !== '' &&
            row.category.trim() !== '' &&
            row.price.trim() !== '' &&
            row.cost.trim() !== '' &&
            row.stock.trim() !== ''
        );

        if (validRows.length === 0) {
            toast({ title: "Aviso", description: "Nenhum produto válido e completo para guardar. Apenas linhas totalmente preenchidas são adicionadas.", variant: "destructive" });
            return;
        }

        // Check for duplicates within the grid itself
        const seenNames = new Set<string>();
        const exactDuplicates: string[] = [];

        for (const row of validRows) {
            const normName = row.name.toLowerCase().trim();
            if (seenNames.has(normName)) {
                if (!exactDuplicates.includes(row.name)) {
                    exactDuplicates.push(row.name);
                }
            }
            seenNames.add(normName);
        }

        if (exactDuplicates.length > 0) {
            toast({
                title: "Existem duplicados na Grelha",
                description: `Por favor corrija e agrupe as quantidades dos produtos: ${exactDuplicates.join(', ')} antes de guardar.`,
                variant: "destructive"
            });
            return;
        }

        setIsSaving(true);
        let successCount = 0;

        const defaultLocation = (companyData?.locations && companyData.locations.length > 0)
            ? companyData.locations[0].id
            : '';

        for (const row of validRows) {
            try {
                // Ensure category exists in catalog
                const categoryName = row.category.trim() || 'Geral';
                const catExists = catalogCategories?.some(c => c.name.toLowerCase() === categoryName.toLowerCase());
                if (!catExists && addCatalogCategory) {
                    await addCatalogCategory(categoryName);
                }

                // Ensure product exists in catalog
                const prodName = row.name.trim();
                const prodExists = catalogProducts?.some(p => p.name.toLowerCase() === prodName.toLowerCase());
                if (!prodExists && addCatalogProduct) {
                    await addCatalogProduct({
                        name: prodName,
                        category: categoryName,
                        price: parseFloat(row.price) || 0,
                        unit: row.unit || 'un',
                        lowStockThreshold: parseFloat(row.minStock) || 0,
                        criticalStockThreshold: Math.floor((parseFloat(row.minStock) || 0) / 2),
                    });
                }

                const productData: Omit<Product, 'id' | 'companyId' | 'instanceId'> = {
                    name: prodName,
                    category: categoryName,
                    price: parseFloat(row.price) || 0,
                    stock: parseFloat(row.stock) || 0,
                    reservedStock: 0,
                    unit: row.unit || 'un',
                    location: defaultLocation, // required to prevent undefined crashing firebase addDoc
                    cost: parseFloat(row.cost) || 0,
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtracting(true);
        toast({ title: "A processar...", description: "A IA está a ler a imagem. Isto pode demorar alguns segundos." });

        try {
            // Convert to base64
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            const fbToken = await auth.currentUser?.getIdToken();

            const response = await fetch('/api/extract-inventory', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${fbToken}`
                },
                body: JSON.stringify({
                    imageBase64: base64,
                    companyId: companyId
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Erro ao processar imagem.");
            }

            const data = await response.json();
            const extractedItems = data.items || [];

            if (extractedItems.length === 0) {
                toast({ variant: "destructive", title: "Nenhum Produto", description: "A IA não conseguiu identificar nenhum produto com quantidade legível na imagem." });
                return;
            }

            // Map to grid rows
            const newRows: RowData[] = [];

            extractedItems.forEach((item: { productName: string, quantity: number }) => {
                const searchName = item.productName.toLowerCase().trim();
                // Simple exact match first
                const exactMatch = products.find(p => p.name.toLowerCase() === searchName);

                if (exactMatch) {
                    newRows.push({
                        name: exactMatch.name,
                        category: exactMatch.category || 'Geral',
                        unit: exactMatch.unit || 'un',
                        price: exactMatch.price.toString(),
                        cost: (exactMatch.cost || 0).toString(),
                        stock: item.quantity.toString(),
                        minStock: exactMatch.lowStockThreshold?.toString() || '0'
                    });
                } else {
                    // Try to find the closest match manually (simple included word matching)
                    const tokens = searchName.split(" ");
                    let bestMatch: any = null;
                    let bestCount = 0;

                    products.forEach(p => {
                        const pName = p.name.toLowerCase();
                        let matches = 0;
                        tokens.forEach(t => { if (t.length > 2 && pName.includes(t)) matches++; });
                        if (matches > bestCount) {
                            bestCount = matches;
                            bestMatch = p;
                        }
                    });

                    if (bestMatch && bestCount > 0) {
                        newRows.push({
                            name: bestMatch.name,
                            category: bestMatch.category || 'Geral',
                            unit: bestMatch.unit || 'un',
                            price: bestMatch.price.toString(),
                            cost: (bestMatch.cost || 0).toString(),
                            stock: item.quantity.toString(),
                            minStock: bestMatch.lowStockThreshold?.toString() || '0'
                        });
                    } else {
                        // Unmatched generic entry
                        newRows.push({
                            name: item.productName,
                            category: '',
                            unit: 'un',
                            price: '',
                            cost: '',
                            stock: item.quantity.toString(),
                            minStock: '0'
                        });
                    }
                }
            });

            // Ensure at least 5 rows
            while (newRows.length < 5) {
                newRows.push({ name: '', category: '', unit: 'un', price: '', cost: '', stock: '0', minStock: '0' });
            }

            setRows(newRows);
            toast({ title: "Leitura Concluída", description: `Encontrados ${extractedItems.length} produtos. Verifique os dados abaixo antes de guardar.` });

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro na Leitura da IA", description: error.message || "Tente tirar a foto com melhor iluminação." });
        } finally {
            setIsExtracting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <datalist id="categories-list">
                {categories.map(c => <option key={c} value={c} />)}
            </datalist>
            <datalist id="units-list">
                {units.map(u => <option key={u} value={u} />)}
            </datalist>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col">
                    <h2 className="text-xl font-bold font-headline">Entrada Rápida / Edição em Massa</h2>
                    <p className="text-sm text-muted-foreground">Adicione produtos. {isMobile ? "Deslize para ver campos." : "Duplo clique para editar, TAB para navegar."}</p>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageUpload}
                    />
                    <Button
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isExtracting}
                        className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 border-indigo-200 dark:border-indigo-800"
                    >
                        {isExtracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                        {isExtracting ? 'Analisando Foto...' : 'Scan Contagem (IA)'}
                    </Button>
                </div>
            </div>

            <div className="border rounded-md shadow-sm overflow-hidden bg-background">
                <style dangerouslySetInnerHTML={{
                    __html: `
                    /* Styling based on theme using next-themes HTML class */
                    html.light .grid-with-lines .rdg-cell {
                        border-right: 1px solid rgba(0,0,0,0.1);
                        border-bottom: 1px solid rgba(0,0,0,0.1);
                        background-color: var(--background);
                    }
                    html.light .grid-with-lines .rdg-header-row .rdg-cell {
                        border-bottom: 2px solid rgba(0,0,0,0.2);
                        background-color: var(--muted);
                        font-weight: 700;
                        color: var(--foreground);
                    }
                    
                    html.dark .grid-with-lines .rdg-cell {
                        border-right: 1px solid rgba(255,255,255,0.1);
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                        background-color: var(--background);
                    }
                    html.dark .grid-with-lines .rdg-header-row .rdg-cell {
                        border-bottom: 2px solid rgba(255,255,255,0.2);
                        background-color: var(--muted);
                        font-weight: 700;
                        color: var(--foreground);
                    }

                    /* Ensure frozen columns have a solid background */
                    .rdg-cell-frozen {
                        z-index: 1;
                        background-color: var(--background) !important;
                    }
                    .rdg-header-row .rdg-cell-frozen {
                        z-index: 2;
                        background-color: var(--muted) !important;
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
