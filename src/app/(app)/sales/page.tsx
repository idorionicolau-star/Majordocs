
"use client";

import { useState, useEffect } from "react";
import { sales as initialSales, products, currentUser } from "@/lib/data";
import type { Sale, Location, Product } from "@/lib/types";
import { columns } from "@/components/sales/columns";
import { SalesDataTable } from "@/components/sales/data-table";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";
import { useToast } from "@/hooks/use-toast";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [allProducts, setAllProducts] = useState<Product[]>(products);
  const [locations, setLocations] = useState<Location[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocations = localStorage.getItem('majorstockx-locations');
      if (storedLocations) {
        setLocations(JSON.parse(storedLocations));
      }
    }
  }, []);

  const handleAddSale = (newSaleData: { productId: string; quantity: number; unitPrice: number; location?: string; }) => {
    const product = allProducts.find(p => p.id === newSaleData.productId);
    if (!product) return;

    const now = new Date();
    const newSale: Sale = {
      id: `SALE${(sales.length + 1).toString().padStart(3, '0')}`,
      date: now.toISOString(),
      productId: product.id,
      productName: product.name,
      quantity: newSaleData.quantity,
      unitPrice: newSaleData.unitPrice,
      totalValue: newSaleData.quantity * newSaleData.unitPrice,
      soldBy: currentUser.name,
      guideNumber: `GT${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${(sales.length + 1).toString().padStart(3, '0')}`,
      location: newSaleData.location,
    };
    setSales([newSale, ...sales]);
  };

  const handleUpdateSale = (updatedSale: Sale) => {
    setSales(sales.map(s => s.id === updatedSale.id ? updatedSale : s));
    toast({
        title: "Venda Atualizada",
        description: `A venda #${updatedSale.guideNumber} foi atualizada com sucesso.`,
    });
  };

  return (
    <div className="flex flex-col gap-8 pb-20 animate-in fade-in duration-500">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-[900] text-slate-900 dark:text-white tracking-tighter">Vendas</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                    Visualize e registre as vendas de produtos.
                </p>
            </div>
            <AddSaleDialog products={allProducts} onAddSale={handleAddSale} />
        </div>
      <SalesDataTable 
        columns={columns({ 
            locations,
            products: allProducts,
            onUpdateSale: handleUpdateSale
        })} 
        data={sales} 
      />
    </div>
  );
}
