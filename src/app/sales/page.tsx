
"use client";

import { useState, useEffect, useMemo, useContext } from "react";
import { useSearchParams } from 'next/navigation';
import type { Sale, Location, ModulePermission } from "@/lib/types";
import { columns } from "@/components/sales/columns";
import { SalesDataTable } from "@/components/sales/data-table";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid, ChevronDown, Filter, Lock, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SaleCard } from "@/components/sales/sale-card";
import { cn } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SalesPage() {
  const searchParams = useSearchParams();
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [gridCols, setGridCols] = useState<'3' | '4' | '5'>('3');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const { toast } = useToast();
  const inventoryContext = useContext(InventoryContext);
  const firestore = useFirestore();

  const { 
    sales, 
    loading: inventoryLoading, 
    addSale,
    confirmSalePickup,
    user,
    companyId,
    canEdit,
    canView,
    locations,
    isMultiLocation,
  } = inventoryContext || { 
    sales: [], 
    loading: true, 
    addSale: async () => {},
    confirmSalePickup: () => {},
    user: null,
    companyId: null,
    canEdit: () => false,
    canView: () => false,
    locations: [],
    isMultiLocation: false,
  };

  const canEditSales = canEdit('sales');
  const canViewSales = canView('sales');
  
  useEffect(() => {
    if (searchParams.get('action') === 'add' && canEditSales) {
      setAddDialogOpen(true);
    }
  }, [searchParams, canEditSales]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
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

  const handleAddSale = async (newSaleData:  Omit<Sale, 'id' | 'guideNumber'>) => {
    try {
      if (!addSale) throw new Error("Função de venda não disponível.");
      await addSale(newSaleData);
      toast({
        title: "Venda Registrada como 'Paga'",
        description: `${newSaleData.quantity} unidades de ${newSaleData.productName} foram reservadas.`,
      });
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Erro ao Vender",
        description: error.message || "Não foi possível registrar a venda.",
      });
    }
  };

  const handleUpdateSale = (updatedSale: Sale) => {
     if(updatedSale.id && firestore && companyId) {
         const saleDocRef = doc(firestore, `companies/${companyId}/sales`, updatedSale.id);
         updateDoc(saleDocRef, updatedSale as any);
         toast({
            title: "Venda Atualizada",
            description: `A venda #${updatedSale.guideNumber} foi atualizada com sucesso.`,
        });
     }
  };

  const handleConfirmPickup = (sale: Sale) => {
    try {
      if (!confirmSalePickup) throw new Error("Função de levantamento não disponível.");
      confirmSalePickup(sale);
      toast({
        title: "Material Levantado",
        description: `O stock foi atualizado para a venda #${sale.guideNumber}.`,
      });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Erro no Levantamento",
            description: error.message || "Não foi possível confirmar o levantamento.",
        });
    }
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
    if (isMultiLocation && locationFilter !== 'all') {
      result = result.filter(s => s.location === locationFilter);
    }
    return result;
  }, [sales, nameFilter, statusFilter, isMultiLocation, locationFilter]);

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
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-headline font-bold">Vendas</h1>
                 <div className="text-muted-foreground mt-1">
                    Visualize e registre as vendas de produtos.
                     {!canEditSales && 
                        <Badge variant="outline" className="ml-2 border-amber-500/50 text-amber-600 bg-amber-50 dark:bg-amber-900/20">
                          <Lock className="mr-1 h-3 w-3" />
                          Modo de Visualização
                        </Badge>
                      }
                </div>
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
                {isMultiLocation && canViewSales && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-12 w-full sm:w-auto shadow-lg">
                          <MapPin className="mr-2 h-4 w-4" />
                          {locationFilter === 'all' ? 'Todas as Localizações' : locations.find(l => l.id === locationFilter)?.name}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ScrollArea className="h-48">
                          <DropdownMenuLabel>Filtrar por Localização</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem checked={locationFilter === 'all'} onCheckedChange={() => setLocationFilter('all')}>Todas</DropdownMenuCheckboxItem>
                          {locations.map(loc => (
                            <DropdownMenuCheckboxItem key={loc.id} checked={locationFilter === loc.id} onCheckedChange={() => setLocationFilter(loc.id)}>{loc.name}</DropdownMenuCheckboxItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
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
              onUpdateSale: handleUpdateSale,
              onConfirmPickup: handleConfirmPickup,
              canEdit: canEditSales
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
                    onUpdateSale={handleUpdateSale}
                    onConfirmPickup={handleConfirmPickup}
                    viewMode={gridCols === '5' || gridCols === '4' ? 'condensed' : 'normal'}
                    canEdit={canEditSales}
                    locationName={locations.find(l => l.id === sale.location)?.name}
                />
            ))}
        </div>
      )}
       {canEditSales && <AddSaleDialog
        open={isAddDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAddSale={handleAddSale}
      />}
    </div>
  );
}
