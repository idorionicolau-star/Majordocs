
"use client";

import { useState, useEffect } from "react";
import { productions as initialProductions, products } from "@/lib/data";
import { columns } from "@/components/production/columns";
import { ProductionDataTable } from "@/components/production/data-table";
import { AddProductionDialog } from "@/components/production/add-production-dialog";
import type { Production, Location } from "@/lib/types";
import { currentUser } from "@/lib/data";

export default function ProductionPage() {
  const [productions, setProductions] = useState<Production[]>(initialProductions);
  const [locations, setLocations] = useState<Location[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocations = localStorage.getItem('majorstockx-locations');
      if (storedLocations) {
        setLocations(JSON.parse(storedLocations));
      }
    }
  }, []);

  const handleAddProduction = (newProductionData: { productId: string; quantity: number; location?: string; }) => {
    const product = products.find(p => p.id === newProductionData.productId);
    if (!product) return;

    const newProduction: Production = {
      id: `PRODREC${(productions.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      productName: product.name,
      quantity: newProductionData.quantity,
      registeredBy: currentUser.name,
      location: newProductionData.location,
    };
    setProductions([newProduction, ...productions]);
  };

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-headline font-bold">Produção</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                    Visualize e registre a produção de novos itens.
                </p>
            </div>
            <AddProductionDialog products={products} onAddProduction={handleAddProduction} />
        </div>
      <ProductionDataTable columns={columns({ locations })} data={productions} />
    </div>
  );
}
