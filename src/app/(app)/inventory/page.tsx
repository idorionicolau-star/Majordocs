"use client";

import { useState } from "react";
import { products as initialProducts } from "@/lib/data";
import type { Product } from "@/lib/types";
import { columns } from "@/components/inventory/columns";
import { InventoryDataTable } from "@/components/inventory/data-table";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { AddProductDialog } from "@/components/inventory/add-product-dialog";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const handleAddProduct = (newProduct: Omit<Product, 'id' | 'lastUpdated'>) => {
    const product: Product = {
      ...newProduct,
      id: `PROD${(products.length + 1).toString().padStart(3, '0')}`,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
    setProducts([product, ...products]);
  };

  return (
    <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-headline font-bold">Inventário</h1>
                <p className="text-muted-foreground">
                    Gerencie os produtos do seu estoque.
                </p>
            </div>
            <div className="flex gap-2">
                <Button variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Form. Contagem
                </Button>
                <AddProductDialog onAddProduct={handleAddProduct} />
            </div>
        </div>
      <InventoryDataTable columns={columns} data={products} />
    </div>
  );
}
