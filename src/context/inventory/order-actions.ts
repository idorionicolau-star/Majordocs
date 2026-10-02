'use client';

import { useCallback } from 'react';
import type { Product, Sale, Order } from '@/lib/types';
import { collection, doc, getDocs, query, where, runTransaction, getDoc, serverTimestamp, DocumentReference, limit } from 'firebase/firestore';
import { ref } from "firebase/storage";
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { InventoryCore } from './core';
import { reservedToRelease } from '@/lib/order-stock';
import { resolveInventoryProductRef } from '@/lib/product-ref';

export function useOrderActions(core: InventoryCore) {
  const { isReadOnly, toast, ordersCollectionRef, firestore, companyId, user, assertOnline, ordersData, isMultiLocation, locations } = core;


  const deleteOrder = useCallback(async (orderId: string) => {
    if (isReadOnly) {
      toast({ variant: "destructive", title: "Conta em modo leitura", description: "Modo leitura activo — contacte o suporte para reactivar o acesso completo." });
      return;
    }
    if (!ordersCollectionRef || !firestore || !companyId) return;

    try {
      const orderRef = doc(ordersCollectionRef, orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Order;

        // Find the associated sale to soft-delete it too
        const salesRef = collection(firestore, `companies/${companyId}/sales`);
        const saleQuery = query(salesRef, where('orderId', '==', orderId), limit(1));
        const saleSnap = await getDocs(saleQuery);
        const associatedSaleRef = !saleSnap.empty ? saleSnap.docs[0].ref : null;

        // If order is pending or in production, we need to release the Reserved Stock
        // Concluída = já produzida mas ainda por entregar: a reserva continua presa até à entrega, por isso também se liberta
        if ((orderData.status === 'Pendente' || orderData.status === 'Em produção' || orderData.status === 'Concluída') && orderData.productId) {
          // ID do inventário, ID do catálogo ou nome → o produto do inventário (activo) nessa localização
          const resolvedProductRef: DocumentReference | null = await resolveInventoryProductRef(firestore, companyId, {
            productId: orderData.productId,
            productName: orderData.productName,
            location: orderData.location || 'Principal',
          });

          await runTransaction(firestore, async (transaction) => {
            if (resolvedProductRef) {
              const pDoc = await transaction.get(resolvedProductRef);
              if (pDoc.exists()) {
                const pData = pDoc.data() as Product;
                const currentReserved = pData.reservedStock || 0;
                const quantityToRelease = reservedToRelease(orderData);
                const newReserved = Math.max(0, currentReserved - quantityToRelease);

                transaction.update(resolvedProductRef, {
                  reservedStock: newReserved,
                  lastUpdated: new Date().toISOString()
                });
              }
            }
            // Soft delete the order
            transaction.update(orderRef, { deletedAt: new Date().toISOString() });
            // Also soft delete the associated sale
            if (associatedSaleRef) {
              transaction.update(associatedSaleRef, { deletedAt: new Date().toISOString(), deletedBy: user?.username || 'Sistema' });
            }
          });
        } else {
          // Standard soft delete for completed/delivered orders (stock was already handled)
          updateDocumentNonBlocking(orderRef, { deletedAt: new Date().toISOString() });
          if (associatedSaleRef) {
            updateDocumentNonBlocking(associatedSaleRef, { deletedAt: new Date().toISOString(), deletedBy: user?.username || 'Sistema' });
          }
        }
        toast({ title: 'Encomenda movida para Lixeira', description: 'A venda associada também foi removida.' });
      }
    } catch (e: any) {
      console.error("Error deleting order:", e);
      toast({ variant: 'destructive', title: 'Erro ao Apagar', description: e.message });
    }
  }, [ordersCollectionRef, firestore, companyId, toast, user]);


  const finalizeOrder = useCallback(async (orderId: string, finalPayment: number) => {
    assertOnline('entregar a encomenda');
    if (isReadOnly) {
      toast({ variant: "destructive", title: "Conta em modo leitura", description: "Modo leitura activo — contacte o suporte para reactivar o acesso completo." });
      return;
    }
    if (!firestore || !companyId || !user) return;

    try {
      // 1. Get Sale ID (outside transaction query)
      const salesRef = collection(firestore, `companies/${companyId}/sales`);
      const q = query(salesRef, where("orderId", "==", orderId));
      const salesSnap = await getDocs(q);
      const saleDoc = salesSnap.docs[0];

      // O productId pode ser o do inventário, o do catálogo ou o nome (encomendas antigas): resolve o produto activo
      const orderPre = ordersData?.find(o => o.id === orderId);
      const resolvedProductRef: DocumentReference | null = orderPre
        ? await resolveInventoryProductRef(firestore, companyId, {
            productId: orderPre.productId,
            productName: orderPre.productName,
            location: orderPre.location || (isMultiLocation ? locations[0]?.id : 'Principal') || 'Principal',
          })
        : null;

      await runTransaction(firestore, async (transaction) => {
        // --- READS ---

        // 1. Get Order
        const orderRef = doc(firestore, `companies/${companyId}/orders`, orderId);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Encomenda não encontrada.");
        const orderData = orderSnap.data() as Order;
        if (orderData.status === 'Entregue') throw new Error("Esta encomenda já foi entregue.");

        // 2. Get Sale (if exists)
        let freshSaleData: Sale | null = null;
        let saleRef: DocumentReference | null = null;
        if (saleDoc) {
          saleRef = doc(firestore, `companies/${companyId}/sales`, saleDoc.id);
          const freshSaleSnap = await transaction.get(saleRef);
          if (freshSaleSnap.exists()) {
            freshSaleData = freshSaleSnap.data() as Sale;
          }
        }

        // 3. Get Product (if exists)
        let freshProductData: Product | null = null;
        let productRef: DocumentReference | null = resolvedProductRef;
        if (productRef) {
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            freshProductData = productSnap.data() as Product;
          }
        }
        // Se a venda já foi levantada pelo ecrã de Vendas, o stock já saiu — não descontar outra vez.
        const stockAlreadyOut = freshSaleData?.status === 'Levantado';

        // --- WRITES ---

        // 4. Update Sale
        if (saleRef && freshSaleData) {
          const newAmountPaid = (freshSaleData.amountPaid || 0) + finalPayment;
          transaction.update(saleRef, {
            amountPaid: newAmountPaid,
            status: 'Levantado',
            paymentStatus: newAmountPaid >= freshSaleData.totalValue ? 'Pago' : 'Parcial'
          });
        }

        // 5. Update Order Status
        transaction.update(orderRef, { status: 'Entregue' });

        // 6. Create Production Record & Stock Movements
        if (productRef && freshProductData) {
          const locationToUse = orderData.location || (isMultiLocation ? locations[0]?.id : 'Principal');
          const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

          // Parte já produzida (registos de produção / conclusão) JÁ entrou no stock.
          // Só a parte em falta é produzida agora.
          const alreadyInStock = Math.min(Number(orderData.quantityProduced) || 0, orderData.quantity);
          const missing = Math.max(0, orderData.quantity - alreadyInStock);

          if (missing > 0) {
            const productionsRef = collection(firestore, `companies/${companyId}/productions`);
            transaction.set(doc(productionsRef), {
              date: new Date().toISOString().split('T')[0],
              productName: orderData.productName || 'Produto Desconhecido',
              quantity: missing,
              unit: orderData.unit || 'un',
              registeredBy: user.username || 'Sistema',
              status: 'Concluído',
              location: locationToUse,
              orderId: orderId
            });
            transaction.set(doc(movementsRef), {
              productId: productRef.id,
              productName: orderData.productName,
              type: 'IN',
              quantity: missing,
              toLocationId: locationToUse,
              reason: `Produção (Encomenda #${orderId.slice(-6).toUpperCase()}): ${missing} ${orderData.unit || 'un'}`,
              userId: user.id,
              userName: user.username,
              timestamp: serverTimestamp()
            });
          }

          if (!stockAlreadyOut) {
            transaction.set(doc(movementsRef), {
              productId: productRef.id,
              productName: orderData.productName,
              type: 'OUT',
              quantity: -orderData.quantity,
              fromLocationId: locationToUse,
              reason: `Venda (Levantamento Encomenda #${orderId.slice(-6).toUpperCase()}): ${orderData.quantity} ${orderData.unit || 'un'}`,
              userId: user.id,
              userName: user.username,
              ...(saleRef ? { saleId: saleRef.id } : {}),
              timestamp: serverTimestamp()
            });
          }

          // Stock: + parte produzida agora − entregue (se ainda não saiu). Reserva: libertada.
          const newStock = (freshProductData.stock || 0) + missing - (stockAlreadyOut ? 0 : orderData.quantity);
          const newReserved = stockAlreadyOut ? (freshProductData.reservedStock || 0) : Math.max(0, (freshProductData.reservedStock || 0) - reservedToRelease(orderData));
          transaction.update(productRef, {
            stock: Math.max(0, newStock),
            reservedStock: newReserved,
            lastUpdated: new Date().toISOString()
          });
        }
      });

      toast({ title: 'Encomenda Finalizada', description: 'A produção foi registada e o stock atualizado.' });

    } catch (e: any) {
      console.error("Error finalizing order:", e);
      toast({ variant: 'destructive', title: 'Erro ao Finalizar', description: e.message });
    }
  }, [firestore, companyId, user, toast, isMultiLocation, locations, ordersData]);
  return { deleteOrder, finalizeOrder };
}

export type OrderActions = ReturnType<typeof useOrderActions>;
