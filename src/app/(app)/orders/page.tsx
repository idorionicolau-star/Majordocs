
"use client";

import { useState, useMemo, useContext } from "react";
import { orders as initialOrders, currentUser } from "@/lib/data";
import type { Order, Product, ProductionLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Filter, List, LayoutGrid, ChevronDown } from "lucide-react";
import { AddOrderDialog } from "@/components/orders/add-order-dialog";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { OrderCard } from "@/components/orders/order-card";
import { cn } from "@/lib/utils";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'grid'>('grid'); // 'list' view to be implemented
  const { toast } = useToast();
  const inventoryContext = useContext(InventoryContext);

  const { loading: inventoryLoading } = inventoryContext || { loading: true };


  const handleAddOrder = (newOrderData: Omit<Order, 'id' | 'status' | 'quantityProduced' | 'productionLogs' | 'productionStartDate' | 'productId'>) => {
    const order: Order = {
      ...newOrderData,
      productId: newOrderData.productName, // Temporarily use name as ID-like ref
      id: `ORD${(orders.length + 1).toString().padStart(3, '0')}`,
      status: 'Pendente',
      quantityProduced: 0,
      productionLogs: [],
      productionStartDate: null,
    };
    setOrders([order, ...orders]);
      toast({
        title: "Encomenda Registrada",
        description: `A encomenda de ${order.quantity} ${order.unit} de ${order.productName} foi registrada.`,
    })
  };
  
  const handleUpdateOrderStatus = (orderId: string, newStatus: 'Pendente' | 'Em produção' | 'Concluída') => {
    let orderToUpdate: Order | undefined;
    
    const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
            orderToUpdate = order;
            let update: Partial<Order> = { status: newStatus };
            if (newStatus === 'Em produção' && !order.productionStartDate) {
                update.productionStartDate = new Date().toISOString();
            }
            return { ...order, ...update };
        }
        return order;
    });
    
    setOrders(updatedOrders);

    if (newStatus === 'Concluída' && orderToUpdate) {
        toast({
            title: "Encomenda Concluída",
            description: `A produção de ${orderToUpdate.quantity} ${orderToUpdate.unit} de "${orderToUpdate.productName}" foi concluída. O stock foi atualizado.`
        });
    } else {
         toast({
            title: "Status da Encomenda Atualizado",
            description: `A encomenda #${orderToUpdate?.id.slice(-3)} está agora "${newStatus}".`
        });
    }
  };

  const handleAddProductionLog = (orderId: string, logData: { quantity: number; notes?: string }) => {
    let orderToUpdate: Order | undefined;

    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        orderToUpdate = order;
        const newLog: ProductionLog = {
          id: `log-${Date.now()}`,
          date: new Date().toISOString(),
          quantity: logData.quantity,
          notes: logData.notes,
          registeredBy: currentUser.name,
        };
        const newQuantityProduced = order.quantityProduced + logData.quantity;

        return {
          ...order,
          quantityProduced: newQuantityProduced,
          productionLogs: [...order.productionLogs, newLog],
        };
      }
      return order;
    });

    setOrders(updatedOrders);

    toast({
      title: "Registo de Produção Adicionado",
      description: `${logData.quantity} unidades de "${orderToUpdate?.productName}" foram registadas.`,
    });
  };


  const filteredOrders = useMemo(() => {
    let result = orders;
    if (nameFilter) {
      result = result.filter(o => 
        o.productName.toLowerCase().includes(nameFilter.toLowerCase()) ||
        (o.clientName && o.clientName.toLowerCase().includes(nameFilter.toLowerCase()))
      );
    }
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    return result;
  }, [orders, nameFilter, statusFilter]);

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
      <div className="flex flex-col gap-6 pb-20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                  <h1 className="text-2xl md:text-3xl font-headline font-bold">Encomendas de Produção</h1>
                  <p className="text-muted-foreground">
                      Acompanhe e gerencie as encomendas pendentes.
                  </p>
              </div>
          </div>
          
          <div className="py-4 space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
                <Input
                  placeholder="Filtrar por produto ou cliente..."
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
                        <DropdownMenuCheckboxItem checked={statusFilter === 'Pendente'} onCheckedChange={() => setStatusFilter('Pendente')}>Pendentes</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === 'Em produção'} onCheckedChange={() => setStatusFilter('Em produção')}>Em produção</DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem checked={statusFilter === 'Concluída'} onCheckedChange={() => setStatusFilter('Concluída')}>Concluídas</DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredOrders.map(order => (
                <OrderCard 
                    key={order.id}
                    order={order}
                    onUpdateStatus={handleUpdateOrderStatus}
                    onAddProductionLog={handleAddProductionLog}
                />
            ))}
            {filteredOrders.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                    <p>Nenhuma encomenda encontrada com os filtros atuais.</p>
                </div>
            )}
        </div>

      </div>
      <AddOrderDialog 
        onAddOrder={handleAddOrder}
        triggerType="fab"
      />
    </>
  );
}
