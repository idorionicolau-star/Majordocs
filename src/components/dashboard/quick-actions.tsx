
"use client";

import { useContext, useState } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { Button } from "@/components/ui/button";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";
import { AddProductionDialog } from "@/components/production/add-production-dialog";
import { AddProductDialog } from "@/components/inventory/add-product-dialog";
import type { Sale, Product, Production } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Package } from "lucide-react";
import { Card } from "@/components/ui/card";

export const QuickActions = () => {
    const context = useContext(InventoryContext);
    const [isSaleDialogOpen, setSaleDialogOpen] = useState(false);
    const [isProductionDialogOpen, setProductionDialogOpen] = useState(false);
    const [isProductDialogOpen, setProductDialogOpen] = useState(false);
    const { toast } = useToast();

    if (!context) return null;

    const { addSale, addProduction, addProduct, canEdit } = context;

    const handleAddSale = (saleData: Omit<Sale, 'id' | 'guideNumber'>) => {
        addSale(saleData);
        setSaleDialogOpen(false);
    };

    const handleAddProduction = async (prodData: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => {
        try {
            await addProduction(prodData);
            toast({ title: "Produção Registada" });
            setProductionDialogOpen(false);
        } catch (e: any) {
            toast({ variant: 'destructive', title: "Erro na Produção", description: e.message });
        }
    };

    const handleAddProduct = (prodData: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => {
        addProduct(prodData);
        toast({ title: "Produto Adicionado" });
        setProductDialogOpen(false);
    };

    const canSell = canEdit('sales');
    const canProduce = canEdit('production');
    const canAddToInventory = canEdit('inventory');

    const hasAnyAction = canSell || canProduce || canAddToInventory;

    if (!hasAnyAction) return null;

    return (
        <>
            <Card className="border-none bg-transparent p-0 shadow-none">
                <div className="flex flex-col sm:flex-row gap-2">
                    {canSell && <Button onClick={() => setSaleDialogOpen(true)} variant="secondary" className="flex-1 group hover:shadow-lg hover:shadow-cyan-500/20"><ShoppingCart className="mr-2 h-4 w-4 text-cyan-600" />Registrar Venda</Button>}
                    {canProduce && <Button onClick={() => setProductionDialogOpen(true)} variant="secondary" className="flex-1 group hover:shadow-lg hover:shadow-purple-500/20"><Package className="mr-2 h-4 w-4 text-purple-600" />Entrada de Estoque</Button>}
                    {canAddToInventory && <Button onClick={() => setProductDialogOpen(true)} variant="secondary" className="flex-1 group hover:shadow-lg hover:shadow-emerald-500/20"><Plus className="mr-2 h-4 w-4 text-emerald-600" />Novo Produto</Button>}
                </div>
            </Card>

            {canSell && <AddSaleDialog open={isSaleDialogOpen} onOpenChange={setSaleDialogOpen} onAddSale={handleAddSale} />}
            {canProduce && <AddProductionDialog open={isProductionDialogOpen} onOpenChange={setProductionDialogOpen} onAddProduction={handleAddProduction} />}
            {canAddToInventory && <AddProductDialog open={isProductDialogOpen} onOpenChange={setProductDialogOpen} onAddProduct={handleAddProduct} />}
        </>
    )
}
