
'use client';

import { useState, useMemo, useContext } from 'react';
import { InventoryContext } from '@/context/inventory-context';
import { useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { StockMovement, Location } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MovementsDataTable } from '@/components/inventory/history/data-table';
import { columns } from '@/components/inventory/history/columns';

type FilterType = 'all' | 'deficits' | 'transfers';

export default function InventoryHistoryPage() {
  const { companyId, loading, locations } = useContext(InventoryContext) || { companyId: null, loading: true, locations: [] };
  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const stockMovementsRef = useMemoFirebase(() => {
    if (!companyId) return null;
    return collection(companyId, `companies/${companyId}/stockMovements`);
  }, [companyId]);

  const { data: movements, isLoading } = useCollection<StockMovement>(stockMovementsRef);

  const filteredMovements = useMemo(() => {
    if (!movements) return [];
    let filtered = movements;

    if (filter === 'deficits') {
      filtered = filtered.filter(m => m.type === 'ADJUSTMENT' && m.quantity < 0);
    } else if (filter === 'transfers') {
      filtered = filtered.filter(m => m.type === 'TRANSFER');
    }

    if (searchQuery) {
        const lowerCaseQuery = searchQuery.toLowerCase();
        filtered = filtered.filter(m => 
            m.productName.toLowerCase().includes(lowerCaseQuery) ||
            m.userName.toLowerCase().includes(lowerCaseQuery) ||
            m.reason.toLowerCase().includes(lowerCaseQuery)
        );
    }
    
    // Sort by timestamp descending
    return filtered.sort((a, b) => {
        const dateA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(0);
        const dateB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });

  }, [movements, filter, searchQuery]);
  
  const locationMap = useMemo(() => {
    return locations.reduce((acc, loc) => {
      acc[loc.id] = loc.name;
      return acc;
    }, {} as Record<string, string>);
  }, [locations]);

  if (loading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl md:text-3xl font-headline font-bold">Histórico de Movimentos</h1>
        <p className="text-muted-foreground">
          Rastreie todas as entradas, saídas, transferências e ajustes de stock.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
         <div className="flex items-center gap-2">
            <Button variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>Todos</Button>
            <Button variant={filter === 'deficits' ? 'default' : 'outline'} onClick={() => setFilter('deficits')}>Défices</Button>
            <Button variant={filter === 'transfers' ? 'default' : 'outline'} onClick={() => setFilter('transfers')}>Transferências</Button>
         </div>
         <Input
            placeholder="Pesquisar por produto, utilizador ou motivo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:max-w-xs"
        />
      </div>

      <MovementsDataTable columns={columns({ locationMap })} data={filteredMovements} />
    </div>
  );
}
