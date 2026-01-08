
"use client";

import { StatsCards } from "@/components/dashboard/stats-cards";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { AddProductDialog } from "@/components/inventory/add-product-dialog";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";
import { AddProductionDialog } from "@/components/production/add-production-dialog";
import { products, sales, productions } from "@/lib/data";
import { useState } from "react";
import type { Product, Sale, Production, Location } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { currentUser } from "@/lib/data";
import { useRouter } from "next/navigation";

// Dynamically import the StockChart component with SSR turned off
const StockChart = dynamic(() => import("@/components/dashboard/stock-chart").then(mod => mod.StockChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[438px] w-full" />,
});

export default function DashboardPage() {
  const [allProducts, setAllProducts] = useState<Product[]>(products);
  const [allSales, setAllSales] = useState<Sale[]>(sales);
  const [allProductions, setAllProductions] = useState<Production[]>(productions);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

   const handleAddProduct = (newProduct: Product) => {
    setAllProducts([newProduct, ...allProducts]);
    router.push('/inventory');
  };
  
  const handleAddSale = (newSale: Sale) => {
    setAllSales([newSale, ...allSales]);
    router.push('/sales');
  };
  
  const handleAddProduction = (newProduction: Production) => {
    setAllProductions([newProduction, ...allProductions]);
    router.push('/production');
  };


  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
           <h1 className="text-2xl md:text-3xl font-headline font-[900] text-slate-900 dark:text-white tracking-tighter">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
            <AddProductDialog 
                onAddProduct={handleAddProduct}
                isMultiLocation={isMultiLocation}
                locations={locations}
                triggerType="button"
            />
             <AddSaleDialog 
                products={allProducts} 
                onAddSale={handleAddSale}
                triggerType="button"
            />
            <AddProductionDialog 
                products={allProducts} 
                onAddProduction={handleAddProduction}
                triggerType="button"
            />
        </div>
      </div>
      <StatsCards />
      <div className="grid grid-cols-1 gap-6">
        <StockChart />
      </div>
    </div>
  );
}

