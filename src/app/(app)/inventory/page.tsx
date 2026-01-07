
"use client";

import { useState, useMemo, useEffect } from "react";
import { products as initialProducts } from "@/lib/data";
import type { Product, Location } from "@/lib/types";
import { columns } from "@/components/inventory/columns";
import { InventoryDataTable } from "@/components/inventory/data-table";
import { Button } from "@/components/ui/button";
import { FileText, ListFilter } from "lucide-react";
import { AddProductDialog } from "@/components/inventory/add-product-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const multiLocationEnabled = localStorage.getItem('majorstockx-multi-location-enabled') === 'true';
      setIsMultiLocation(multiLocationEnabled);
      
      const storedLocations = localStorage.getItem('majorstockx-locations');
      if (storedLocations) {
        setLocations(JSON.parse(storedLocations));
      }
    }
  }, []);

  const handleAddProduct = (newProduct: Omit<Product, 'id' | 'lastUpdated'>) => {
    const product: Product = {
      ...newProduct,
      id: `PROD${(products.length + 1).toString().padStart(3, '0')}`,
      lastUpdated: new Date().toISOString().split('T')[0],
      location: newProduct.location || (locations.length > 0 ? locations[0].id : 'Principal'),
    };
    setProducts([product, ...products]);
  };
  
  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(products.map(p => p.id === updatedProduct.id ? { ...updatedProduct, lastUpdated: new Date().toISOString().split('T')[0] } : p));
    toast({
        title: "Produto Atualizado",
        description: `O produto "${updatedProduct.name}" foi atualizado com sucesso.`,
    });
  };

  const confirmDeleteProduct = () => {
    if (productToDelete) {
      setProducts(products.filter(p => p.id !== productToDelete.id));
      toast({
        title: "Produto Apagado",
        description: `O produto "${productToDelete.name}" foi removido do inventário.`,
      });
      setProductToDelete(null);
    }
  };

  const handlePrintCountForm = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
      printWindow.document.write('<!DOCTYPE html><html><head><title>Formulário de Contagem de Estoque</title>');
      printWindow.document.write(`
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
      `);
      printWindow.document.write(`
        <style>
          @media screen {
            body {
              background-color: #f0f2f5;
            }
          }
          body { 
            font-family: 'PT Sans', sans-serif; 
            line-height: 1.6; 
            color: #333;
            margin: 0;
            padding: 2rem;
          }
          .container {
            width: 100%;
            margin: 0 auto;
            background-color: #fff;
            padding: 2rem;
            box-shadow: 0 0 20px rgba(0,0,0,0.05);
            border-radius: 8px;
            box-sizing: border-box;
          }
          .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #eee;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
          }
          .header h1 { 
            font-family: 'Space Grotesk', sans-serif;
            font-size: 2rem;
            color: #3498db; /* primary color */
            margin: 0;
          }
          .logo {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .logo span {
             font-family: 'Space Grotesk', sans-serif;
             font-size: 1.5rem;
             font-weight: bold;
             color: #3498db;
          }
          p { margin-bottom: 1rem; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 1.5rem; 
            font-size: 11px;
          }
          thead {
            display: table-header-group; /* Important for repeating headers */
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
          }
          th { 
            background-color: #f9fafb;
            font-family: 'Space Grotesk', sans-serif;
            font-weight: 700;
            color: #374151;
          }
          .count-col { width: 80px; }
          .color-col { width: 90px; }
          .obs-col { width: 200px; }
          .signature-line {
            border-top: 1px solid #999;
            width: 250px;
            margin-top: 3rem;
          }
          .footer {
            text-align: center;
            margin-top: 3rem;
            font-size: 0.8rem;
            color: #999;
          }
          @page {
            size: A4 landscape;
            margin: 0.5in;
          }
          @media print {
            .no-print { display: none; }
            body { -webkit-print-color-adjust: exact; padding: 0; margin: 0; }
            .container { box-shadow: none; border-radius: 0; border: none; }
          }
        </style>
      `);
      printWindow.document.write('</head><body><div class="container">');
      
      printWindow.document.write(`
        <div class="header">
          <h1>Contagem de Estoque</h1>
          <div class="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: #3498db;">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></line>
            </svg>
            <span>MajorStockX</span>
          </div>
        </div>
      `);

      printWindow.document.write(`<p><b>Data da Contagem:</b> ${new Date().toLocaleDateString('pt-BR')}</p>`);
      printWindow.document.write(`<p><b>Responsável:</b> _________________________</p>`);

      printWindow.document.write('<table>');
      printWindow.document.write('<thead><tr><th>Produto</th><th>Categoria</th><th class="color-col">Cor</th><th class="count-col">Qtd. Contada</th><th class="count-col">Danificados</th><th class="obs-col">Observações</th></tr></thead>');
      printWindow.document.write('<tbody>');
      filteredProducts.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)).forEach(product => {
        printWindow.document.write(`<tr><td>${product.name}</td><td>${product.category}</td><td></td><td></td><td></td><td></td></tr>`);
      });
      printWindow.document.write('</tbody></table>');

      printWindow.document.write('<div class="signature-line"><p>Assinatura do Responsável</p></div>');
      printWindow.document.write('<div class="footer"><p>MajorStockX &copy; ' + new Date().getFullYear() + '</p></div>');
      
      printWindow.document.write('</div></body></html>');
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const filteredProducts = useMemo(() => {
    if (selectedLocation === 'all') return products;
    return products.filter(p => p.location === selectedLocation);
  }, [products, selectedLocation]);


  return (
    <>
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá apagar permanentemente o produto
              "{productToDelete?.name}" do seu inventário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProduct}>Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
              <div>
                  <h1 className="text-3xl font-headline font-bold">Inventário</h1>
                  <p className="text-muted-foreground">
                      Gerencie os produtos do seu estoque.
                  </p>
              </div>
              <div className="flex gap-2">
                  {isMultiLocation && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="shadow-lg">
                          <ListFilter className="mr-2 h-4 w-4" />
                          {locations.find(l => l.id === selectedLocation)?.name || "Todas as Localizações"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filtrar por Localização</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={selectedLocation === 'all'}
                          onCheckedChange={() => setSelectedLocation('all')}
                        >
                          Todas as Localizações
                        </DropdownMenuCheckboxItem>
                        {locations.map(location => (
                          <DropdownMenuCheckboxItem
                            key={location.id}
                            checked={selectedLocation === location.id}
                            onCheckedChange={() => setSelectedLocation(location.id)}
                          >
                            {location.name}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <Button variant="outline" onClick={handlePrintCountForm} className="shadow-lg">
                      <FileText className="mr-2 h-4 w-4" />
                      Form. Contagem
                  </Button>
                  <AddProductDialog 
                    onAddProduct={handleAddProduct}
                    isMultiLocation={isMultiLocation}
                    locations={locations}
                  />
              </div>
          </div>
        <InventoryDataTable 
          columns={columns({ 
            onAttemptDelete: (product) => setProductToDelete(product),
            onProductUpdate: handleUpdateProduct,
            isMultiLocation: isMultiLocation,
            locations: locations,
          })} 
          data={filteredProducts} 
        />
      </div>
    </>
  );
}
