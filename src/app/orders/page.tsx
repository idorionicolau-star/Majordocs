"use client";


import { useState, useMemo, useContext, useEffect } from "react";
import { useSearchParams } from 'next/navigation';
import { useFuse } from '@/hooks/use-fuse';
import type { Order, Sale, ProductionLog } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Filter, Printer, Download, Plus } from "lucide-react";
import { AddOrderDialog, AddOrderFormValues } from "@/components/orders/add-order-dialog";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { OrderCard } from "@/components/orders/order-card";
import { InventoryContext } from "@/context/inventory-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore } from '@/firebase/provider';
import { collection, doc, updateDoc, arrayUnion, runTransaction, increment } from "firebase/firestore";
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
import { VirtuosoGrid } from 'react-virtuoso';
import { forwardRef } from 'react';


export default function OrdersPage() {
  const searchParams = useSearchParams();
  const [nameFilter, setNameFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);

  // Auto-Production Confirmation State
  const [pendingConclusionOrder, setPendingConclusionOrder] = useState<Order | null>(null);
  const [showAutoProductionConfirm, setShowAutoProductionConfirm] = useState(false);

  const { toast } = useToast();
  const inventoryContext = useContext(InventoryContext);
  const firestore = useFirestore();

  const { orders, companyId, loading: inventoryLoading, user, canEdit, addNotification, addProductionLog, deleteOrder, companyData, confirmAction } = inventoryContext || { orders: [], sales: [], companyId: null, loading: true, user: null, canEdit: () => false, addNotification: () => { }, addProductionLog: () => { }, deleteOrder: () => { }, companyData: null, confirmAction: () => { } };

  const canEditOrders = canEdit('orders');


  useEffect(() => {
    if (searchParams.get('action') === 'add' && canEditOrders) {
      setAddDialogOpen(true);
    }
  }, [searchParams, canEditOrders]);


  const handleAddOrder = async (formData: AddOrderFormValues) => {
    if (!firestore || !companyId || !user) return;

    const subtotal = formData.unitPrice * formData.quantity;
    const totalValue = subtotal;

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

        // Check Product Stock for Reservation
        let productRef: any = null;
        let productData: any = null;

        if (formData.productId) {
          const pRef = doc(firestore, `companies/${companyId}/products`, formData.productId);
          const pDoc = await transaction.get(pRef);
          if (pDoc.exists()) {
            productRef = pRef;
            productData = pDoc.data();

            const currentStock = productData.stock || 0;
            const currentReserved = productData.reservedStock || 0;
            const available = currentStock - currentReserved;

            if (available < formData.quantity) {
              throw new Error(`Stock insuficiente. Disponível: ${available} ${formData.unit}`);
            }
          }
        }

        // --- All WRITES after ---

        // 1. Create the Order
        const newOrder: Omit<Order, 'id'> = {
          productId: formData.productId || formData.productName,
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
          productId: formData.productId || formData.productName,
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
          status: 'Pago',
          documentType: 'Encomenda',
          clientName: formData.clientName,
        };
        transaction.set(saleRef, newSale);

        // 3. Update company saleCounter
        transaction.update(companyRef, { saleCounter: newSaleCounter });

        // 4. Update Product Reserved Stock
        if (productRef && productData) {
          transaction.update(productRef, {
            reservedStock: (productData.reservedStock || 0) + formData.quantity,
            lastUpdated: new Date().toISOString()
          });
        }
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


  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'Pendente' | 'Em produção' | 'Concluída') => {
    if (!firestore || !companyId || !user) return;

    let orderToUpdate = orders.find(o => o.id === orderId);

    if (orderToUpdate) {
      if (newStatus === 'Concluída' && orderToUpdate.quantityProduced < orderToUpdate.quantity) {
        setPendingConclusionOrder(orderToUpdate);
        setShowAutoProductionConfirm(true);
        return;
      }

      let update: Partial<Order> = { status: newStatus };
      if (newStatus === 'Em produção' && !orderToUpdate.productionStartDate) {
        update.productionStartDate = new Date().toISOString();
      }

      const orderDocRef = doc(firestore, `companies/${companyId}/orders`, orderId);
      await updateDoc(orderDocRef, update);

      if (newStatus === 'Concluída') {
        toast({
          title: "Encomenda Concluída",
          description: `A produção de ${orderToUpdate.quantity} ${orderToUpdate.unit} de "${orderToUpdate.productName}" está completa.`
        });
      } else {
        toast({
          title: "Status da Encomenda Atualizado",
          description: `A encomenda está agora "${newStatus}".`
        });
      }
    }
  };

  const confirmAutoProduction = async () => {
    if (!firestore || !companyId || !user || !pendingConclusionOrder) return;

    try {
      const missingQty = pendingConclusionOrder.quantity - pendingConclusionOrder.quantityProduced;
      const orderRef = doc(firestore, `companies/${companyId}/orders`, pendingConclusionOrder.id);
      const productRef = doc(firestore, `companies/${companyId}/products`, pendingConclusionOrder.productId);
      const productionsRef = collection(firestore, `companies/${companyId}/productions`);

      let productExists = false;
      let productName = pendingConclusionOrder.productName;

      await runTransaction(firestore, async (transaction) => {
        const productSnap = await transaction.get(productRef);
        productExists = productSnap.exists();

        if (productExists) {
          productName = productSnap.data()?.name || productName;
        }

        const newLog: ProductionLog = {
          id: `log-${Date.now()}`,
          date: new Date().toISOString(),
          quantity: missingQty,
          notes: productExists
            ? "Produção automática na conclusão da encomenda."
            : "Produção automática (Aviso: Produto não associado ao stock).",
          registeredBy: user.username || 'Sistema',
        };

        transaction.update(orderRef, {
          status: 'Concluída',
          quantityProduced: pendingConclusionOrder.quantity,
          productionLogs: arrayUnion(newLog)
        });

        const newProductionRef = doc(productionsRef);
        transaction.set(newProductionRef, {
          date: new Date().toISOString().split('T')[0],
          productName: productName,
          quantity: missingQty,
          unit: pendingConclusionOrder.unit,
          location: pendingConclusionOrder.location,
          registeredBy: user.username || 'Sistema',
          status: 'Concluído',
          orderId: pendingConclusionOrder.id
        });

        if (productExists) {
          transaction.update(productRef, {
            stock: increment(missingQty)
          });
        }
      });

      if (productExists) {
        toast({
          title: "Produção Concluída e Stock Atualizado",
          description: `Foram produzidas e adicionadas ao stock ${missingQty} unidades de "${productName}".`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Produção Concluída (Sem Stock)",
          description: `A encomenda foi concluída, mas o produto associado não foi encontrado no stock para atualização.`,
        });
      }

    } catch (error: any) {
      console.error("Error confirming auto-production:", error);
      toast({
        variant: "destructive",
        title: "Erro na Auto-Produção",
        description: error.message || "Não foi possível concluir a produção automática.",
      });
    } finally {
      setShowAutoProductionConfirm(false);
      setPendingConclusionOrder(null);
    }
  };


  const statusFilteredOrders = useMemo(() => {
    let result = orders;
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    return result;
  }, [orders, statusFilter]);

  const filteredOrders = useFuse(statusFilteredOrders, nameFilter, { keys: ['productName', 'clientName'] });


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

  const handleDeleteOrder = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    if (confirmAction) {
      confirmAction(async () => {
        try {
          await deleteOrder(orderId);
          toast({ title: 'Encomenda Apagada', description: `A encomenda de ${order.clientName} foi movida para a lixeira.` });
        } catch (error: any) {
          // Error handled in context mostly, but good to catch
        }
      }, "Apagar Encomenda", `Tem a certeza que deseja apagar a encomenda de "${order.clientName}" (${order.productName})? Esta ação moverá a encomenda para a lixeira e reporá o stock reservado.`);
    } else {
      // Fallback
      if (window.confirm(`Tem a certeza que deseja apagar a encomenda de "${order.clientName}"?`)) {
        try {
          await deleteOrder(orderId);
        } catch (e) { }
      }
    }
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
      <AlertDialog open={showAutoProductionConfirm} onOpenChange={setShowAutoProductionConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Produção Incompleta</AlertDialogTitle>
            <AlertDialogDescription>
              A encomenda de **{pendingConclusionOrder?.productName}** tem apenas **{pendingConclusionOrder?.quantityProduced}** de **{pendingConclusionOrder?.quantity}** unidades produzidas.
              <br /><br />
              Deseja registar automaticamente a produção das **{pendingConclusionOrder && (pendingConclusionOrder.quantity - pendingConclusionOrder.quantityProduced)}** unidades restantes e adicionar ao stock?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowAutoProductionConfirm(false); setPendingConclusionOrder(null); }}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAutoProduction} className="bg-emerald-600 hover:bg-emerald-700">
              Sim, Produzir e Finalizar
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

        <div>
          {filteredOrders.length > 0 ? (
            <VirtuosoGrid
              useWindowScroll
              increaseViewportBy={500}
              data={filteredOrders}
              totalCount={filteredOrders.length}
              components={{
                List: (() => {
                  const List = forwardRef<HTMLDivElement>((props, ref) => (
                    <div
                      {...props}
                      ref={ref}
                      className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-20"
                    />
                  ));
                  List.displayName = 'OrdersVirtuosoList';
                  return List;
                })(),
                Item: (() => {
                  const Item = forwardRef<HTMLDivElement>((props, ref) => <div {...props} ref={ref} className="h-full" />);
                  Item.displayName = 'OrdersVirtuosoItem';
                  return Item;
                })()
              }}
              itemContent={(index, order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateOrderStatus}
                  onAddProductionLog={addProductionLog}
                  onDeleteOrder={handleDeleteOrder}
                  canEdit={canEditOrders}
                />
              )}
            />
          ) : (
            <div className="text-center text-muted-foreground py-10">
              <p>Nenhuma encomenda encontrada com os filtros atuais.</p>
            </div>
          )}
        </div>

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
