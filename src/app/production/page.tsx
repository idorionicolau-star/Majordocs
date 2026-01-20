"use client";

import { useState, useEffect, useMemo, useContext } from "react";
import { useSearchParams } from 'next/navigation';
import { ProductionDataTable } from "@/components/production/data-table";
import { AddProductionDialog } from "@/components/production/add-production-dialog";
import type { Production, Location, ModulePermission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid, ChevronDown, Lock, MapPin, Trash2, PlusCircle, Plus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ProductionCard } from "@/components/production/production-card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { InventoryContext } from "@/context/inventory-context";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore } from "@/firebase/provider";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DatePicker } from "@/components/ui/date-picker";
import { isSameDay } from "date-fns";
import { Card } from "@/components/ui/card";
import { columns } from "@/components/production/columns";

export default function ProductionPage() {
  const inventoryContext = useContext(InventoryContext);
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [nameFilter, setNameFilter] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>();
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [gridCols, setGridCols] = useState<'3' | '4' | '5'>('4');
  const [productionToTransfer, setProductionToTransfer] = useState<Production | null>(null);
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const { productions, companyId, updateProductStock, loading: inventoryLoading, user, canEdit, canView, locations, isMultiLocation, deleteProduction, updateProduction, clearProductions } = inventoryContext || { productions: [], companyId: null, updateProductStock: () => {}, loading: true, user: null, canEdit: () => false, canView: () => false, locations: [], isMultiLocation: false, deleteProduction: () => {}, updateProduction: () => {}, clearProductions: async () => {} };

  const canEditProduction = canEdit('production');
  const canViewProduction = canView('production');
  const isAdmin = user?.role === 'Admin';
  
  useEffect(() => {
    if (searchParams.get('action') === 'add' && canEditProduction) {
      setAddDialogOpen(true);
    }
  }, [searchParams, canEditProduction]);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedView = localStorage.getItem('majorstockx-production-view') as 'list' | 'grid';
      const savedGridCols = localStorage.getItem('majorstockx-production-grid-cols') as '3' | '4' | '5';
      if (savedView) setView(savedView);
      if (savedGridCols) setGridCols(savedGridCols);
    }
  }, []);

  const handleSetView = (newView: 'list' | 'grid') => {
    setView(newView);
    localStorage.setItem('majorstockx-production-view', newView);
  }

  const handleSetGridCols = (cols: '3' | '4' | '5') => {
    setGridCols(cols);
    localStorage.setItem('majorstockx-production-grid-cols', cols);
  }

  const handleAddProduction = (newProductionData: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => {
    if (!firestore || !companyId || !user) return;
    
    const newProduction: Omit<Production, 'id'> = {
      date: new Date().toISOString().split('T')[0],
      productName: newProductionData.productName,
      quantity: newProductionData.quantity,
      unit: newProductionData.unit,
      location: newProductionData.location,
      registeredBy: user.username || 'Desconhecido',
      status: 'Concluído'
    };

    const productionsRef = collection(firestore, `companies/${companyId}/productions`);
    addDoc(productionsRef, newProduction);
    
    toast({
        title: "Produção Registrada",
        description: `O registo de ${newProduction.quantity} unidades de ${newProduction.productName} foi criado.`,
    });
  };

  const handleConfirmTransfer = () => {
    if (!productionToTransfer || !firestore || !companyId) return;

    updateProductStock(productionToTransfer.productName, productionToTransfer.quantity, productionToTransfer.location);

    const prodDocRef = doc(firestore, `companies/${companyId}/productions`, productionToTransfer.id);
    updateDoc(prodDocRef, { status: 'Transferido' });

    toast({
      title: "Transferência Concluída",
      description: `${productionToTransfer.quantity} unidades de ${productionToTransfer.productName} foram adicionadas ao inventário.`,
    });

    setProductionToTransfer(null);
  };

  const filteredProductions = useMemo(() => {
    let result = productions;
    if (nameFilter) {
      result = result.filter(p => p.productName.toLowerCase().includes(nameFilter.toLowerCase()));
    }
    if (isMultiLocation && locationFilter !== 'all') {
      result = result.filter(p => p.location === locationFilter);
    }
    if (dateFilter) {
      result = result.filter(p => isSameDay(new Date(p.date), dateFilter));
    }
    return result;
  }, [productions, nameFilter, locationFilter, isMultiLocation, dateFilter]);
  
  const handleClear = async () => {
    if (clearProductions) {
      await clearProductions();
    }
    setShowClearConfirm(false);
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
    <AlertDialog open={!!productionToTransfer} onOpenChange={(open) => !open && setProductionToTransfer(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Transferência</AlertDialogTitle>
          <AlertDialogDescription>
            Tem a certeza que deseja transferir <span className="font-bold">{productionToTransfer?.quantity}</span> unidades de <span className="font-bold">{productionToTransfer?.productName}</span> para o inventário {isMultiLocation && `da localização "${locations.find(l => l.id === productionToTransfer?.location)?.name}"`}? Esta ação irá atualizar o stock.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmTransfer}>Confirmar e Transferir</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e irá apagar permanentemente **toda** a produção registada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} variant="destructive">
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-headline font-bold">Produção</h1>
            </div>
        </div>

        <div className="py-4 space-y-4">
             <div className="flex flex-col sm:flex-row items-center gap-2">
                <Input
                  placeholder="Filtrar por nome do produto..."
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  className="w-full sm:max-w-xs shadow-sm h-12 text-sm"
                />
                <div className="flex w-full sm:w-auto items-center gap-2">
                  <DatePicker date={dateFilter} setDate={setDateFilter} />
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-4">
                <div className="hidden md:flex items-center gap-2">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant={view === 'list' ? 'default' : 'outline'} size="icon" onClick={() => handleSetView('list')} className="h-12 w-12 hidden md:flex">
                                    <List className="h-5 w-5"/>
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent><p>Vista de Lista</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant={view === 'grid' ? 'default' : 'outline'} size="icon" onClick={() => handleSetView('grid')} className="h-12 w-12 hidden md:flex">
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
                 <ScrollArea 
                    className="w-full md:w-auto pb-2"
                    onTouchStart={e => e.stopPropagation()}
                    onTouchMove={e => e.stopPropagation()}
                    onTouchEnd={e => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-2">
                        {isMultiLocation && canViewProduction && (
                          <DropdownMenu>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="h-12 w-12 flex-shrink-0" size="icon">
                                      <MapPin className="h-5 w-5" />
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

      <div className="hidden md:block">
        {view === 'list' ? (
            <ProductionDataTable columns={columns({})} data={filteredProductions} />
        ) : (
            <div className={cn(
                "grid gap-2 sm:gap-4",
                gridCols === '3' && "grid-cols-2 sm:grid-cols-3",
                gridCols === '4' && "grid-cols-2 sm:grid-cols-4",
                gridCols === '5' && "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5"
            )}>
                {filteredProductions.map(production => (
                    <ProductionCard 
                        key={production.id}
                        production={production}
                        onTransfer={() => setProductionToTransfer(production)}
                        onDelete={deleteProduction}
                        onUpdate={updateProduction}
                        viewMode={gridCols === '5' ? 'condensed' : 'normal'}
                        canEdit={canEditProduction}
                        locationName={locations.find(l => l.id === production.location)?.name}
                    />
                ))}
            </div>
        )}
      </div>

      <div className="md:hidden space-y-3">
        {filteredProductions.length > 0 ? (
          filteredProductions.map(production => (
            <ProductionCard 
              key={production.id}
              production={production}
              onTransfer={() => setProductionToTransfer(production)}
              onDelete={deleteProduction}
              onUpdate={updateProduction}
              viewMode='normal'
              canEdit={canEditProduction}
              locationName={locations.find(l => l.id === production.location)?.name}
            />
          ))
        ) : (
          <Card className="text-center py-12 text-muted-foreground">
            Nenhum registo de produção encontrado.
          </Card>
        )}
      </div>


        {isAdmin && (
          <Card className="mt-8">
            <div className="p-6 flex flex-col items-center text-center">
              <h3 className="font-semibold mb-2">Zona de Administrador</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Esta ação é irreversível e irá apagar permanentemente **toda** a produção registada.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowClearConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Produção
              </Button>
            </div>
          </Card>
        )}

      {canEditProduction && (
        <>
            <AddProductionDialog 
                open={isAddDialogOpen}
                onOpenChange={setAddDialogOpen}
                onAddProduction={handleAddProduction} 
            />
            <Button
                onClick={() => setAddDialogOpen(true)}
                className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-lg z-20"
                size="icon"
            >
                <Plus className="h-6 w-6" />
                <span className="sr-only">Adicionar Produção</span>
            </Button>
        </>
      )}
    </div>
    </>
  );
}
