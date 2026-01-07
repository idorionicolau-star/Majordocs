
"use client";

import { useState, useEffect } from "react";
import { sales as initialSales, products, currentUser } from "@/lib/data";
import type { Sale, Location } from "@/lib/types";
import { columns } from "@/components/sales/columns";
import { SalesDataTable } from "@/components/sales/data-table";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocations = localStorage.getItem('majorstockx-locations');
      if (storedLocations) {
        setLocations(JSON.parse(storedLocations));
      }
    }
  }, []);

  const handleAddSale = (newSaleData: { productId: string; quantity: number; unitPrice: number; location?: string; }) => {
    const product = products.find(p => p.id === newSaleData.productId);
    if (!product) return;

    const now = new Date();
    const newSale: Sale = {
      id: `SALE${(sales.length + 1).toString().padStart(3, '0')}`,
      date: now.toISOString(),
      productName: product.name,
      quantity: newSaleData.quantity,
      totalValue: newSaleData.quantity * newSaleData.unitPrice,
      soldBy: currentUser.name,
      guideNumber: `GT${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${(sales.length + 1).toString().padStart(3, '0')}`,
      location: newSaleData.location,
    };
    setSales([newSale, ...sales]);
  };

  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-headline font-bold">Vendas</h1>
                <p className="text-muted-foreground">
                    Visualize e registre as vendas de produtos.
                </p>
            </div>
            <AddSaleDialog products={products} onAddSale={handleAddSale} />
        </div>
      <SalesDataTable columns={columns({ locations })} data={sales} />
    </div>
  );
}
