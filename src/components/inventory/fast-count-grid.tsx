"use client";

import React, { useState, useMemo, useContext } from "react";
import { DataGrid, Column, RenderEditCellProps } from "react-data-grid";
import 'react-data-grid/lib/styles.css';
import { InventoryContext } from "@/context/inventory-context";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { Search, Save, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { writeBatch, doc } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

// Helper for text inputs
function numberEditor({ row, column, onRowChange, onClose }: RenderEditCellProps<any>) {
    return (
        <input
            type="number"
            className="w-full h-full border-2 border-primary outline-none bg-background text-foreground px-2 text-right font-medium"
            autoFocus
            value={row[column.key as keyof typeof row] as string}
            onChange={(event) => onRowChange({ ...row, [column.key]: event.target.value })}
            onBlur={() => onClose(true)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    onClose(true);
                }
            }}
        />
    );
}

interface FastCountRow {
    id: string | undefined;
    instanceId: string;
    name: string;
    category: string;
    location: string;
    price: number;
    originalStock: number;
    stock: string; // The editable field, kept as string while editing
    hasChanged: boolean;
}

export function FastCountGrid() {
    const inventoryContext = useContext(InventoryContext);
    const { products, companyId } = inventoryContext || {};
    const { toast } = useToast();
    const { theme, systemTheme } = useTheme();
    const firestore = useFirestore();

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedLocation, setSelectedLocation] = useState<string>("all");
    const [editedRows, setEditedRows] = useState<Record<string, FastCountRow>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Get unique locations from products
    const locations = useMemo(() => {
        if (!products) return [];
        const locs = new Set(products.map(p => p.location).filter(Boolean));
        return Array.from(locs).sort();
    }, [products]);

    // Initialize rows from context
    const rows = useMemo(() => {
        const activeProducts = products || [];

        const filtered = activeProducts.filter(p => {
            if (p.deletedAt) return false;
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesLocation = selectedLocation === "all" || p.location === selectedLocation;
            return matchesSearch && matchesLocation;
        });

        return filtered.map(p => {
            if (editedRows[p.instanceId!]) {
                return editedRows[p.instanceId!];
            }
            return {
                id: p.id,
                instanceId: p.instanceId!,
                name: p.name,
                category: p.category || 'Geral',
                location: p.location || 'N/A',
                price: p.price || 0,
                originalStock: p.stock || 0,
                stock: (p.stock || 0).toString(),
                hasChanged: false,
            };
        });
    }, [products, searchTerm, selectedLocation, editedRows]);

    const currentTheme = theme === 'system' ? systemTheme : theme;
    const gridThemeClass = currentTheme === 'dark' ? 'rdg-dark' : 'rdg-light';

    const columns: Column<FastCountRow>[] = [
        { key: 'name', name: 'Artigo', minWidth: 250 },
        { key: 'category', name: 'Categoria', width: 140 },
        { key: 'location', name: 'Localização', width: 140 },
        {
            key: 'price',
            name: 'Preço Venda',
            width: 120,
            renderCell: ({ row }) => <div className="text-muted-foreground">{formatCurrency(row.price)}</div>
        },
        {
            key: 'originalStock',
            name: 'Stock Sistema',
            width: 120,
            renderCell: ({ row }) => (
                <div className="text-right pr-4 font-medium text-muted-foreground">
                    {row.originalStock}
                </div>
            )
        },
        {
            key: 'stock',
            name: 'Novo Stock Contado',
            renderEditCell: numberEditor,
            width: 180,
            renderCell: ({ row }) => {
                const isChanged = row.hasChanged;
                const difference = parseFloat(row.stock) - row.originalStock;

                return (
                    <div className={`h-full flex items-center justify-between px-3 ${isChanged ? "bg-primary/10 text-primary font-bold" : ""}`}>
                        <span>{row.stock}</span>
                        {isChanged && difference !== 0 && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${difference > 0 ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/20 text-red-700 dark:text-red-400"}`}>
                                {difference > 0 ? '+' : ''}{difference}
                            </span>
                        )}
                    </div>
                );
            }
        }
    ];

    const handleRowsChange = (newRows: FastCountRow[], { indexes }: { indexes: number[] }) => {
        const updatedMap = { ...editedRows };
        for (const idx of indexes) {
            const row = newRows[idx];
            const newStockNum = parseFloat(row.stock);

            // Only flag as changed if it's a valid number and different from original
            row.hasChanged = !isNaN(newStockNum) && newStockNum !== row.originalStock;

            // If they cleared it entirely or made it identical, remove from edited map to reset
            if (row.stock === "" || newStockNum === row.originalStock) {
                delete updatedMap[row.instanceId];
            } else {
                updatedMap[row.instanceId] = row;
            }
        }
        setEditedRows(updatedMap);
    };

    const changedCount = Object.keys(editedRows).length;

    const handleSave = async () => {
        if (!firestore || !companyId || changedCount === 0) return;

        setIsSaving(true);
        try {
            let batch = writeBatch(firestore);
            const docsToUpdate = Object.values(editedRows).filter(r => r.hasChanged);

            let operationsCount = 0;

            for (const row of docsToUpdate) {
                const docRef = doc(firestore, `companies/${companyId}/products`, row.instanceId);
                const newStock = parseFloat(row.stock) || 0;

                batch.update(docRef, { stock: newStock });
                operationsCount++;

                // Firebase batches have a 500 operation limit
                if (operationsCount >= 490) {
                    await batch.commit();
                    batch = writeBatch(firestore);
                    operationsCount = 0;
                }
            }

            if (operationsCount > 0) {
                await batch.commit();
            }

            toast({ title: "Contagem Concluída", description: `${docsToUpdate.length} artigos atualizados com sucesso.` });
            setEditedRows({}); // Clear edits
        } catch (error) {
            console.error("Error saving bulk stock counts", error);
            toast({ variant: "destructive", title: "Erro", description: "Ocorreu um erro ao atualizar o stock." });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/30 p-4 rounded-lg border">
                <div className="flex flex-1 gap-3 w-full sm:w-auto">
                    <div className="w-[200px]">
                        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                            <SelectTrigger className="bg-background">
                                <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Localização" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Localizações</SelectItem>
                                {locations.map(loc => (
                                    <SelectItem key={loc || 'unknown'} value={loc as string}>{loc}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Pesquisar artigo..."
                            className="pl-8 bg-background"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {changedCount > 0 && (
                        <div className="text-sm font-medium text-primary">
                            {changedCount} alteração{changedCount > 1 ? 'ões' : ''} pendente{changedCount > 1 ? 's' : ''}
                        </div>
                    )}

                    <Button onClick={handleSave} disabled={isSaving || changedCount === 0} className="w-full sm:w-auto">
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? "A Atualizar..." : `Salvar Contagem`}
                    </Button>
                </div>
            </div>

            <div className={`border rounded-lg overflow-hidden flex flex-col ${gridThemeClass}`} style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
                <DataGrid
                    columns={columns}
                    rows={rows}
                    onRowsChange={handleRowsChange}
                    className="fill-grid w-full flex-grow text-sm"
                    rowHeight={45}
                />
            </div>
            <p className="text-xs text-muted-foreground">Nota: Clique duas vezes (ou Enter) na célula "Novo Stock Contado" para digitar a quantidade física contada. O sistema calculará a diferença automaticamente.</p>
        </div>
    );
}
