
"use client";

import { useState, useEffect, useMemo } from "react";
import { sales as initialSales, products as initialProducts, currentUser } from "@/lib/data";
import type { Sale, Location, Product } from "@/lib/types";
import { columns } from "@/components/sales/columns";
import { SalesDataTable } from "@/components/sales/data-table";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid, ChevronDown, Filter } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SaleCard } from "@/components/sales/sale-card";
import { cn } from "@/lib/utils";

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [locations, setLocations] = useState<Location[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [gridCols, setGridCols] = useState<'3' | '4' | '5'>('3');
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocations = localStorage.getItem('majorstockx-locations');
      if (storedLocations) {
        setLocations(JSON.parse(storedLocations));
      }

      const savedView = localStorage.getItem('majorstockx-sales-view') as 'list' | 'grid';
      const savedGridCols = localStorage.getItem('majorstockx-sales-grid-cols') as '3' | '4' | '5';
      if (savedView) setView(savedView);
      if (savedGridCols) setGridCols(savedGridCols);
    }
  }, []);

  const handleSetView = (newView: 'list' | 'grid') => {
    setView(newView);
    localStorage.setItem('majorstockx-sales-view', newView);
  }

  const handleSetGridCols = (cols: '3' | '4' | '5') => {
    setGridCols(cols);
    localStorage.setItem('majorstockx-sales-grid-cols', cols);
  }

  const handleAddSale = (newSale: Sale, updatedProducts: Product[]) => {
    setSales([newSale, ...sales]);
    setAllProducts(updatedProducts);
  };

  const handleUpdateSale = (updatedSale: Sale) => {
    setSales(sales.map(s => s.id === updatedSale.id ? updatedSale : s));
    toast({
        title: "Venda Atualizada",
        description: `A venda #${updatedSale.guideNumber} foi atualizada com sucesso.`,
    });
  };

  const handleConfirmPickup = (saleId: string) => {
    const saleToUpdate = sales.find(s => s.id === saleId);
    if (!saleToUpdate) return;

    setSales(sales.map(s => s.id === saleId ? { ...s, status: 'Levantado' } : s));

    setAllProducts(allProducts.map(p => {
      if (p.id === saleToUpdate.productId && (p.location === saleToUpdate.location || !saleToUpdate.location)) {
        return {
          ...p,
          stock: p.stock - saleToUpdate.quantity,
          reservedStock: p.reservedStock - saleToUpdate.quantity,
        };
      }
      return p;
    }));

    toast({
      title: "Material Levantado",
      description: `O stock foi atualizado para a venda #${saleToUpdate.guideNumber}.`,
    });
  };
  
  const filteredSales = useMemo(() => {
    let result = sales;
    if (nameFilter) {
      result = result.filter(s => 
        s.productName.toLowerCase().includes(nameFilter.toLowerCase()) ||
        s.guideNumber.toLowerCase().includes(nameFilter.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }
    return result;
  }, [sales, nameFilter, statusFilter]);


  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-headline font-bold">Vendas</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                    Visualize e registre as vendas de produtos.
                </p>
            </div>
        </div>

        <div className="py-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <Input
                  placeholder="Filtrar por produto ou guia..."
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  className="w-full md:max-w-sm shadow-lg h-12 text-sm"
                />
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="shadow-lg h-12 w-full sm:w-auto">
                            <Filter className="mr-2 h-4 w-4" />
                            {statusFilter === 'all' ? 'Todos os Status' : statusFilter}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem checked={statusFilter === 'all'} onCheckedChange={() => setStatusFilter('all')}>Todos</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === 'Pago'} onCheckedChange={() => setStatusFilter('Pago')}>Pagas não levantadas</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === 'Levantado'} onCheckedChange={() => setStatusFilter('Levantado')}>Levantadas</DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div className="flex items-center justify-center gap-2 border-t pt-4">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={view === 'list' ? 'default' : 'outline'} size="icon" onClick={() => handleSetView('list')} className="h-12 w-12">
                                <List className="h-5 w-5"/>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Vista de Lista</p></TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => handleSetView('grid')} className="h-12 w-12">
                                <LayoutGrid className="h-5 w-5"/>
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
        </div>

      {view === 'list' ? (
        <SalesDataTable 
          columns={columns({ 
              locations,
              products: allProducts,
              onUpdateSale: handleUpdateSale,
              onConfirmPickup: handleConfirmPickup,
          })} 
          data={filteredSales} 
        />
      ) : (
        <div className={cn(
            "grid gap-2 sm:gap-4",
            gridCols === '3' && "grid-cols-2 sm:grid-cols-3",
            gridCols === '4' && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
            gridCols === '5' && "grid-cols-3 sm:grid-cols-4 md:grid-cols-5",
        )}>
            {filteredSales.map(sale => (
                <SaleCard 
                    key={sale.id}
                    sale={sale}
                    locations={locations}
                    products={allProducts}
                    onUpdateSale={handleUpdateSale}
                    onConfirmPickup={handleConfirmPickup}
                    isMultiLocation={locations.length > 0}
                    viewMode={gridCols === '5' || gridCols === '4' ? 'condensed' : 'normal'}
                />
            ))}
        </div>
      )}
       <AddSaleDialog products={allProducts} onAddSale={handleAddSale} triggerType="fab" />
    </div>
  );
}
