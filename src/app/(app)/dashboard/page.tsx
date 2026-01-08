
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

   const handleAddProduct = (newProduct: Omit<Product, 'id' | 'lastUpdated'>) => {
    const product: Product = {
      ...newProduct,
      id: `PROD${(allProducts.length + 1).toString().padStart(3, '0')}`,
      lastUpdated: new Date().toISOString().split('T')[0],
      location: newProduct.location || (locations.length > 0 ? locations[0].id : 'Principal'),
    };
    setAllProducts([product, ...allProducts]);
  };
  
  const handleAddSale = (newSaleData: { productId: string; quantity: number; unitPrice: number; location?: string; }) => {
    const product = allProducts.find(p => p.id === newSaleData.productId);
    if (!product) return;

    const now = new Date();
    const newSale: Sale = {
      id: `SALE${(allSales.length + 1).toString().padStart(3, '0')}`,
      date: now.toISOString(),
      productId: product.id,
      productName: product.name,
      quantity: newSaleData.quantity,
      unitPrice: newSaleData.unitPrice,
      totalValue: newSaleData.quantity * newSaleData.unitPrice,
      soldBy: currentUser.name,
      guideNumber: `GT${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${(allSales.length + 1).toString().padStart(3, '0')}`,
      location: newSaleData.location,
    };
    setAllSales([newSale, ...allSales]);
  };
  
  const handleAddProduction = (newProductionData: { productId: string; quantity: number; location?: string; }) => {
    const product = allProducts.find(p => p.id === newProductionData.productId);
    if (!product) return;

    const newProduction: Production = {
      id: `PRODREC${(allProductions.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      productName: product.name,
      quantity: newProductionData.quantity,
      registeredBy: currentUser.name,
      location: newProductionData.location,
    };
    setAllProductions([newProduction, ...allProductions]);
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
