
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-8">
                {actions.filter(a => a.show).map((action, index) => (
                    <button
                        key={index}
                        onClick={action.onClick}
                        className={cn(
                            "group relative flex items-center p-3 md:p-6 h-16 md:h-32 rounded-2xl md:rounded-3xl transition-all duration-300",
                            "bg-white dark:bg-slate-800 border",
                            "border-slate-100 dark:border-slate-700/50",
                            action.border.replace("border-", "border-").replace("/50", "/30"),
                            action.shadow,
                            "hover:scale-[1.02] hover:-translate-y-1"
                        )}
                        style={{ borderColor: '' }} // Override if needed
                    >
                        <div className={cn(
                            "absolute inset-0 rounded-2xl md:rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br",
                            action.gradient
                        )} />

                        <div className={cn(
                            "h-9 w-9 md:h-14 md:w-14 rounded-xl md:rounded-2xl flex items-center justify-center mr-3 md:mr-5 transition-transform duration-300 group-hover:scale-110",
                            "bg-white/80 dark:bg-slate-950/50 border border-slate-200 dark:border-white/10",
                            action.shadow
                        )}>
                            <action.icon className={cn("h-5 w-5 md:h-7 md:w-7", action.iconColor)} />
                        </div>

                        <div className="flex flex-col items-start z-10">
                            <span className="text-sm md:text-xl font-bold text-foreground tracking-wide group-hover:text-glow-blue transition-all">
                                {action.title}
                            </span>
                            <span className="text-[10px] md:text-sm text-muted-foreground mt-0.5 md:mt-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0 hidden md:inline">
                                Clique para acessar
                            </span>
                        </div>

                        {/* Shine Effect */}
                        <div className="hidden md:block absolute inset-0 rounded-2xl md:rounded-3xl overflow-hidden pointer-events-none">
                            <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/40 dark:via-white/10 to-transparent skew-x-12 group-hover:left-[200%] transition-all duration-1000 ease-in-out" />
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
