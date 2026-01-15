
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
import { DatePicker } from "@/components/ui/date-picker";
import { startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
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

export default function InventoryHistoryPage() {
  const { companyId, locations, loading: contextLoading, user, clearStockMovements } = useContext(InventoryContext) || {};
  const firestore = useFirestore();
  const isAdmin = user?.role === 'Admin';
  const [showClearConfirm, setShowClearConfirm] = useState(false);


  const [searchFilter, setSearchFilter] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const stockMovementsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
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

    if (selectedDate) {
        const start = startOfDay(selectedDate);
        const end = endOfDay(selectedDate);
        result = result.filter(m => {
            if (!m.timestamp) return false;
            const moveDate = (m.timestamp as Timestamp).toDate();
            return isWithinInterval(moveDate, { start, end });
        });
    }

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
  }, [movements, searchFilter, selectedDate]);
  
  const handleClearHistory = async () => {
    if (clearStockMovements) {
      await clearStockMovements();
    }
    setShowClearConfirm(false);
  };

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
    <>
       <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e irá apagar permanentemente **todo** o histórico de movimentos de stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearHistory} variant="destructive">
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold">Histórico de Movimentos</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Audite todas as entradas, saídas e transferências de stock.
            </p>
          </div>
           {isAdmin && (
              <Button variant="destructive" onClick={() => setShowClearConfirm(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar Histórico
              </Button>
            )}
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <Input
              placeholder="Pesquisar por produto, utilizador, motivo..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-12 text-sm"
          />
          <DatePicker date={selectedDate} setDate={setSelectedDate} />
        </div>

        <HistoryDataTable 
          columns={columns({ locationMap })}
          data={filteredMovements}
        />
      </div>
    </>
  );
}
