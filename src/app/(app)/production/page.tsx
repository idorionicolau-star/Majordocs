"use client";

import { useState } from "react";
import { productions as initialProductions, products } from "@/lib/data";
import { columns } from "@/components/production/columns";
import { ProductionDataTable } from "@/components/production/data-table";
import { AddProductionDialog } from "@/components/production/add-production-dialog";
import type { Production } from "@/lib/types";
import { currentUser } from "@/lib/data";

export default function ProductionPage() {
  const [productions, setProductions] = useState<Production[]>(initialProductions);

  const handleAddProduction = (newProductionData: { productId: string; quantity: number; }) => {
    const product = products.find(p => p.id === newProductionData.productId);
    if (!product) return;

    const newProduction: Production = {
      id: `PRODREC${(productions.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      productName: product.name,
      quantity: newProductionData.quantity,
      registeredBy: currentUser.name,
    };
    setProductions([newProduction, ...productions]);
  };

  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-headline font-bold">Produção</h1>
                <p className="text-muted-foreground">
                    Visualize e registre a produção de novos itens.
                </p>
            </div>
            <AddProductionDialog products={products} onAddProduction={handleAddProduction} />
        </div>
      <ProductionDataTable columns={columns} data={productions} />
    </div>
  );
}
