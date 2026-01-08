
"use client";

import { useState, useEffect, useMemo } from "react";
import { productions as initialProductions, products } from "@/lib/data";
import { columns } from "@/components/production/columns";
import { ProductionDataTable } from "@/components/production/data-table";
import { AddProductionDialog } from "@/components/production/add-production-dialog";
import type { Production, Location } from "@/lib/types";
import { currentUser } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { List, LayoutGrid, ChevronDown } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ProductionCard } from "@/components/production/production-card";
import { cn } from "@/lib/utils";


export default function ProductionPage() {
  const [productions, setProductions] = useState<Production[]>(initialProductions);
  const [locations, setLocations] = useState<Location[]>([]);
  const [nameFilter, setNameFilter] = useState("");
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [gridCols, setGridCols] = useState<'3' | '4' | '5'>('4');


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedLocations = localStorage.getItem('majorstockx-locations');
      if (storedLocations) {
        setLocations(JSON.parse(storedLocations));
      }
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

  const handleAddProduction = (newProductionData: { productId: string; quantity: number; location?: string; }) => {
    const product = products.find(p => p.id === newProductionData.productId);
    if (!product) return;

    const newProduction: Production = {
      id: `PRODREC${(productions.length + 1).toString().padStart(3, '0')}`,
      date: new Date().toISOString().split('T')[0],
      productName: product.name,
      quantity: newProductionData.quantity,
      registeredBy: currentUser.name,
      location: newProductionData.location,
    };
    setProductions([newProduction, ...productions]);
  };

  const filteredProductions = useMemo(() => {
    let result = productions;

    if (nameFilter) {
      result = result.filter(p => p.productName.toLowerCase().includes(nameFilter.toLowerCase()));
    }
    
    return result;
  }, [productions, nameFilter]);


  return (
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
        <ProductionDataTable columns={columns({ locations })} data={filteredProductions} />
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
                    isMultiLocation={locations.length > 0}
                    viewMode={gridCols === '5' ? 'condensed' : 'normal'}
                />
            ))}
        </div>
      )}

      <AddProductionDialog products={products} onAddProduction={handleAddProduction} triggerType="fab" />
    </div>
  );
}
