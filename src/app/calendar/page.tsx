
"use client";

import { useState, useContext } from 'react';
import { CustomCalendar } from '@/components/calendar/page';
import { InventoryContext } from '@/context/inventory-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Order, Location } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function CalendarPage() {
  const { orders, locations, isMultiLocation, loading } = useContext(InventoryContext) || { orders: [], locations: [], isMultiLocation: false, loading: true };
  const [selectedLocation, setSelectedLocation] = useState('all');

  const filteredOrders = orders.filter(order => {
    if (!order.deliveryDate) return false;
    if (selectedLocation === 'all') return true;
    return order.location === selectedLocation;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20 animate-in fade-in duration-500">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold">Calendário de Produção</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">
              Visualize as datas de entrega das encomendas de produção.
            </p>
          </div>
           {isMultiLocation && (
              <Select onValueChange={setSelectedLocation} defaultValue="all">
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filtrar por Localização" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Localizações</SelectItem>
                  {locations.map((loc: Location) => (
                      <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
        </div>
      <Card className="shadow-lg">
        <CardContent className="p-4 sm:p-6">
          <CustomCalendar events={filteredOrders} />
        </CardContent>
      </Card>
    </div>
  );
}