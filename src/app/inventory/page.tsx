"use client"; [cite: 1]

import { useState, useMemo, useEffect, useContext } from "react";
import { useSearchParams } from 'next/navigation';
import type { Product, Location, ModulePermission } from "@/lib/types"; [cite: 2]
import { columns } from "@/components/inventory/columns";
import { InventoryDataTable } from "@/components/inventory/data-table"; [cite: 3]
import { Button } from "@/components/ui/button";
import { FileText, ListFilter, MapPin, List, LayoutGrid, ChevronDown, Lock, Truck, History, Trash2, PlusCircle, Plus, FileCheck, ChevronsUpDown, Printer, Download } from "lucide-react"; [cite: 4]
import { AddProductDialog } from "@/components/inventory/add-product-dialog"; [cite: 5]
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
import { useToast } from "@/hooks/use-toast"; [cite: 6]
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; [cite: 7]
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input"; [cite: 8]
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/inventory/product-card";
import { TransferStockDialog } from "@/components/inventory/transfer-stock-dialog"; [cite: 9]
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge"; [cite: 10]
import Link from "next/link";
import { DatePicker } from "@/components/ui/date-picker";
import { isSameDay } from "date-fns"; [cite: 11]
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default function InventoryPage() { [cite: 12]
  const inventoryContext = useContext(InventoryContext);
  const searchParams = useSearchParams();
  const [productToDelete, setProductToDelete] = useState<Product | null>(null); [cite: 12, 13]
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | undefined>(); [cite: 13]
  const [selectedLocation, setSelectedLocation] = useState<string>("all"); [cite: 14]
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [gridCols, setGridCols] = useState<'3' | '4' | '5'>('3'); [cite: 14, 15]
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [sortBy, setSortBy] = useState<'stock_desc' | 'stock_asc' | 'name_asc' | 'date_desc'>('stock_desc'); [cite: 15, 16]
  const { toast } = useToast();

  const { 
    products, 
    locations, 
    isMultiLocation, 
    addProduct, 
    updateProduct, 
    deleteProduct, 
    transferStock,
    loading: inventoryLoading,
    canEdit,
    canView,
    user,
    clearProductsCollection,
    companyData,
  } = inventoryContext || { products: [], locations: [], isMultiLocation: false, addProduct: () => {}, updateProduct: () => {}, deleteProduct: () => {}, transferStock: () => {}, loading: true, canEdit: () => false, canView: () => false, user: null, clearProductsCollection: async () => {}, companyData: null }; [cite: 16, 17]

  const canEditInventory = canEdit('inventory'); [cite: 18]
  const canViewInventory = canView('inventory');
  const isAdmin = user?.role === 'Admin'; [cite: 18]

  useEffect(() => { [cite: 19]
    if (searchParams.get('action') === 'add' && canEditInventory) {
      setAddDialogOpen(true);
    }
    const productFilter = searchParams.get('filter');
    if (productFilter) {
      setNameFilter(decodeURIComponent(productFilter));
    }
  }, [searchParams, canEditInventory]);

  useEffect(() => { [cite: 20]
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('majorstockx-inventory-view') as 'list' | 'grid';
      const savedGridCols = localStorage.getItem('majorstockx-inventory-grid-cols') as '3' | '4' | '5';
      if (savedView) setView(savedView);
      if (savedGridCols) setGridCols(savedGridCols);
    }
  }, []);

  const handleSetView = (newView: 'list' | 'grid') => { [cite: 21]
    setView(newView);
    localStorage.setItem('majorstockx-inventory-view', newView);
  }; [cite: 21, 22]

  const handleSetGridCols = (cols: '3' | '4' | '5') => { [cite: 22]
    setGridCols(cols);
    localStorage.setItem('majorstockx-inventory-grid-cols', cols);
  }; [cite: 22, 23]

  const handleAddProduct = (newProductData: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => { [cite: 23]
    addProduct(newProductData);
    toast({ [cite: 24]
        title: "Produto adicionado",
        description: `${newProductData.name} foi adicionado ao inventário com sucesso.`,
    });
  }; [cite: 24, 25]
  
  const handleUpdateProduct = (updatedProduct: Product) => { [cite: 25]
    if (updatedProduct.instanceId) {
        updateProduct(updatedProduct.instanceId, updatedProduct);
        toast({ [cite: 25, 26]
            title: "Produto Atualizado",
            description: `O produto "${updatedProduct.name}" foi atualizado com sucesso.`,
        });
    } [cite: 26, 27]
  };
  
  const handleTransferStock = (
    productName: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number
  ) => {
    transferStock(productName, fromLocationId, toLocationId, quantity);
  }; [cite: 27, 28]

  const confirmDeleteProduct = () => { [cite: 28]
    if (productToDelete && productToDelete.instanceId) {
      deleteProduct(productToDelete.instanceId);
      toast({ [cite: 28, 29]
        title: "Produto Apagado",
        description: `O produto "${productToDelete.name}" foi removido do inventário.`,
      });
      setProductToDelete(null); [cite: 29, 30]
    }
  };

  const handlePrintCountForm = () => { [cite: 30]
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) { [cite: 30, 31]
      printWindow.document.write('<!DOCTYPE html><html><head><title>Formulário de Contagem de Estoque</title>');
      printWindow.document.write(` [cite: 31, 32]
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
      `);
      printWindow.document.write(` [cite: 32, 33]
        <style>
          @media screen {
            body {
              background-color: #f0f2f5;
            }
          }
          body { 
            font-family: 'PT Sans', sans-serif; 
            line-height: 1.6; [cite: 33, 34] 
            color: #333;
            margin: 0;
            padding: 2rem;
          }
          .container {
            width: 100%;
            margin: 0 auto;
            background-color: #fff; [cite: 34, 35]
            padding: 2rem;
            box-shadow: 0 0 20px rgba(0,0,0,0.05);
            border-radius: 8px;
            box-sizing: border-box;
          }
          .header {
            display: flex; [cite: 35, 36]
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #eee;
            padding-bottom: 1rem;
            margin-bottom: 2rem;
          }
          .header h1 { 
            font-family: 'Space Grotesk', sans-serif; [cite: 36, 37]
            font-size: 2rem;
            color: #3498db;
            margin: 0; [cite: 37, 38]
          } [cite: 39]
          .logo {
            display: flex; [cite: 39]
            align-items: center; [cite: 39, 40]
            gap: 0.5rem;
          }
          .logo span {
             font-family: 'Space Grotesk', sans-serif; [cite: 40]
             font-size: 1.5rem; [cite: 40, 41]
             font-weight: bold;
             color: #3498db;
          }
          p { margin-bottom: 1rem; [cite: 41, 42] }
          table { 
            width: 100%; [cite: 42]
            border-collapse: collapse; [cite: 42, 43] 
            margin-top: 1.5rem; 
            font-size: 11px;
          }
          thead {
            display: table-header-group; [cite: 43, 44]
          }
          th, td { 
            border: 1px solid #ddd; [cite: 44]
            padding: 8px; [cite: 44, 45] 
            text-align: left; 
          }
          th { 
            background-color: #f9fafb; [cite: 45]
            font-family: 'Space Grotesk', sans-serif; [cite: 45, 46]
            font-weight: 700;
            color: #374151;
          }
          .count-col { width: 80px; [cite: 46, 47] }
          .obs-col { width: 150px; [cite: 47, 48] }
          .signature-line {
            border-top: 1px solid #999; [cite: 48]
            width: 250px; [cite: 48, 49]
            margin-top: 3rem;
          }
          .footer {
            text-align: center; [cite: 49]
            margin-top: 3rem; [cite: 49, 50]
            font-size: 0.8rem;
            color: #999;
          }
          @page {
            size: A4 landscape; [cite: 50]
            margin: 0.5in; [cite: 50, 51]
          }
          @media print {
            .no-print { display: none; [cite: 51, 52] }
            body { -webkit-print-color-adjust: exact; padding: 0; margin: 0; [cite: 52, 53] }
            .container { box-shadow: none; border-radius: 0; border: none; [cite: 53, 54] }
          }
        </style>
      `); [cite: 54]
      printWindow.document.write('</head><body><div class="container">');
      
      printWindow.document.write(`
        <div class="header">
          <h1>Contagem de Estoque</h1>
          <div class="logo">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: #3498db;">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 [cite: 55] 2 0l7-4A2 2 0 0 0 21 16z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></line>
            </svg>
            <span>MajorStockX</span>
          </div>
        </div>
      `); [cite: 56, 57]

      printWindow.document.write(`<p><b>Data da Contagem:</b> ${new Date().toLocaleDateString('pt-BR')}</p>`);
      printWindow.document.write(`<p><b>Responsável:</b> _________________________</p>`);

      printWindow.document.write('<table>');
      printWindow.document.write(` [cite: 57, 58]
        <thead>
            <tr>
                <th>Produto</th>
                <th>Categoria</th>
                ${isMultiLocation ? '<th>Localização</th>' : ''}
                <th class="count-col">Stock Sistema</th>
                <th class="count-col">Qtd. Contada</th> [cite: 58, 59]
                <th class="count-col">Diferença</th>
                <th class="obs-col">Observações</th>
            </tr>
        </thead>
      `); [cite: 59]
      printWindow.document.write('<tbody>'); [cite: 60]
      filteredProducts.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)).forEach(product => {
         const locationName = isMultiLocation ? (locations.find(l => l.id === product.location)?.name || product.location) : '';
        printWindow.document.write(`
            <tr>
                <td>${product.name}</td>
                <td>${product.category}</td>
                ${isMultiLocation ? `<td>${locationName}</td>` : ''} [cite: 60, 61]
                <td>${product.stock - product.reservedStock}</td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        `);
      });
      printWindow.document.write('</tbody></table>'); [cite: 61, 62]

      printWindow.document.write('<div class="signature-line"><p>Assinatura do Responsável</p></div>');
      printWindow.document.write('<div class="footer"><p>MajorStockX &copy; ' + new Date().getFullYear() + '</p></div>');
      
      printWindow.document.write('</div></body></html>');
      printWindow.document.close();
      setTimeout(() => { [cite: 62, 63]
        printWindow.focus();
        printWindow.print();
      }, 500);
    } [cite: 63, 64]
  };

  const categories = useMemo(() => { [cite: 64]
    const categorySet = new Set(products.map(p => p.category));
    return Array.from(categorySet);
  }, [products]);

  const filteredProducts = useMemo(() => { [cite: 64, 65]
    let result = [...products];

    if (selectedLocation !== 'all') {
      result = result.filter(p => p.location === selectedLocation);
    }

    if (nameFilter) {
      result = result.filter(p => p.name.toLowerCase().includes(nameFilter.toLowerCase()));
    }

    if (categoryFilter.length > 0) {
      result = result.filter(p => categoryFilter.includes(p.category));
    }

    if (dateFilter) {
      result = result.filter(p => isSameDay(new Date(p.lastUpdated), dateFilter));
    } [cite: 65, 66]
    
    // Sorting logic
    switch (sortBy) {
      case 'stock_desc':
        result.sort((a, b) => (b.stock - b.reservedStock) - (a.stock - a.reservedStock));
        break;
      case 'stock_asc':
        result.sort((a, b) => (a.stock - a.reservedStock) - (b.stock - b.reservedStock));
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break; [cite: 66, 67]
      case 'date_desc':
        result.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break; [cite: 67, 68]
      default:
         result.sort((a, b) => (b.stock - b.reservedStock) - (a.stock - a.reservedStock));
         break; [cite: 68, 69]
    }
    
    return result;
  }, [products, selectedLocation, nameFilter, categoryFilter, dateFilter, sortBy]);

  const handleClearInventory = async () => { [cite: 69, 70]
    if (clearProductsCollection) {
      await clearProductsCollection();
    } [cite: 70, 71]
    setShowClearConfirm(false);
  };
  
    const reportTitle = useMemo(() => { [cite: 71]
        if (selectedLocation === 'all' || !isMultiLocation) {
            return "Relatório de Inventário Geral";
        }
        const locationName = locations.find(l => l.id === selectedLocation)?.name;
        return `Relatório de Inventário: ${locationName || 'Desconhecida'}`;
    }, [selectedLocation, isMultiLocation, locations]);

    const handlePrintReport = () => { [cite: 71, 72]
        const printWindow = window.open('', '', 'height=800,width=800');
        if (printWindow) { [cite: 72, 73]
            printWindow.document.write('<!DOCTYPE html><html><head><title>' + reportTitle + '</title>');
            printWindow.document.write(` [cite: 73, 74]
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
            `);
            printWindow.document.write(` [cite: 74, 75]
                <style>
                    body { font-family: 'PT Sans', sans-serif; line-height: 1.6; color: #333; margin: 2rem; }
                    .container { max-width: 1000px; margin: auto; padding: 2rem; border: 1px solid #eee; border-radius: 8px; }
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; } [cite: 75, 76]
                    .header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; color: #3498db; margin: 0; }
                    .logo { display: flex; flex-direction: column; align-items: flex-start; }
                    .logo span { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: bold; color: #3498db; } [cite: 76, 77]
                    table { width: 100%; border-collapse: collapse; margin-top: 2rem; font-size: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; [cite: 77, 78] }
                    th { background-color: #f9fafb; [cite: 78, 79] font-family: 'Space Grotesk', sans-serif; }
                    .footer { text-align: center; [cite: 79] margin-top: 3rem; font-size: 0.8rem; color: #999; } [cite: 79, 80]
                    @page { size: A4 landscape; [cite: 80] margin: 0.5in; } [cite: 80, 81]
                    @media print {
                      body { margin: 0; [cite: 81] -webkit-print-color-adjust: exact; } [cite: 81, 82]
                      .no-print { display: none; [cite: 82, 83] }
                      .container { border: none; [cite: 83, 84] box-shadow: none; }
                    }
                </style>
            `); [cite: 84]
            printWindow.document.write('</head><body><div class="container">'); [cite: 85]
            printWindow.document.write(`
                <div class="header">
                     <div class="logo">
                        <span>${companyData?.name || 'MajorStockX'}</span>
                    </div>
                    <h1>${reportTitle}</h1> [cite: 85, 86]
                </div>
                <h2>Data: ${new Date().toLocaleDateString('pt-BR')}</h2>
            `);
            printWindow.document.write('<table><thead><tr><th>Produto</th><th>Categoria</th><th>Stock Disp.</th><th>Preço Unit.</th><th>Valor Stock</th></tr></thead><tbody>'); [cite: 86, 87]
            
            let totalValue = 0;
            filteredProducts.forEach(product => {
                const availableStock = product.stock - product.reservedStock;
                const stockValue = availableStock * product.price;
                totalValue += stockValue;
                printWindow.document.write(`
                    <tr> [cite: 87, 88]
                        <td>${product.name}</td>
                        <td>${product.category}</td>
                        <td>${availableStock} ${product.unit || 'un.'}</td>
                        <td>${formatCurrency(product.price)}</td> [cite: 88, 89]
                        <td>${formatCurrency(stockValue)}</td>
                    </tr>
                `);
            });
            printWindow.document.write(` [cite: 89, 90]
                <tr>
                    <td colspan="4" style="text-align: right; font-weight: bold;">Valor Total do Inventário:</td>
                    <td style="font-weight: bold;">${formatCurrency(totalValue)}</td>
                </tr>
            `);
            printWindow.document.write('</tbody></table>'); [cite: 90, 91]
            
            printWindow.document.write(`<div class="footer"><p>${companyData?.name || 'MajorStockX'} &copy; ${new Date().getFullYear()}</p></div>`);
            printWindow.document.write('</div></body></html>');
            printWindow.document.close();
            setTimeout(() => { [cite: 91, 92]
              printWindow.focus();
              printWindow.print();
            }, 500);
        } [cite: 92, 93]
    };

    const handleDownloadPdfReport = () => { [cite: 93]
        toast({
          title: "Como Guardar o Relatório em PDF",
          description: "Na janela de impressão que vai abrir, por favor mude o destino para 'Guardar como PDF' para descarregar o ficheiro.",
          duration: 8000,
        });
        handlePrintReport(); [cite: 93, 94]
    };

    if (inventoryLoading) { [cite: 94]
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div> [cite: 94, 95]
    );
  }

  return (
    <>
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá apagar permanentemente o produto "{productToDelete?.name}" do seu inventário. [cite: 95, 96]
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> [cite: 96]
  
       <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e irá apagar permanentemente **todos** os produtos do seu inventário. [cite: 97, 98]
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearInventory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> [cite: 98, 99]

      <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div className="flex items-center gap-2">
              <Button onClick={handleDownloadPdfReport} variant="outline" className="h-12">
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </Button> [cite: 99, 100]
              <Button onClick={handlePrintReport} variant="outline" className="h-12">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir Relatório
              </Button>
            </div>
          </div> [cite: 100]
  
         <div className="py-4 space-y-4"> [cite: 101]
             <div className="flex flex-col sm:flex-row items-center gap-2">
                <Input
                  placeholder="Filtrar por nome..."
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)} [cite: 101, 102]
                  className="w-full sm:max-w-xs shadow-sm h-12 text-sm"
                />
                 <div className="flex w-full sm:w-auto items-center gap-2">
                    <DatePicker date={dateFilter} setDate={setDateFilter} /> [cite: 102]
                    <DropdownMenu> [cite: 103]
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between sm:w-auto h-12">
                          <ChevronsUpDown className="mr-2 h-4 w-4" />
                          <span>Ordenar por</span> [cite: 103, 104]
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuRadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as 'stock_desc' | 'stock_asc' | 'name_asc' | 'date_desc')}> [cite: 104, 105, 106]
                          <DropdownMenuRadioItem value="stock_desc">Maior Stock</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="stock_asc">Menor Stock</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="name_asc">Ordem Alfabética (A-Z)</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="date_desc">Atualizados Recentemente</DropdownMenuRadioItem> [cite: 106, 107]
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
             </div> [cite: 107, 108]
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-4">
                <div className="hidden md:flex items-center gap-2">
                   <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild> [cite: 108, 109]
                            <Button variant={view === 'list' ? 'default' : 'outline'} size="icon" onClick={() => handleSetView('list')} className="h-12 w-12 hidden md:flex"> [cite: 109, 110]
                                <List className="h-5 w-5"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Vista de Lista</p></TooltipContent> [cite: 110, 111]
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => handleSetView('grid')} className="h-12 w-12 hidden md:flex"> [cite: 111, 112, 113]
                                <LayoutGrid className="h-5 w-5"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Vista de Grelha</p></TooltipContent> [cite: 113, 114]
                    </Tooltip>
                    {view === 'grid' && (
                        <div className="hidden md:flex">
                            <DropdownMenu> [cite: 114, 115]
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                      <DropdownMenuTrigger asChild> [cite: 115, 116]
                                            <Button variant="outline" className="h-12 w-28 gap-2">
                                                <span>{gridCols} Colunas</span> [cite: 116, 117]
                                                <ChevronDown className="h-4 w-4" />
                                            </Button> [cite: 117, 118]
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger>
                                   <TooltipContent><p>Número de colunas</p></TooltipContent> [cite: 118, 119]
                                </Tooltip>
                                <DropdownMenuContent> [cite: 119, 120]
                                    <DropdownMenuRadioGroup value={gridCols} onValueChange={(value) => handleSetGridCols(value as '3' | '4' | '5')}> [cite: 120, 121, 122]
                                        <DropdownMenuRadioItem value="3">3 Colunas</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="4">4 Colunas</DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="5">5 Colunas</DropdownMenuRadioItem> [cite: 122]
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu> [cite: 123]
                        </div>
                    )}
                </TooltipProvider>
                </div> [cite: 123, 124]

                <ScrollArea className="w-full md:w-auto pb-2"> [cite: 124]
                  <div className="flex items-center gap-2">
                     <TooltipProvider>
                        {isMultiLocation && canEditInventory && ( [cite: 124, 125]
                          <TransferStockDialog
                            onTransfer={handleTransferStock}
                          /> [cite: 125, 126]
                        )}
                        {isMultiLocation && canViewInventory && (
                            <DropdownMenu>
                                <Tooltip> [cite: 126, 127]
                                    <TooltipTrigger asChild>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="shadow-sm h-12 w-12 rounded-2xl flex-shrink-0"> [cite: 127, 128]
                                                <MapPin className="h-5 w-5" />
                                            </Button> [cite: 128, 129]
                                        </DropdownMenuTrigger>
                                    </TooltipTrigger> [cite: 129, 130]
                                    <TooltipContent>
                                        <p>Filtrar por Localização</p>
                                    </TooltipContent> [cite: 130, 131]
                                </Tooltip>
                                <DropdownMenuContent align="end">
                                     <ScrollArea className="h-[200px]"> [cite: 131, 132]
                                    <DropdownMenuLabel>Filtrar por Localização</DropdownMenuLabel>
                                    <DropdownMenuSeparator /> [cite: 132, 133]
                                    <DropdownMenuCheckboxItem
                                        checked={selectedLocation === 'all'}
                                        onCheckedChange={() => setSelectedLocation('all')} [cite: 133, 134]
                                    >
                                        Todas as Localizações [cite: 134, 135]
                                    </DropdownMenuCheckboxItem>
                                    {locations.map(location => (
                                     <DropdownMenuCheckboxItem [cite: 135, 136]
                                        key={location.id}
                                        checked={selectedLocation === location.id}
                                        onCheckedChange={() => setSelectedLocation(location.id)} [cite: 136, 137]
                                    >
                                        {location.name} [cite: 137, 138]
                                    </DropdownMenuCheckboxItem>
                                    ))}
                                     </ScrollArea> [cite: 138, 139]
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )} [cite: 139, 140]
                        <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild> [cite: 140, 141]
                                    <Button variant="outline" size="icon" className="shadow-sm relative h-12 w-12 rounded-2xl flex-shrink-0">
                                        <ListFilter className="h-5 w-5" /> [cite: 141, 142]
                                        {categoryFilter.length > 0 && (
                                            <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs px-1"> [cite: 142, 143]
                                                {categoryFilter.length > 9 ? '9+' : categoryFilter.length} [cite: 143, 144]
                                            </span>
                                        )}
                                    </Button> [cite: 144, 145]
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent> [cite: 145, 146]
                                <p>Filtrar por Categoria</p>
                              </TooltipContent>
                      </Tooltip> [cite: 146, 147]
                          <DropdownMenuContent align="end">
                            <ScrollArea className="h-48">
                              {categories.map((category) => {
                                return ( [cite: 147, 148]
                                  <DropdownMenuCheckboxItem
                                  key={category}
                                  className="capitalize" [cite: 148, 149]
                                  checked={categoryFilter.includes(category)}
                                  onCheckedChange={(value) => {
                                    if (value) { [cite: 149, 150]
                                        setCategoryFilter([...categoryFilter, category]);
                                    } else { [cite: 150, 151]
                                        setCategoryFilter(categoryFilter.filter(c => c !== category));
                                    } [cite: 151, 152]
                                  }}
                                  >
                                  {category} [cite: 152, 153]
                                  </DropdownMenuCheckboxItem>
                              )
                              })}
                            </ScrollArea> [cite: 153, 154]
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <Tooltip>
                          <TooltipTrigger asChild> [cite: 154, 155]
                              <Button variant="outline" size="icon" asChild className="shadow-sm h-12 w-12 rounded-2xl flex-shrink-0">
                                  <Link href="/inventory/history"><History className="h-5 w-5" /></Link>
                              </Button> [cite: 155, 156]
                          </TooltipTrigger>
                          <TooltipContent>
                             <p>Ver Histórico de Movimentos</p> [cite: 156, 157]
                          </TooltipContent>
                      </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild> [cite: 157, 158]
                                <Button variant="outline" size="icon" onClick={handlePrintCountForm} className="shadow-sm h-12 w-12 rounded-2xl flex-shrink-0">
                                    <FileText className="h-5 w-5" />
                                </Button> [cite: 158, 159]
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Imprimir Formulário de Contagem</p> [cite: 159, 160]
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
             </div> [cite: 160, 161]
                   <ScrollBar orientation="horizontal" className="md:hidden" />
                </ScrollArea>
            </div>
        </div>

        {view === 'list' ? ( [cite: 161, 162]
            <InventoryDataTable 
              columns={columns({ 
                onAttemptDelete: (product) => setProductToDelete(product),
                onProductUpdate: handleUpdateProduct,
                canEdit: canEditInventory,
                isMultiLocation: isMultiLocation,
                locations: locations [cite: 162, 163]
              })} 
              data={filteredProducts} 
            />
        ) : (
          filteredProducts.length > 0 ? (
            <div className={cn(
                "grid gap-2 sm:gap-4", [cite: 163, 164]
                gridCols === '3' && "grid-cols-2 sm:grid-cols-3",
                gridCols === '4' && "grid-cols-2 sm:grid-cols-4",
                gridCols === '5' && "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5"
            )}>
                {filteredProducts.map(product => ( [cite: 164, 165]
                    <ProductCard 
                        key={product.instanceId}
                        product={product}
                        onProductUpdate={handleUpdateProduct}
                        onAttemptDelete={setProductToDelete} [cite: 165, 166]
                        viewMode={gridCols === '5' || gridCols === '4' ? 'condensed' : 'normal'} [cite: 166, 167]
                        canEdit={canEditInventory}
                        locations={locations}
                        isMultiLocation={isMultiLocation}
                    />
                ))} [cite: 167, 168]
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum produto no inventário.</p>
              {canEditInventory && <p className="text-sm">Comece por adicionar um novo produto.</p>}
            </div> [cite: 168, 169]
          )
        )}

        {isAdmin && (
          <Card className="mt-8">
            <div className="p-6 flex flex-col items-center text-center">
              <h3 className="font-semibold mb-2">Zona de Administrador</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Esta ação é irreversível e irá apagar permanentemente **todos** os produtos do seu inventário. [cite: 169, 170]
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowClearConfirm(true)}
              > [cite: 170, 171]
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Todo o Inventário
              </Button>
            </div>
          </Card>
        )}
      </div>
      {canEditInventory && (
        <> [cite: 171, 172]
            <AddProductDialog 
                open={isAddDialogOpen}
                onOpenChange={setAddDialogOpen}
                onAddProduct={handleAddProduct}
            />
            <Button
                onClick={() => setAddDialogOpen(true)} [cite: 172, 173]
                className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-lg z-20"
                size="icon"
            >
                <Plus className="h-6 w-6" />
                <span className="sr-only">Adicionar Produto</span>
            </Button> [cite: 173, 174]
        </>
      )}
    </>
  );
}