
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

  const handlePrintCountForm = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Formulário de Contagem de Estoque</title>');
      printWindow.document.write(`
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; line-height: 1.6; padding: 20px; }
          h1 { text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #f2f2f2; }
          .count-col { width: 150px; }
          @media print {
            .no-print { display: none; }
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      `);
      printWindow.document.write('</head><body>');
      printWindow.document.write('<h1>Formulário de Contagem de Estoque</h1>');
      printWindow.document.write(`<p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>`);
      printWindow.document.write('<table>');
      printWindow.document.write('<thead><tr><th>Produto</th><th class="count-col">Quantidade Contada</th></tr></thead>');
      printWindow.document.write('<tbody>');
      products.forEach(product => {
        printWindow.document.write(`<tr><td>${product.name}</td><td></td></tr>`);
      });
      printWindow.document.write('</tbody></table>');
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
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
                <Button variant="outline" onClick={handlePrintCountForm}>
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
