
"use client";

import { useContext, useState } from "react";
import { InventoryContext } from "@/context/inventory-context";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";
import { AddProductionDialog } from "@/components/production/add-production-dialog";
import { AddProductDialog } from "@/components/inventory/add-product-dialog";
import type { Sale, Product, Production } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Plus, Package, ArrowUpRight, ArrowDownLeft, FileText, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
        toast({
            title: "Venda Registrada",
            description: "A venda foi processada com sucesso.",
            action: <CheckCircle2 className="text-emerald-500" />
        });
    };

    const handleAddProduction = async (prodData: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => {
        try {
            await addProduction(prodData);
            toast({
                title: "Stock Atualizado",
                description: "Entrada de produção confirmada.",
                className: "border-emerald-500/50 text-emerald-500"
            });
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

    const actions = [
        {
            title: "Registrar Venda",
            icon: FileText,
            onClick: () => setSaleDialogOpen(true),
            show: canSell,
            color: "cyan",
            gradient: "from-cyan-500/20 to-blue-600/20",
            border: "border-cyan-500/50",
            shadow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]",
            iconColor: "text-cyan-400"
        },
        {
            title: "Entrada de Estoque",
            icon: ArrowDownLeft,
            onClick: () => setProductionDialogOpen(true),
            show: canProduce,
            color: "blue",
            gradient: "from-blue-600/20 to-indigo-600/20",
            border: "border-blue-500/50",
            shadow: "shadow-[0_0_20px_rgba(59,130,246,0.15)]",
            iconColor: "text-blue-400"
        },
        {
            title: "Novo Produto",
            icon: Plus,
            onClick: () => setProductDialogOpen(true),
            show: canAddToInventory,
            color: "purple",
            gradient: "from-purple-500/20 to-pink-600/20",
            border: "border-purple-500/50",
            shadow: "shadow-[0_0_20px_rgba(168,85,247,0.15)]",
            iconColor: "text-purple-400"
        }
    ];

    return (
        <>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
                {actions.filter(a => a.show).map((action, index) => (
                    <button
                        key={index}
                        onClick={action.onClick}
                        className={cn(
                            "group relative flex items-center p-4 md:px-5 h-20 md:h-24 rounded-3xl transition-all duration-300",
                            "bg-slate-900/50 backdrop-blur-md border",
                            "border-slate-800",
                            action.border.replace("border-", "hover:border-").replace("/50", "/60"),
                            action.shadow,
                            "hover:scale-[1.02] hover:-translate-y-1"
                        )}
                        style={{ borderColor: '' }}
                    >
                        <div className={cn(
                            "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-transparent to-white/5",
                            // action.gradient // Removed full gradient overlay for a cleaner dark look
                        )} />

                        {/* Glow effect specific to color */}
                        <div className={cn(
                            "absolute -inset-0.5 rounded-3xl opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-500",
                            action.color === "cyan" && "bg-cyan-500",
                            action.color === "blue" && "bg-blue-500",
                            action.color === "purple" && "bg-purple-500",
                        )} />


                        <div className={cn(
                            "h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center mr-4 transition-transform duration-300 group-hover:scale-110 shadow-lg",
                            "bg-slate-950 border border-slate-800",
                            action.iconColor.replace("text-", "text-").replace("-400", "-500")
                        )}>
                            <action.icon className={cn("h-5 w-5 md:h-6 md:w-6", action.iconColor)} strokeWidth={2} />
                        </div>

                        <div className="flex flex-col items-start z-10">
                            <span className="text-sm md:text-base font-bold text-slate-100 tracking-wide group-hover:text-white transition-all">
                                {action.title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                                Ação Rápida
                            </span>
                        </div>
                    </button>
                ))}
            </div>

            <AddSaleDialog open={isSaleDialogOpen} onOpenChange={setSaleDialogOpen} onAddSale={handleAddSale} />
            <AddProductionDialog open={isProductionDialogOpen} onOpenChange={setProductionDialogOpen} onAddProduction={handleAddProduction} />
            <AddProductDialog open={isProductDialogOpen} onOpenChange={setProductDialogOpen} onAddProduct={handleAddProduct} />
        </>
    );
}
