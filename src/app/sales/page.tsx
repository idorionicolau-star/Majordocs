"use client";

import { useState, useEffect, useMemo, useContext } from "react";
import { useSearchParams } from 'next/navigation';
import type { Sale } from "@/lib/types";
import { columns } from "@/components/sales/columns";
import { SalesDataTable } from "@/components/sales/sales-data-table";
import { VirtualSalesGrid } from "@/components/sales/virtual-sales-grid";

import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid, ChevronDown, Filter, MapPin } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore } from '@/firebase/provider';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { Card } from "@/components/ui/card";
import { useFirestorePagination } from "@/hooks/use-firestore-pagination";
import { collection, where, orderBy, QueryConstraint } from "firebase/firestore";

export default function SalesPage() {
  const searchParams = useSearchParams();
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [gridCols, setGridCols] = useState<'3' | '4' | '5'>('3');

  const [locationFilter, setLocationFilter] = useState<string>('all');
  const { toast } = useToast();
  const inventoryContext = useContext(InventoryContext);
  const firestore = useFirestore();

  const {
    loading: inventoryLoading,
    addSale,
    confirmSalePickup,
    deleteSale,
    user,
    companyId,
    canEdit,
    canView,
    locations,
    isMultiLocation,
  } = inventoryContext || {
    loading: true,
    addSale: async () => { },
    confirmSalePickup: () => { },
    deleteSale: () => { },
    user: null,
    companyId: null,
    canEdit: () => false,
    canView: () => false,
    locations: [],
    isMultiLocation: false,
  };

  const canEditSales = canEdit('sales');
  const canViewSales = canView('sales');

  // --- Firestore Pagination Query Construction ---
  const salesQuery = useMemo(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/sales`);
  }, [firestore, companyId]);

  const queryConstraints = useMemo(() => {
    const constraints: QueryConstraint[] = [];

    if (statusFilter !== 'all') {
      constraints.push(where('status', '==', statusFilter));
    }

    if (isMultiLocation && locationFilter !== 'all') {
      constraints.push(where('location', '==', locationFilter));
    }

    if (nameFilter) {
      constraints.push(where('productName', '>=', nameFilter));
      constraints.push(where('productName', '<=', nameFilter + '\uf8ff'));
    } else {
      constraints.push(orderBy('date', 'desc'));
    }

    return constraints;
  }, [statusFilter, locationFilter, isMultiLocation, nameFilter]);

  const {
    data: sales,
    loading: salesLoading,
    loadMore,
    hasMore,
    updateItem
  } = useFirestorePagination<Sale>(
    salesQuery as any,
    500,
    salesQuery ? queryConstraints : []
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(2000); // "Infinite" scroll as requested

  // Removed resize listener that was resetting itemsPerPage
  /*
  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(window.innerWidth >= 768 ? 60 : 10);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  */

  useEffect(() => {
    setCurrentPage(1);
  }, [nameFilter, statusFilter, dateFilter, locationFilter]);

  const totalPages = Math.ceil(sales.filter(s => !s.deletedAt).length / itemsPerPage);
  const paginatedSales = sales.filter(s => !s.deletedAt).slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hasMore) {
      loadMore();
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage(p => Math.max(1, p - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const nameQuery = searchParams.get('nameFilter');
    if (nameQuery) setNameFilter(nameQuery);
    const statusQuery = searchParams.get('statusFilter');
    if (statusQuery) setStatusFilter(statusQuery);
  }, [searchParams]);

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



  const handleUpdateSale = (updatedSale: Sale) => {
    if (updatedSale.id && firestore && companyId) {
      const saleDocRef = doc(firestore, `companies/${companyId}/sales`, updatedSale.id);
      updateDoc(saleDocRef, updatedSale as any);
      updateItem(updatedSale.id, updatedSale);
      toast({
        title: "Venda Atualizada",
        description: `A venda #${updatedSale.guideNumber} foi atualizada com sucesso.`,
      });
    }
  };

  const handleConfirmPickup = async (sale: Sale) => {
    try {
      if (!confirmSalePickup) throw new Error("Função de levantamento não disponível.");
      await confirmSalePickup(sale);
      if (sale.id) {
        updateItem(sale.id, { status: 'Levantado' });
      }
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

  const handleDeleteSale = async (saleId: string) => {
    try {
      await deleteSale(saleId);
      updateItem(saleId, { deletedAt: new Date().toISOString() } as any);
    } catch (error: any) {
      // Error handled in context
    }
  };

  if (!companyId) {
    return <div className="p-10 text-center"><Skeleton className="h-10 w-full" /></div>
  }

  return (
    <>
      <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Histórico de Vendas</h1>
            <p className="text-muted-foreground">Consulte o histórico de vendas e saídas de stock.</p>
          </div>
        </div>

        <Card className="glass-panel p-4 border-none shrink-0">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Input
                placeholder="Filtrar por produto (nome)..."
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                className="w-full sm:max-w-xs shadow-sm h-12 text-sm bg-background/50"
              />
              <div className="flex flex-col w-full sm:flex-row sm:w-auto items-center gap-2">
                <DatePicker date={dateFilter} setDate={setDateFilter} />
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-border/50 pt-4">
              <div className="hidden md:flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant={view === 'list' ? 'default' : 'outline'} size="icon" onClick={() => handleSetView('list')} className="h-12 w-12 hidden md:flex bg-background/50">
                        <List className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent><p>Vista de Lista</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => handleSetView('grid')} className="h-12 w-12 hidden md:flex bg-background/50">
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
                              <Button variant="outline" className="h-12 w-28 gap-2 bg-background/50">
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

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="shadow-sm h-12 w-12 flex-shrink-0 bg-background/50" size="icon">
                            <Filter className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent><p>Filtrar por Status</p></TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenuContent align="end" className="w-[200px]">
                    <DropdownMenuLabel>Filtrar por Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                      <DropdownMenuRadioItem value="all">Todos</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Pago">Pago</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="Levantado">Levantado</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>

                {isMultiLocation && (
                  <DropdownMenu>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="h-12 w-12 flex-shrink-0 bg-background/50" size="icon">
                              <MapPin className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent><p>Filtrar por Localização</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <DropdownMenuContent align="end" className="w-[200px]">
                      <DropdownMenuLabel>Filtrar por Local</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={locationFilter} onValueChange={setLocationFilter}>
                        <DropdownMenuRadioItem value="all">Todas</DropdownMenuRadioItem>
                        {locations.map(loc => (
                          <DropdownMenuRadioItem key={loc.id} value={loc.id}>{loc.name}</DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          </div>
        </Card>

        {inventoryLoading || salesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {view === 'list' ? (
                <SalesDataTable
                  columns={columns({
                    onUpdateSale: handleUpdateSale,
                    onConfirmPickup: handleConfirmPickup,
                    onDeleteSale: handleDeleteSale,
                    canEdit: canEditSales
                  })}
                  data={paginatedSales}
                />
              ) : (
                <VirtualSalesGrid
                  sales={paginatedSales}
                  onUpdateSale={handleUpdateSale}
                  onConfirmPickup={handleConfirmPickup}
                  onDeleteSale={handleDeleteSale}
                  canEdit={canEditSales}
                  locations={locations}
                  gridCols={gridCols}
                />
              )}

              {!salesLoading && sales.length === 0 && (
                <Card className="text-center py-12 text-muted-foreground mt-4">
                  Nenhuma venda encontrada com os filtros atuais.
                </Card>
              )}

              {sales.length > 0 && (
                <div className="flex items-center justify-between py-4">
                  <div className="flex-1 text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, sales.length)} de {sales.length} vendas
                    {hasMore && " (carregado)"}
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages && !hasMore}
                    >
                      {currentPage >= totalPages && hasMore ? "Carregar Mais" : "Próximo"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}


      </div>
    </>
  );
}
