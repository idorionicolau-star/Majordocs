

"use client";

import { useState, useMemo, useContext, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import type { Order, Sale, ProductionLog, ModulePermission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Filter, List, LayoutGrid, ChevronDown, Lock, Trash2, PlusCircle, Plus } from "lucide-react";
import { AddOrderDialog } from "@/components/orders/add-order-dialog";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { OrderCard } from "@/components/orders/order-card";
import { cn } from "@/lib/utils";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore } from '@/firebase/provider';
import { collection, addDoc, doc, updateDoc, arrayUnion, runTransaction } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
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

export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'grid'>('grid'); // 'list' view to be implemented
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { toast } = useToast();
  const inventoryContext = useContext(InventoryContext);
  const firestore = useFirestore();

  const { orders, companyId, loading: inventoryLoading, user, canEdit, deleteOrder, clearOrders, addNotification, addProductionLog } = inventoryContext || { orders: [], companyId: null, loading: true, user: null, canEdit: () => false, deleteOrder: () => {}, clearOrders: async () => {}, addNotification: () => {}, addProductionLog: () => {} };

  const canEditOrders = canEdit('orders');
  const isAdmin = user?.role === 'Admin';


  useEffect(() => {
    if (searchParams.get('action') === 'add' && canEditOrders) {
      setAddDialogOpen(true);
    }
  }, [searchParams, canEditOrders]);


  const handleAddOrder = async (formData: { productName: string; quantity: number; unit?: 'un' | 'm²' | 'm' | 'cj' | 'outro'; clientName?: string; deliveryDate?: Date; location?: string; unitPrice: number; }) => {
    if (!firestore || !companyId || !user) return;

    try {
        const orderRef = doc(collection(firestore, `companies/${companyId}/orders`));
        const saleRef = doc(collection(firestore, `companies/${companyId}/sales`));
        const companyRef = doc(firestore, `companies/${companyId}`);

        await runTransaction(firestore, async (transaction) => {
            // --- READS FIRST ---
            const companyDoc = await transaction.get(companyRef);
            if (!companyDoc.exists()) {
                throw new Error("Empresa não encontrada.");
            }

            // --- All WRITES after ---

            // 1. Create the Order
            const newOrder: Omit<Order, 'id'> = {
                productId: formData.productName,
                productName: formData.productName,
                quantity: formData.quantity,
                unit: formData.unit!,
                clientName: formData.clientName,
                deliveryDate: formData.deliveryDate?.toISOString(),
                location: formData.location,
                unitPrice: formData.unitPrice,
                totalValue: formData.unitPrice * formData.quantity,
                status: 'Pendente',
                quantityProduced: 0,
                productionLogs: [],
                productionStartDate: null,
            };
            transaction.set(orderRef, newOrder);

            // 2. Create the associated Sale
            const newSaleCounter = (companyDoc.data().saleCounter || 0) + 1;
            const guideNumber = `ENC-${String(newSaleCounter).padStart(6, '0')}`;

            const newSale: Omit<Sale, 'id'> = {
                orderId: orderRef.id,
                date: new Date().toISOString(),
                productId: formData.productName,
                productName: formData.productName,
                quantity: formData.quantity,
                unit: formData.unit,
                unitPrice: formData.unitPrice,
                subtotal: formData.unitPrice * formData.quantity,
                totalValue: formData.unitPrice * formData.quantity,
                soldBy: user.username,
                guideNumber: guideNumber,
                location: formData.location,
                status: 'Pago',
                documentType: 'Encomenda',
                clientName: formData.clientName,
            };
            transaction.set(saleRef, newSale);

            // 3. Update company saleCounter
            transaction.update(companyRef, { saleCounter: newSaleCounter });
        });

        toast({
            title: "Encomenda Registada",
            description: `A encomenda de ${formData.quantity} ${formData.unit} de ${formData.productName} foi registada e uma venda foi criada.`,
        });
        
        if (addNotification) {
            addNotification({
                type: 'order',
                message: `Nova encomenda para ${formData.productName} registada.`,
                href: `/orders?id=${orderRef.id}`,
            });
        }
    } catch (error: any) {
        console.error("Error creating order and sale:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Registar Encomenda",
            description: error.message || "Não foi possível criar a encomenda e a venda associada.",
        });
    }
};

  
  const handleUpdateOrderStatus = (orderId: string, newStatus: 'Pendente' | 'Em produção' | 'Concluída') => {
    if (!firestore || !companyId) return;
    
    let orderToUpdate = orders.find(o => o.id === orderId);
    
    if (orderToUpdate) {
        let update: Partial<Order> = { status: newStatus };
        if (newStatus === 'Em produção' && !orderToUpdate.productionStartDate) {
            update.productionStartDate = new Date().toISOString();
        }
        
        const orderDocRef = doc(firestore, `companies/${companyId}/orders`, orderId);
        updateDoc(orderDocRef, update);

        if (newStatus === 'Concluída' && orderToUpdate) {
            // Note: Stock is now updated via transferring production records, not here.
            toast({
                title: "Encomenda Concluída",
                description: `A produção de ${orderToUpdate.quantity} ${orderToUpdate.unit} de "${orderToUpdate.productName}" foi concluída. Transfira os registos de produção para atualizar o stock.`
            });
        } else {
            toast({
                title: "Status da Encomenda Atualizado",
                description: `A encomenda está agora "${newStatus}".`
            });
        }
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
  
  const handleClear = async () => {
    if (clearOrders) {
      await clearOrders();
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
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem a certeza absoluta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível e irá apagar permanentemente **todas** as encomendas.
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

      <div className="flex flex-col gap-6 pb-20">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
              <div>
                  <h1 className="text-2xl md:text-3xl font-headline font-bold">Encomendas de Produção</h1>
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
                    onAddProductionLog={addProductionLog}
                    onDeleteOrder={deleteOrder}
                    canEdit={canEditOrders}
                />
            ))}
            {filteredOrders.length === 0 && (
                <div className="col-span-full text-center text-muted-foreground py-10">
                    <p>Nenhuma encomenda encontrada com os filtros atuais.</p>
                </div>
            )}
        </div>

        {isAdmin && (
          <Card className="mt-8">
            <div className="p-6 flex flex-col items-center text-center">
              <h3 className="font-semibold mb-2">Zona de Administrador</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md">
                Esta ação é irreversível e irá apagar permanentemente **todas** as encomendas.
              </p>
              <Button variant="destructive" onClick={() => setShowClearConfirm(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Limpar Encomendas
              </Button>
            </div>
          </Card>
        )}

      </div>
      {canEditOrders && (
        <>
            <AddOrderDialog
                open={isAddDialogOpen}
                onOpenChange={setAddDialogOpen}
                onAddOrder={handleAddOrder}
            />
             <Button
                onClick={() => setAddDialogOpen(true)}
                className="fixed bottom-24 right-6 h-16 w-16 rounded-full shadow-lg z-20"
                size="icon"
            >
                <Plus className="h-6 w-6" />
                <span className="sr-only">Adicionar Encomenda</span>
            </Button>
        </>
      )}
    </>
  );
}
