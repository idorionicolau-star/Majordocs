'use client';

import { useCallback } from 'react';
import type { Product, Production, ProductionLog, StockMovement, RawMaterial } from '@/lib/types';
import { collection, doc, getDocs, query, where, runTransaction, getDoc, serverTimestamp, arrayUnion, DocumentReference, limit } from 'firebase/firestore';
import { ref } from "firebase/storage";
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { InventoryCore } from './core';

export function useProductionActions(core: InventoryCore) {
  const { assertOnline, isReadOnly, toast, firestore, companyId, user, isMultiLocation, locations, recipesData, catalogProductsData, addNotification, productsData, ordersData, productionsCollectionRef } = core;


  const addProduction = useCallback(async (prodData: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => {
    assertOnline('registar a produção');
    if (isReadOnly) {
      toast({ variant: "destructive", title: "Conta em modo leitura", description: "Modo leitura activo — contacte o suporte para reactivar o acesso completo." });
      return;
    }
    if (!firestore || !companyId || !user) throw new Error("Contexto não pronto.");

    const { productName, quantity, location, orderId, unit } = prodData;
    const targetLocation = location || (isMultiLocation && locations.length > 0 ? locations[0].id : 'Principal');

    // 1. Move product lookup OUTSIDE the transaction because transactions don't support queries
    const productsRef = collection(firestore, `companies/${companyId}/products`);
    const q = query(productsRef, where("name", "==", productName), where("location", "==", targetLocation));
    const productQuerySnapshot = await getDocs(q);
    const existingProductId = !productQuerySnapshot.empty ? productQuerySnapshot.docs[0].id : null;

    try {
      await runTransaction(firestore, async (transaction) => {
        // --- ALL READS MUST COME FIRST ---

        // 2. Prepare Product Reference and Read
        const productDocRef = existingProductId ? doc(productsRef, existingProductId) : doc(productsRef);
        const pDoc = await transaction.get(productDocRef);

        // 3. Check for Recipe and Read all Raw Materials
        const recipe = recipesData?.find(r => r.productName === productName);
        const ingredientDocs: { ref: DocumentReference, data: RawMaterial, requiredQty: number }[] = [];

        if (recipe) {
          for (const ingredient of recipe.ingredients) {
            const materialRef = doc(firestore, `companies/${companyId}/rawMaterials`, ingredient.rawMaterialId);
            const materialDoc = await transaction.get(materialRef);

            if (!materialDoc.exists()) {
              throw new Error(`Matéria-prima não encontrada (ID: ${ingredient.rawMaterialId}) para a receita de ${productName}.`);
            }

            // Yield-based calculation: if yieldPerUnit is set, use ceil rounding (never half-units)
            // e.g., 1 bag (qty=1) produces 75 products (yieldPerUnit=75)
            // To produce 150: ceil(150/75) * 1 = 2 bags
            // To produce 76:  ceil(76/75) * 1  = 2 bags (rounds up)
            // Backward compatibility: if no yieldPerUnit, use old linear calculation
            const yieldPer = ingredient.yieldPerUnit && ingredient.yieldPerUnit > 0 ? ingredient.yieldPerUnit : null;
            const requiredQty = yieldPer
              ? Math.ceil(quantity / yieldPer) * ingredient.quantity
              : ingredient.quantity * quantity;

            ingredientDocs.push({
              ref: materialRef,
              data: materialDoc.data() as RawMaterial,
              requiredQty: requiredQty
            });
          }
        }

        // --- ALL VALIDATION AND CALCULATIONS ---

        // 4. Validate Raw Material Stock
        for (const ingDoc of ingredientDocs) {
          if ((ingDoc.data.stock || 0) < ingDoc.requiredQty) {
            throw new Error(`Stock insuficiente de ${ingDoc.data.name}. Necessário: ${ingDoc.requiredQty}, Disponível: ${ingDoc.data.stock}.`);
          }
        }

        // --- ALL WRITES MUST COME LAST ---

        // 5. Update Raw Materials
        for (const ingDoc of ingredientDocs) {
          transaction.update(ingDoc.ref, { stock: ingDoc.data.stock - ingDoc.requiredQty });
        }

        // 6. Update/Create Product Stock
        if (pDoc.exists()) {
          const pData = pDoc.data() as Product;
          transaction.update(productDocRef, {
            stock: (pData.stock || 0) + quantity,
            lastUpdated: new Date().toISOString()
          });
        } else {
          const catalogProduct = catalogProductsData?.find(p => p.name === productName);
          const newProductData = {
            name: productName,
            category: catalogProduct?.category || 'Geral',
            stock: quantity,
            reservedStock: 0,
            price: catalogProduct?.price || 0,
            location: targetLocation,
            lastUpdated: new Date().toISOString(),
            unit: unit || catalogProduct?.unit || 'un',
            lowStockThreshold: catalogProduct?.lowStockThreshold || 10,
            criticalStockThreshold: catalogProduct?.criticalStockThreshold || 5,
          };
          transaction.set(productDocRef, newProductData);
        }

        // 7. Create Production Record
        const newProduction: any = {
          date: new Date().toISOString().split('T')[0],
          productName: productName || 'Produto Desconhecido',
          quantity: Number(quantity) || 0,
          unit: unit || 'un',
          registeredBy: user.username || 'Desconhecido',
          status: 'Transferido', // já entrou no stock nesta mesma transacção
          location: targetLocation || 'Principal',
        };

        // Explicitly include orderId ONLY if it has a valid string value
        if (orderId && typeof orderId === 'string' && orderId.trim() !== '' && orderId !== 'undefined') {
          newProduction.orderId = orderId;
        }

        const productionsRef = collection(firestore, `companies/${companyId}/productions`);
        transaction.set(doc(productionsRef), newProduction);

        // 8. Create Stock Movement Log
        const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);
        const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
          productId: productDocRef.id,
          productName,
          type: 'IN',
          quantity,
          toLocationId: targetLocation,
          reason: `Produção: ${quantity} ${unit || 'un'}`,
          userId: user.id,
          userName: user.username,
        };
        transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });

      }); // End Transaction


      addNotification({
        type: 'production',
        message: `Produção de ${quantity} ${unit || 'un'} de ${productName} registada e stock atualizado.`,
        href: '/production',
      });

    } catch (e: any) {
      console.error("Production error:", e);
      toast({ variant: 'destructive', title: 'Erro na Produção', description: e.message });
      throw e; // Re-throw so the dialog knows to stay open or handle error
    }
  }, [firestore, companyId, user, addNotification, recipesData, productsData, catalogProductsData, isMultiLocation, locations, toast]);


  const addProductionLog = useCallback(async (orderId: string, logData: { quantity: number; notes?: string }) => {
    assertOnline('registar a produção');
    if (!firestore || !companyId || !user || !ordersData) return;

    const orderToUpdate = ordersData.find(o => o.id === orderId);
    if (!orderToUpdate) return;

    try {
      const orderDocRef = doc(firestore, `companies/${companyId}/orders`, orderId);
      const productionsRef = collection(firestore, `companies/${companyId}/productions`);
      const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

      // Resolve product reference outside transaction (queries not allowed inside)
      let resolvedProductRef: DocumentReference | null = null;
      if (orderToUpdate.productId) {
        const directRef = doc(firestore, `companies/${companyId}/products`, orderToUpdate.productId);
        const directSnap = await getDoc(directRef);
        if (directSnap.exists()) {
          resolvedProductRef = directRef;
        } else {
          // Fallback: productId might be the product name
          const targetLoc = orderToUpdate.location || (isMultiLocation ? locations[0]?.id : 'Principal');
          const pQuery = query(
            collection(firestore, `companies/${companyId}/products`),
            where('name', '==', orderToUpdate.productName),
            where('location', '==', targetLoc),
            limit(1)
          );
          const pSnap = await getDocs(pQuery);
          if (!pSnap.empty) {
            resolvedProductRef = pSnap.docs[0].ref;
          }
        }
      }

      await runTransaction(firestore, async (transaction) => {
        // --- READS ---
        let productData: Product | null = null;
        if (resolvedProductRef) {
          const pDoc = await transaction.get(resolvedProductRef);
          if (pDoc.exists()) {
            productData = pDoc.data() as Product;
          }
        }

        // --- WRITES ---
        const newLog: ProductionLog = {
          id: `log-${Date.now()}`,
          date: new Date().toISOString(),
          quantity: logData.quantity,
          notes: logData.notes,
          registeredBy: user.username || 'Desconhecido',
        };
        const newQuantityProduced = orderToUpdate.quantityProduced + logData.quantity;

        transaction.update(orderDocRef, {
          quantityProduced: newQuantityProduced,
          productionLogs: arrayUnion(newLog)
        });

        const newProduction: Omit<Production, 'id'> = {
          date: new Date().toISOString().split('T')[0],
          productName: orderToUpdate.productName,
          quantity: logData.quantity,
          unit: orderToUpdate.unit,
          location: orderToUpdate.location,
          registeredBy: user.username || 'Desconhecido',
          status: 'Concluído',
          orderId: orderId
        };
        transaction.set(doc(productionsRef), newProduction);

        // Increment physical stock and register stock movement
        if (resolvedProductRef && productData) {
          transaction.update(resolvedProductRef, {
            stock: (productData.stock || 0) + logData.quantity,
            lastUpdated: new Date().toISOString()
          });

          const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
            productId: resolvedProductRef.id,
            productName: orderToUpdate.productName,
            type: 'IN',
            quantity: logData.quantity,
            toLocationId: orderToUpdate.location,
            reason: `Produção Parcial (Encomenda #${orderId.slice(-6).toUpperCase()}): ${logData.quantity} ${orderToUpdate.unit || 'un'}`,
            userId: user.id,
            userName: user.username,
          };
          transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
        }
      });

      toast({
        title: "Registo de Produção Adicionado",
        description: `${logData.quantity} unidades de "${orderToUpdate.productName}" foram produzidas e adicionadas ao stock.`,
      });
      addNotification({
        type: 'production',
        message: `Produção de ${orderToUpdate.productName} atualizada.`,
        href: `/orders?id=${orderId}`
      });

    } catch (error: any) {
      console.error("Error adding production log: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao Registar",
        description: error.message || "Não foi possível guardar o registo de produção.",
      });
    }
  }, [firestore, companyId, user, ordersData, toast, addNotification, isMultiLocation, locations]);


  const deleteProduction = useCallback((productionId: string) => {
    if (isReadOnly) {
      toast({ variant: "destructive", title: "Conta em modo leitura", description: "Modo leitura activo — contacte o suporte para reactivar o acesso completo." });
      return;
    }
    if (!productionsCollectionRef) return;
    const docRef = doc(productionsCollectionRef, productionId);
    updateDocumentNonBlocking(docRef, { deletedAt: new Date().toISOString() });
    toast({ title: 'Registo de Produção movido para Lixeira' });
  }, [productionsCollectionRef, toast]);


  const updateProduction = useCallback((productionId: string, data: Partial<Production>) => {
    if (isReadOnly) {
      toast({ variant: "destructive", title: "Conta em modo leitura", description: "Modo leitura activo — contacte o suporte para reactivar o acesso completo." });
      return;
    }
    if (!productionsCollectionRef) return;
    const docRef = doc(productionsCollectionRef, productionId);
    updateDocumentNonBlocking(docRef, data);
    toast({ title: 'Registo de Produção Atualizado' });
  }, [productionsCollectionRef, toast]);
  return { addProduction, addProductionLog, deleteProduction, updateProduction };
}

export type ProductionActions = ReturnType<typeof useProductionActions>;
