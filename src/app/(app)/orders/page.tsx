
"use client";

import { useState, useMemo } from "react";
import { orders as initialOrders, products as initialProducts } from "@/lib/data";
import type { Order, Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Filter, List, LayoutGrid, ChevronDown } from "lucide-react";
import { AddOrderDialog } from "@/components/orders/add-order-dialog";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { OrderCard } from "@/components/orders/order-card";
import { cn } from "@/lib/utils";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'grid'>('grid'); // 'list' view to be implemented
  const { toast } = useToast();

  const handleAddOrder = (newOrderData: Omit<Order, 'id' | 'status'>) => {
    const order: Order = {
      ...newOrderData,
      id: `ORD${(orders.length + 1).toString().padStart(3, '0')}`,
      status: 'Pendente',
    };
    setOrders([order, ...orders]);
  };
  
  const handleUpdateOrderStatus = (orderId: string, newStatus: 'Pendente' | 'Em produção' | 'Concluída') => {
    let orderToUpdate: Order | undefined;
    
    const updatedOrders = orders.map(order => {
        if (order.id === orderId) {
            orderToUpdate = order;
            return { ...order, status: newStatus };
        }
        return order;
    });
    
    setOrders(updatedOrders);

    if (newStatus === 'Concluída' && orderToUpdate) {
        // Here you would update the product stock.
        // For now, let's just show a toast.
        const product = products.find(p => p.id === orderToUpdate!.productId);
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
        products={products}
        onAddOrder={handleAddOrder}
        triggerType="fab"
      />
    </>
  );
}
