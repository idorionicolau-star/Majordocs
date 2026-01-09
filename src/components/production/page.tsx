
"use client";

import { useState, useEffect, useMemo, useContext } from "react";
import { ProductionDataTable } from "@/components/production/data-table";
import { AddProductionDialog } from "@/components/production/add-production-dialog";
import type { Production, Location } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid, ChevronDown, Package } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { useFirestore } from "@/firebase";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";

export default function ProductionPage() {
  const inventoryContext = useContext(InventoryContext);
  const { toast } = useToast();
  const firestore = useFirestore();

  const [nameFilter, setNameFilter] = useState("");
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [gridCols, setGridCols] = useState<'3' | '4' | '5'>('4');
  const [productionToTransfer, setProductionToTransfer] = useState<Production | null>(null);

  const { productions, updateProductStock, locations, isMultiLocation, loading: inventoryLoading, userData } = inventoryContext || { productions: [], updateProductStock: () => {}, locations: [], isMultiLocation: false, loading: true, userData: null };


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
    if (!firestore || !userData) return;
    
    const newProduction: Omit<Production, 'id'> = {
      date: new Date().toISOString().split('T')[0],
      productName: newProductionData.productName,
      quantity: newProductionData.quantity,
      registeredBy: userData.name || 'Desconhecido',
      location: newProductionData.location,
      status: 'Concluído'
    };

    const productionsRef = collection(firestore, `productions`);
    addDoc(productionsRef, newProduction);
    
    toast({
        title: "Produção Registrada",
        description: `O registo de ${newProduction.quantity} unidades de ${newProduction.productName} foi criado.`,
    });
  };

  const handleConfirmTransfer = () => {
    if (!productionToTransfer || !firestore) return;

    updateProductStock(productionToTransfer.productName, productionToTransfer.quantity, productionToTransfer.location);

    const prodDocRef = doc(firestore, `productions`, productionToTransfer.id);
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
    return result;
  }, [productions, nameFilter]);

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

    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl md:text-3xl font-headline font-bold">Produção</h1>
                <p className="text-sm font-medium text-slate-500 mt-1">
                    Visualize e registre a produção de novos itens.
                </p>
            </div>
        </div>

        <div className="py-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <Input
                  placeholder="Filtrar por nome do produto..."
                  value={nameFilter}
                  onChange={(event) => setNameFilter(event.target.value)}
                  className="w-full md:max-w-sm shadow-lg h-12 text-sm"
                />
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
        <ProductionDataTable columns={[]} data={filteredProductions} />
      ) : (
        <div className={cn(
            "grid gap-2 sm:gap-4",
            gridCols === '3' && "grid-cols-2 sm:grid-cols-3",
            gridCols === '4' && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4",
            gridCols === '5' && "grid-cols-3 sm:grid-cols-4 md:grid-cols-5",
        )}>
            {filteredProductions.map(production => (
                <ProductionCard 
                    key={production.id}
                    production={production}
                    locations={locations}
                    isMultiLocation={isMultiLocation}
                    onTransfer={() => setProductionToTransfer(production)}
                    viewMode={gridCols === '5' ? 'condensed' : 'normal'}
                />
            ))}
        </div>
      )}

      <AddProductionDialog onAddProduction={handleAddProduction} triggerType="fab" />
    </div>
    </>
  );
}
