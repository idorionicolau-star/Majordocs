
"use client";

import { useState } from "react";
import { sales as initialSales, products, currentUser } from "@/lib/data";
import type { Sale } from "@/lib/types";
import { columns } from "@/components/sales/columns";
import { SalesDataTable } from "@/components/sales/data-table";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>(initialSales);

  const handleAddSale = (newSaleData: { productId: string; quantity: number; }) => {
    const product = products.find(p => p.id === newSaleData.productId);
    if (!product) return;

    const newSale: Sale = {
      id: `SALE${(sales.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      productName: product.name,
      quantity: newSaleData.quantity,
      soldBy: currentUser.name,
      guideNumber: `GT${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${(sales.length + 1).toString().padStart(3, '0')}`,
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
      <SalesDataTable columns={columns} data={sales} />
    </div>
  );
}
