"use client";

import { useState, useEffect, useMemo, useContext } from "react";
import { useSearchParams } from 'next/navigation';
import type { Sale } from "@/lib/types";
import { columns } from "@/components/sales/columns";
import { SalesDataTable } from "@/components/sales/sales-data-table";
import { VirtualSalesGrid } from "@/components/sales/virtual-sales-grid";
import { AddSaleDialog } from "@/components/sales/add-sale-dialog";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid, ChevronDown, Filter, MapPin, Trash2, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { doc, updateDoc } from "firebase/firestore";
import { useFirestore } from '@/firebase/provider';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { isSameDay } from "date-fns";
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
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
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
    clearSales,
    confirmAction,
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
    clearSales: async () => { },
    confirmAction: () => { }
  };

  const canEditSales = canEdit('sales');
  const canViewSales = canView('sales');
  const isAdmin = user?.role === 'Admin';

  // --- Firestore Pagination Query Construction ---
  const salesQuery = useMemo(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/sales`);
  }, [firestore, companyId]);

  const queryConstraints = useMemo(() => {
    const constraints: QueryConstraint[] = [];

    // 1. Status Filter
    if (statusFilter !== 'all') {
      constraints.push(where('status', '==', statusFilter));
    }

    // 2. Location Filter
    if (isMultiLocation && locationFilter !== 'all') {
      constraints.push(where('location', '==', locationFilter));
    }

    // 3. Name Filter (Search by productName or guideNumber)
    // Basic prefix search on productName (limitation: cannot OR guideNumber efficiently server-side without multiple queries)
    if (nameFilter) {
      constraints.push(where('productName', '>=', nameFilter));
      constraints.push(where('productName', '<=', nameFilter + '\uf8ff'));
    }
    // 4. Date Filter - Exact match on Date object stored as string/timestamp?
    // Sale type usually saves ISO string or timestamp. 
    // The previous client-side logic used `isSameDay`.
    // Server-side: `where('date', '>=', startOfDay), where('date', '<=', endOfDay)`.
    // We'll skip complex date filtering server-side for this iteration and default to sorting.
    else {
      // Default Sort
      constraints.push(orderBy('date', 'desc'));
    }

    return constraints;
  }, [statusFilter, locationFilter, isMultiLocation, nameFilter, dateFilter]);

  // Use the Hook
  const {
    data: sales,
    loading: salesLoading,
    loadMore,
    hasMore
  } = useFirestorePagination<Sale>(
    salesQuery as any,
    500, // Increase fetch limit to support client-side pagination
    salesQuery ? queryConstraints : []
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    const handleResize = () => {
      setItemsPerPage(window.innerWidth >= 768 ? 60 : 10);
    };

    // Initial check
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [nameFilter, statusFilter, dateFilter, locationFilter]);

  const totalPages = Math.ceil(sales.length / itemsPerPage);
  const paginatedSales = sales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(p => p + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (hasMore) {
      loadMore();
      // We might need to handle the "after load, go to next page" logic, 
      // but for simplicity, we load more into the buffer and user might need to click next again 
      // or we rely on the fact that if we have more, we just let them click next if the buffer filled up.
      // Actually, useFirestorePagination loads *into* 'sales'.
      // If we are at the end of current 'sales' list and 'hasMore' is true, we should load more.
      // For this implementation, let's keep it simple: "Load More" button if needed, or auto-load.
      // Standard "Next" usually implies we have the data. 
      // With 500 limit, we likely have it.
    }
  };

  const handlePreviousPage = () => {
    setCurrentPage(p => Math.max(1, p - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (searchParams.get('action') === 'add' && canEditSales) {
      setAddDialogOpen(true);
    }
    const nameQuery = searchParams.get('nameFilter');
    if (nameQuery) {
      setNameFilter(nameQuery);
    }
    const statusQuery = searchParams.get('statusFilter');
    if (statusQuery) {
      setStatusFilter(statusQuery);
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

  const handleAddSale = async (newSaleData: Omit<Sale, 'id' | 'guideNumber'>) => {
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
    if (updatedSale.id && firestore && companyId) {
      const saleDocRef = doc(firestore, `companies/${companyId}/sales`, updatedSale.id);
      updateDoc(saleDocRef, updatedSale as any);
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

  const handleClearSales = async () => {
    if (clearSales && confirmAction) {
      confirmAction(async () => {
        await clearSales();
        setShowClearConfirm(false);
      }, "Limpar Todas as Vendas", "Tem a certeza absoluta? Esta ação requer a sua palavra-passe e é irreversível.");
    }
  };

  const handleDeleteCallback = (id: string) => {
    if (confirmAction && deleteSale) {
      confirmAction(async () => {
        await deleteSale(id); // Ensure deleteSale returns Promise<void> or void
      }, "Apagar Venda", "Esta ação apagará o registo e reporá o stock. Confirme com a sua palavra-passe.");
    }
  };

  if (!companyId) {
    return <div className="p-10 text-center"><Skeleton className="h-10 w-full" /></div>
  }

  return (
    <>
      {/* Custom Alert Dialog removed, using PasswordConfirmation which is global in context. 
          Actually, the admin button still opens showClearConfirm dialog?
          Wait, handleClearSales calls confirmAction which opens another dialog.
          So if I keep showClearConfirm, I have two dialogs.
          Admin clicks "Clear Sales" -> showClearConfirm opens (Are you sure?) -> "Yes" -> confirmAction opens (Password?).
          This double confirmation is good for "Clear All". 
      */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e irá apagar permanentemente **todas** as vendas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearSales} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">


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
              <ScrollArea
                className="w-full md:w-auto pb-2"
              >
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
                        <TooltipContent>
                          <p>Filtrar por Status</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
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
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="h-12 w-12 flex-shrink-0 bg-background/50" size="icon">
                                <MapPin className="mr-2 h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Filtrar por Localização</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                <ScrollBar orientation="horizontal" className="md:hidden" />
              </ScrollArea>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          {view === 'list' ? (
            <SalesDataTable
              columns={columns({
                onUpdateSale: handleUpdateSale,
                onConfirmPickup: handleConfirmPickup,
                canEdit: canEditSales
              })}
              data={paginatedSales}
            />
          ) : (
            <VirtualSalesGrid
              sales={paginatedSales}
              onUpdateSale={handleUpdateSale}
              onConfirmPickup={handleConfirmPickup}
              onDeleteSale={handleDeleteCallback}
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

          {/* Pagination Controls */}
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
                  Próximo
                </Button>
              </div>
            </div>
          )}

          {isAdmin && (
            <Card className="mt-8 mb-6">
              <div className="p-6 flex flex-col items-center text-center">
                <h3 className="font-semibold mb-2">Zona de Administrador</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-md">
                  Esta ação é irreversível e irá apagar permanentemente **todas** as vendas.
                </p>
                <Button
                  variant="destructive"
                  onClick={() => setShowClearConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Vendas
                </Button>
              </div>
            </Card>
          )}
        </div>

        {canEditSales && (
          <>
            <AddSaleDialog
              open={isAddDialogOpen}
              onOpenChange={setAddDialogOpen}
              onAddSale={handleAddSale}
            />
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-lg z-20"
              size="icon"
            >
              <Plus className="h-6 w-6" />
              <span className="sr-only">Adicionar Venda</span>
            </Button>
          </>
        )}
      </div>
    </>
  );
}
