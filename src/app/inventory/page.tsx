
"use client";

import { useState, useMemo, useEffect, useContext } from "react";
import { useSearchParams } from 'next/navigation';
import type { Product, Location, ModulePermission } from "@/lib/types";
import { columns } from "@/components/inventory/columns";
import { InventoryDataTable } from "@/components/inventory/data-table";
import { Button } from "@/components/ui/button";
import { FileText, ListFilter, MapPin, List, LayoutGrid, ChevronDown, Lock, Truck, History, Trash2, PlusCircle, Plus, FileCheck, ChevronsUpDown, Printer, Download, ChevronLeft, ChevronRight, ScanBarcode, Mail } from "lucide-react";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/inventory/product-card";
import { TransferStockDialog } from "@/components/inventory/transfer-stock-dialog";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { DatePicker } from "@/components/ui/date-picker";
import { isSameDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";


export default function InventoryPage() {
  const inventoryContext = useContext(InventoryContext);
  const searchParams = useSearchParams();
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [nameFilter, setNameFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [gridCols, setGridCols] = useState<'3' | '4' | '5'>('3');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;
  const [sortBy, setSortBy] = useState<'stock_desc' | 'stock_asc' | 'name_asc' | 'date_desc'>('stock_desc');
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
  } = inventoryContext || { products: [], locations: [], isMultiLocation: false, addProduct: () => { }, updateProduct: () => { }, deleteProduct: () => { }, transferStock: () => { }, loading: true, canEdit: () => false, canView: () => false, user: null, clearProductsCollection: async () => { }, companyData: null };

  const canEditInventory = canEdit('inventory');
  const canViewInventory = canView('inventory');
  const isAdmin = user?.role === 'Admin';


  useEffect(() => {
    if (searchParams.get('action') === 'add' && canEditInventory) {
      setAddDialogOpen(true);
    }
    const productFilter = searchParams.get('filter');
    if (productFilter) {
      setNameFilter(decodeURIComponent(productFilter));
    }
  }, [searchParams, canEditInventory]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('majorstockx-inventory-view') as 'list' | 'grid';
      const savedGridCols = localStorage.getItem('majorstockx-inventory-grid-cols') as '3' | '4' | '5';
      if (savedView) setView(savedView);
      if (savedGridCols) setGridCols(savedGridCols);
    }
  }, []);

  const handleSetView = (newView: 'list' | 'grid') => {
    setView(newView);
    localStorage.setItem('majorstockx-inventory-view', newView);
  }

  const handleSetGridCols = (cols: '3' | '4' | '5') => {
    setGridCols(cols);
    localStorage.setItem('majorstockx-inventory-grid-cols', cols);
  }

  const handleAddProduct = (newProductData: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => {
    addProduct(newProductData);
    toast({
      title: "Produto adicionado",
      description: `${newProductData.name} foi adicionado ao inventário com sucesso.`,
    });
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    if (updatedProduct.instanceId) {
      updateProduct(updatedProduct.instanceId, updatedProduct);
      toast({
        title: "Produto Atualizado",
        description: `O produto "${updatedProduct.name}" foi atualizado com sucesso.`,
      });
    }
  };

  const handleTransferStock = (
    productName: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number
  ) => {
    transferStock(productName, fromLocationId, toLocationId, quantity);
  };


  const confirmDeleteProduct = () => {
    if (productToDelete && productToDelete.instanceId) {
      deleteProduct(productToDelete.instanceId);
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
          .obs-col { width: 150px; }
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
      printWindow.document.write(`
        <thead>
            <tr>
                <th>Produto</th>
                <th>Categoria</th>
                ${isMultiLocation ? '<th>Localização</th>' : ''}
                <th class="count-col">Stock Sistema</th>
                <th class="count-col">Qtd. Contada</th>
                <th class="count-col">Diferença</th>
                <th class="obs-col">Observações</th>
            </tr>
        </thead>
      `);
      printWindow.document.write('<tbody>');
      filteredProducts.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name)).forEach(product => {
        const locationName = isMultiLocation ? (locations.find(l => l.id === product.location)?.name || product.location) : '';
        printWindow.document.write(`
            <tr>
                <td>${product.name}</td>
                <td>${product.category}</td>
                ${isMultiLocation ? `<td>${locationName}</td>` : ''}
                <td>${product.stock - product.reservedStock}</td>
                <td></td>
                <td></td>
                <td></td>
            </tr>
        `);
      });
      printWindow.document.write('</tbody></table>');

      printWindow.document.write('<div class="signature-line"><p>Assinatura do Responsável</p></div>');
      printWindow.document.write('<div class="footer"><p>MajorStockX &copy; ' + new Date().getFullYear() + '</p></div>');

      printWindow.document.write('</div></body></html>');
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
  };

  const categories = useMemo(() => {
    const categorySet = new Set(products.map(p => p.category));
    return Array.from(categorySet);
  }, [products]);

  const filteredProducts = useMemo(() => {
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
    }

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
        break;
      case 'date_desc':
        result.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        break;
      default:
        result.sort((a, b) => (b.stock - b.reservedStock) - (a.stock - a.reservedStock));
        break;
    }

    return result;
  }, [products, selectedLocation, nameFilter, categoryFilter, dateFilter, sortBy]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLocation, nameFilter, categoryFilter, dateFilter, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const handleClearInventory = async () => {
    if (clearProductsCollection) {
      await clearProductsCollection();
    }
    setShowClearConfirm(false);
  };

  const reportTitle = useMemo(() => {
    if (selectedLocation === 'all' || !isMultiLocation) {
      return "Relatório de Inventário Geral";
    }
    const locationName = locations.find(l => l.id === selectedLocation)?.name;
    return `Relatório de Inventário: ${locationName || 'Desconhecida'}`;
  }, [selectedLocation, isMultiLocation, locations]);

  const handlePrintReport = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
      printWindow.document.write('<!DOCTYPE html><html><head><title>' + reportTitle + '</title>');
      printWindow.document.write(`
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
            `);
      printWindow.document.write(`
                <style>
                    body { font-family: 'PT Sans', sans-serif; line-height: 1.6; color: #333; margin: 2rem; }
                    .container { max-width: 1000px; margin: auto; padding: 2rem; border: 1px solid #eee; border-radius: 8px; }
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; }
                    .header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; color: #3498db; margin: 0; }
                    .logo { display: flex; flex-direction: column; align-items: flex-start; }
                    .logo span { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: bold; color: #3498db; }
                    table { width: 100%; border-collapse: collapse; margin-top: 2rem; font-size: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f9fafb; font-family: 'Space Grotesk', sans-serif; }
                    .footer { text-align: center; margin-top: 3rem; font-size: 0.8rem; color: #999; }
                    @page { size: A4 landscape; margin: 0.5in; }
                    @media print {
                      body { margin: 0; -webkit-print-color-adjust: exact; }
                      .no-print { display: none; }
                      .container { border: none; box-shadow: none; }
                    }
                </style>
            `);
      printWindow.document.write('</head><body><div class="container">');
      printWindow.document.write(`
                <div class="header">
                     <div class="logo">
                        <span>${companyData?.name || 'MajorStockX'}</span>
                    </div>
                    <h1>${reportTitle}</h1>
                </div>
                <h2>Data: ${new Date().toLocaleDateString('pt-BR')}</h2>
            `);

      printWindow.document.write('<table><thead><tr><th>Produto</th><th>Categoria</th><th>Stock Disp.</th><th>Preço Unit.</th><th>Valor Stock</th></tr></thead><tbody>');

      let totalValue = 0;
      filteredProducts.forEach(product => {
        const availableStock = product.stock - product.reservedStock;
        const stockValue = availableStock * product.price;
        totalValue += stockValue;
        printWindow.document.write(`
                    <tr>
                        <td>${product.name}</td>
                        <td>${product.category}</td>
                        <td>${availableStock} ${product.unit || 'un.'}</td>
                        <td>${formatCurrency(product.price)}</td>
                        <td>${formatCurrency(stockValue)}</td>
                    </tr>
                `);
      });

      printWindow.document.write(`
                <tr>
                    <td colspan="4" style="text-align: right; font-weight: bold;">Valor Total do Inventário:</td>
                    <td style="font-weight: bold;">${formatCurrency(totalValue)}</td>
                </tr>
            `);

      printWindow.document.write('</tbody></table>');

      printWindow.document.write(`<div class="footer"><p>${companyData?.name || 'MajorStockX'} &copy; ${new Date().getFullYear()}</p></div>`);
      printWindow.document.write('</div></body></html>');
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
  };

  const handleDownloadPdfReport = () => {
    toast({
      title: "Como Guardar o Relatório em PDF",
      description: "Na janela de impressão que vai abrir, por favor mude o destino para 'Guardar como PDF' para descarregar o ficheiro.",
      duration: 8000,
    });
    handlePrintReport();
  };

  if (inventoryLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

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
            <AlertDialogAction onClick={confirmDeleteProduct} variant="destructive">Apagar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e irá apagar permanentemente **todos** os produtos do seu inventário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearInventory} variant="destructive">
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="flex items-center gap-2">
            <Button onClick={handleDownloadPdfReport} variant="outline" className="h-12">
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button onClick={() => toast({ title: "Em breve", description: "Envio por e-mail será ativado na próxima atualização." })} variant="outline" className="h-12 hidden sm:flex">
              <Mail className="mr-2 h-4 w-4" />
              Enviar por Email
            </Button>
            <Button onClick={handlePrintReport} variant="outline" className="h-12">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir Relatório
            </Button>
          </div>
        </div>
        <div className="py-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Filtrar nome ou código..."
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                className="w-full shadow-sm h-12 text-sm pr-10"
              />
            </div>
            <div className="flex w-full sm:w-auto items-center gap-2">
              <DatePicker date={dateFilter} setDate={setDateFilter} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between sm:w-auto h-12">
                    <ChevronsUpDown className="mr-2 h-4 w-4" />
                    <span>Ordenar por</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={(value) => setSortBy(value as 'stock_desc' | 'stock_asc' | 'name_asc' | 'date_desc')}>
                    <DropdownMenuRadioItem value="stock_desc">Maior Stock</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="stock_asc">Menor Stock</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="name_asc">Ordem Alfabética (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="date_desc">Atualizados Recentemente</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-4">
            <div className="hidden md:flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={view === 'list' ? 'default' : 'outline'} size="icon" onClick={() => handleSetView('list')} className="h-12 w-12">
                      <List className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Vista de Lista</p></TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => handleSetView('grid')} className="h-12 w-12">
                      <LayoutGrid className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Vista de Grelha</p></TooltipContent>
                </Tooltip>
                {view === 'grid' && (
                  <div className="hidden md:flex">
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-12 w-28 gap-2">
                              <span>{gridCols} Colunas</span>
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Número de colunas</p></TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent>
                        <DropdownMenuRadioGroup value={gridCols} onValueChange={(value) => handleSetGridCols(value as '3' | '4' | '5')}>
                          <DropdownMenuRadioItem value="3">3 Colunas</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="4">4 Colunas</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="5">5 Colunas</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </TooltipProvider>
            </div>

            <ScrollArea
              className="w-full md:w-auto pb-2"
              onTouchStart={e => e.stopPropagation()}
              onTouchMove={e => e.stopPropagation()}
              onTouchEnd={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  {isMultiLocation && canEditInventory && (
                    <TransferStockDialog
                      onTransfer={handleTransferStock}
                    />
                  )}
                  {isMultiLocation && canViewInventory && (
                    <DropdownMenu>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="icon" className="shadow-sm h-12 w-12 rounded-2xl flex-shrink-0">
                              <MapPin className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Filtrar por Localização</p>
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenuContent align="end">
                        <ScrollArea className="h-[200px]">
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
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon" className="shadow-sm relative h-12 w-12 rounded-2xl flex-shrink-0">
                            <ListFilter className="h-5 w-5" />
                            {categoryFilter.length > 0 && (
                              <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs px-1">
                                {categoryFilter.length > 9 ? '9+' : categoryFilter.length}
                              </span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Filtrar por Categoria</p>
                      </TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end">
                      <ScrollArea className="h-48">
                        {categories.map((category) => {
                          return (
                            <DropdownMenuCheckboxItem
                              key={category}
                              className="capitalize"
                              checked={categoryFilter.includes(category)}
                              onCheckedChange={(value) => {
                                if (value) {
                                  setCategoryFilter([...categoryFilter, category]);
                                } else {
                                  setCategoryFilter(categoryFilter.filter(c => c !== category));
                                }
                              }}
                            >
                              {category}
                            </DropdownMenuCheckboxItem>
                          )
                        })}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" asChild className="shadow-sm h-12 w-12 rounded-2xl flex-shrink-0">
                        <Link href="/inventory/history"><History className="h-5 w-5" /></Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ver Histórico de Movimentos</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={handlePrintCountForm} className="shadow-sm h-12 w-12 rounded-2xl flex-shrink-0">
                        <FileText className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Imprimir Formulário de Contagem</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <ScrollBar orientation="horizontal" className="md:hidden" />
            </ScrollArea>
          </div>
        </div>

        {view === 'list' ? (
          <InventoryDataTable
            columns={columns({
              onAttemptDelete: (product) => setProductToDelete(product),
              onProductUpdate: handleUpdateProduct,
              canEdit: canEditInventory,
              isMultiLocation: isMultiLocation,
              locations: locations
            })}
            data={currentProducts}
          />
        ) : (
          filteredProducts.length > 0 ? (
            <div className={cn(
              "grid gap-2 sm:gap-4",
              gridCols === '3' && "grid-cols-2 sm:grid-cols-3",
              gridCols === '4' && "grid-cols-2 sm:grid-cols-4",
              gridCols === '5' && "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5"
            )}>
              {currentProducts.map(product => (
                <ProductCard
                  key={product.instanceId}
                  product={product}
                  onProductUpdate={handleUpdateProduct}
                  onAttemptDelete={setProductToDelete}
                  viewMode={gridCols === '5' || gridCols === '4' ? 'condensed' : 'normal'}
                  canEdit={canEditInventory}
                  locations={locations}
                  isMultiLocation={isMultiLocation}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Nenhum produto no inventário.</p>
              {canEditInventory && <p className="text-sm">Comece por adicionar um novo produto.</p>}
            </div>
          )
        )}

        {/* Pagination Controls */}
        {filteredProducts.length > itemsPerPage && (
          <div className="flex items-center justify-between border-t pt-4">
            <div className="text-sm text-muted-foreground hidden sm:block">
              A mostrar <span className="font-medium text-foreground">{startIndex + 1}-{Math.min(endIndex, filteredProducts.length)}</span> de <span className="font-medium text-foreground">{filteredProducts.length}</span> produtos
            </div>
            <div className="flex items-center gap-2 mx-auto sm:mx-0">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-9 w-9"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium">
                Página {currentPage} de {totalPages}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-9 w-9"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {isAdmin && (
          <Card className="mt-8">
            <div className="p-6 flex flex-col items-center text-center">
              <h3 className="font-semibold mb-2">Zona de Administrador</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Esta ação é irreversível e irá apagar permanentemente **todos** os produtos do seu inventário.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Todo o Inventário
              </Button>
            </div>
          </Card>
        )}
      </div>
      {canEditInventory && (
        <>
          <AddProductDialog
            open={isAddDialogOpen}
            onOpenChange={setAddDialogOpen}
            onAddProduct={handleAddProduct}
          />
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-lg z-20"
            size="icon"
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Adicionar Produto</span>
          </Button>
        </>
      )}
    </>
  );
}
