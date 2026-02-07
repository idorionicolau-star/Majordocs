

"use client";

import { useState, useMemo, useContext, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import type { Order, Sale, ProductionLog, ModulePermission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Filter, List, LayoutGrid, ChevronDown, Lock, Trash2, PlusCircle, Plus, Printer, Download } from "lucide-react";
import { AddOrderDialog, AddOrderFormValues } from "@/components/orders/add-order-dialog";
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
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";


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

  const { orders, sales, companyId, loading: inventoryLoading, user, canEdit, deleteOrder, clearOrders, addNotification, addProductionLog, companyData } = inventoryContext || { orders: [], sales: [], companyId: null, loading: true, user: null, canEdit: () => false, deleteOrder: () => { }, clearOrders: async () => { }, addNotification: () => { }, addProductionLog: () => { }, companyData: null };

  const canEditOrders = canEdit('orders');
  const isAdmin = user?.role === 'Admin';


  useEffect(() => {
    if (searchParams.get('action') === 'add' && canEditOrders) {
      setAddDialogOpen(true);
    }
  }, [searchParams, canEditOrders]);


  const handleAddOrder = async (formData: AddOrderFormValues) => {
    if (!firestore || !companyId || !user) return;

    const subtotal = formData.unitPrice * formData.quantity;
    const totalValue = subtotal; // Simplified total for an order

    let amountPaid = totalValue;
    if (formData.paymentOption === 'partial') {
      const value = formData.partialPaymentValue || 0;
      if (formData.partialPaymentType === 'percentage') {
        const percentageValue = totalValue * (value / 100);
        amountPaid = Math.min(percentageValue, totalValue);
      } else {
        amountPaid = Math.min(value, totalValue);
      }
    }


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
          totalValue: totalValue,
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
          subtotal: subtotal,
          totalValue: totalValue,
          amountPaid: amountPaid,
          soldBy: user.username,
          guideNumber: guideNumber,
          location: formData.location,
          status: 'Pago', // Marked as paid to reserve, but not yet 'picked up'
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

  const handlePrintReport = () => {
    const printWindow = window.open('', '', 'height=800,width=800');
    if (printWindow) {
      printWindow.document.write('<!DOCTYPE html><html><head><title>Relatório de Encomendas</title>');
      printWindow.document.write(`
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&family=Space+Grotesk:wght@400;700&display=swap" rel="stylesheet">
            `);
      printWindow.document.write(`
                <style>
                    body { font-family: 'PT Sans', sans-serif; line-height: 1.6; color: #333; margin: 2rem; }
                    .container { max-width: 1000px; margin: auto; padding: 2rem; border: 1px solid #eee; border-radius: 8px; }
                    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 1rem; margin-bottom: 2rem; }
                    .header h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; color: #3498db; margin: 0; }
                    .logo { display: flex; flex-direction: column; align-items: flex-start; }
                    .logo span { font-family: 'Space Grotesk', sans-serif; font-size: 1.5rem; font-weight: bold; color: #3498db; }
                    table { width: 100%; border-collapse: collapse; margin-top: 2rem; font-size: 10px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f9fafb; font-family: 'Space Grotesk', sans-serif; }
                    .footer { text-align: center; margin-top: 3rem; font-size: 0.8rem; color: #999; }
                    @page { size: A4 landscape; margin: 0.5in; }
                    @media print {
                      body { margin: 0; -webkit-print-color-adjust: exact; }
                      .no-print { display: none; }
                      .container { border: none; box-shadow: none; }
                    }
                </style>
            `);
      printWindow.document.write('</head><body><div class="container">');
      printWindow.document.write(`
                <div class="header">
                     <div class="logo">
                        <span>${companyData?.name || 'MajorStockX'}</span>
                    </div>
                    <h1>Relatório de Encomendas</h1>
                </div>
                <h2>Data: ${new Date().toLocaleDateString('pt-BR')}</h2>
            `);

      printWindow.document.write('<table><thead><tr><th>Produto</th><th>Cliente</th><th>Data Entrega</th><th>Qtd.</th><th>Valor Total</th><th>Status</th></tr></thead><tbody>');
      filteredOrders.forEach(order => {
        printWindow.document.write(`
                    <tr>
                        <td>${order.productName}</td>
                        <td>${order.clientName || 'N/A'}</td>
                        <td>${order.deliveryDate ? format(new Date(order.deliveryDate), 'dd/MM/yyyy') : 'N/A'}</td>
                        <td>${order.quantity} ${order.unit}</td>
                        <td>${order.totalValue ? formatCurrency(order.totalValue) : 'N/A'}</td>
                        <td>${order.status}</td>
                    </tr>
                `);
      });
      printWindow.document.write('</tbody></table>');

      printWindow.document.write(`<div class="footer"><p>${companyData?.name || 'MajorStockX'} &copy; ${new Date().getFullYear()}</p></div>`);
      printWindow.document.write('</div></body></html>');
      printWindow.document.close();

      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 500);
    }
  };

  const handleDownloadPdfReport = async () => {
    const { pdf } = await import('@react-pdf/renderer');
    const { OrdersPDF } = await import('@/components/orders/OrdersPDF');

    const doc = <OrdersPDF
      orders={filteredOrders}
      company={companyData || null}
    />;

    const blob = await pdf(doc).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Relatorio_Encomendas_${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Download Concluído",
      description: "O relatório de encomendas foi descarregado.",
    });
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
            <AlertDialogAction onClick={handleClear} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
          <div className="flex items-center gap-2">
            <Button onClick={handleDownloadPdfReport} variant="outline" className="h-12">
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
            <Button onClick={handlePrintReport} variant="outline" className="h-12">
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        <Card className="glass-panel p-4 mb-6 border-none">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <Input
                placeholder="Filtrar por produto ou cliente..."
                value={nameFilter}
                onChange={(event) => setNameFilter(event.target.value)}
                className="w-full md:max-w-sm shadow-lg h-12 text-sm bg-background/50"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="shadow-lg h-12 w-full sm:w-auto bg-background/50">
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
        </Card>

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredOrders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onUpdateStatus={handleUpdateOrderStatus}
              onAddProductionLog={addProductionLog}
              onDeleteOrder={deleteOrder}
              canEdit={canEditOrders}
              associatedSale={sales.find(s => s.orderId === order.id)}
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
