
"use client";

import { useState, useMemo, useContext, useEffect } from "react";
import { HistoryDataTable } from "@/components/inventory/history/data-table";
import { columns } from "@/components/inventory/history/columns";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import type { StockMovement } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, Timestamp } from "firebase/firestore";
import { Input } from "@/components/ui/input";

export default function InventoryHistoryPage() {
  const { companyId, locations, loading: contextLoading } = useContext(InventoryContext) || {};
  const firestore = useFirestore();

  const [searchFilter, setSearchFilter] = useState("");

  const stockMovementsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    // Removed orderBy from here to avoid needing a composite index for now.
    // Sorting will be handled client-side.
    return collection(firestore, `companies/${companyId}/stockMovements`);
  }, [firestore, companyId]);

  const { data: movements, isLoading: movementsLoading } = useCollection<StockMovement>(stockMovementsCollectionRef);
  
  const locationMap = useMemo(() => {
    const map = new Map<string, string>();
    locations?.forEach(loc => map.set(loc.id, loc.name));
    return map;
  }, [locations]);
  
  const filteredMovements = useMemo(() => {
    if (!movements) return [];
    let result = movements;

    if (searchFilter) {
      const lowerCaseFilter = searchFilter.toLowerCase();
      result = result.filter(m => 
        m.productName.toLowerCase().includes(lowerCaseFilter) ||
        (m.userName && m.userName.toLowerCase().includes(lowerCaseFilter)) ||
        m.reason.toLowerCase().includes(lowerCaseFilter)
      );
    }
    
    // Sort client-side
    return result.sort((a, b) => {
        const dateA = a.timestamp ? (a.timestamp as Timestamp).toMillis() : 0;
        const dateB = b.timestamp ? (b.timestamp as Timestamp).toMillis() : 0;
        return dateB - dateA;
    });
  }, [movements, searchFilter]);

  const isLoading = contextLoading || movementsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold">Histórico de Movimentos</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">
            Audite todas as entradas, saídas e transferências de stock.
          </p>
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-2">
         <Input
            placeholder="Pesquisar por produto, utilizador, motivo..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="h-12 text-sm"
        />
      </div>

      <HistoryDataTable 
        columns={columns({ locationMap })}
        data={filteredMovements}
      />
    </div>
  );
}
