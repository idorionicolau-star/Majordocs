'use client';

import { useCallback } from 'react';
import type { Product, Production, ProductionLog, StockMovement, RawMaterial } from '@/lib/types';
import { collection, doc, getDocs, query, where, runTransaction, getDoc, serverTimestamp, arrayUnion, DocumentReference, limit } from 'firebase/firestore';
import { ref } from "firebase/storage";
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { InventoryCore } from './core';
import { pickActive, resolveInventoryProductRef } from '@/lib/product-ref';
import { ingredientRequiredQty } from '@/lib/order-stock';

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
    const existingProductId = pickActive(productQuerySnapshot.docs)?.id ?? null; // um produto na lixeira não recebe stock

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

            // 1 saco → 75 peças arredonda para cima (76 peças = 2 sacos); sem rendimento é linear
            const requiredQty = ingredientRequiredQty(ingredient, quantity);

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

      // O productId pode ser o ID do inventário, o do catálogo ou o nome: resolve o produto do inventário
      const logLocation = orderToUpdate.location || (isMultiLocation ? locations[0]?.id : 'Principal');
      const resolvedProductRef = await resolveInventoryProductRef(firestore, companyId, {
        productId: orderToUpdate.productId,
        productName: orderToUpdate.productName,
        location: logLocation || 'Principal',
      });
      const newProductRef = resolvedProductRef ? null : doc(collection(firestore, `companies/${companyId}/products`));
      const recipe = recipesData?.find(r => r.productName === orderToUpdate.productName);

      await runTransaction(firestore, async (transaction) => {
        // --- READS ---
        let productData: Product | null = null;
        if (resolvedProductRef) {
          const pDoc = await transaction.get(resolvedProductRef);
          if (pDoc.exists()) {
            productData = pDoc.data() as Product;
          }
        }

        // Matéria-prima da receita (igual à Produção normal): lê tudo antes de escrever e recusa se faltar
        const ingredientDocs: { ref: DocumentReference; data: RawMaterial; requiredQty: number }[] = [];
        for (const ingredient of recipe?.ingredients || []) {
          const materialRef = doc(firestore, `companies/${companyId}/rawMaterials`, ingredient.rawMaterialId);
          const materialDoc = await transaction.get(materialRef);
          if (!materialDoc.exists()) {
            throw new Error(`Matéria-prima não encontrada (ID: ${ingredient.rawMaterialId}) para a receita de ${orderToUpdate.productName}.`);
          }
          ingredientDocs.push({ ref: materialRef, data: materialDoc.data() as RawMaterial, requiredQty: ingredientRequiredQty(ingredient, logData.quantity) });
        }
        for (const ing of ingredientDocs) {
          if ((ing.data.stock || 0) < ing.requiredQty) {
            throw new Error(`Stock insuficiente de ${ing.data.name}. Necessário: ${ing.requiredQty}, Disponível: ${ing.data.stock}.`);
          }
        }

        // --- WRITES ---
        for (const ing of ingredientDocs) {
          transaction.update(ing.ref, { stock: (ing.data.stock || 0) - ing.requiredQty });
        }
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

        // Soma ao stock físico e regista o movimento. Se o produto ainda não existe no inventário, nasce já com esta produção.
        const targetProductRef = resolvedProductRef && productData ? resolvedProductRef : newProductRef;
        if (targetProductRef) {
          if (resolvedProductRef && productData) {
            transaction.update(resolvedProductRef, {
              stock: (productData.stock || 0) + logData.quantity,
              lastUpdated: new Date().toISOString()
            });
          } else {
            const cp = catalogProductsData?.find(p => p.name === orderToUpdate.productName);
            transaction.set(targetProductRef, {
              name: orderToUpdate.productName,
              category: cp?.category || 'Geral',
              stock: logData.quantity,
              reservedStock: 0,
              price: cp?.price || orderToUpdate.unitPrice || 0,
              unit: orderToUpdate.unit || cp?.unit || 'un',
              location: logLocation || 'Principal',
              lowStockThreshold: cp?.lowStockThreshold || 10,
              criticalStockThreshold: cp?.criticalStockThreshold || 5,
              ...(cp?.imageUrl ? { imageUrl: cp.imageUrl } : {}),
              lastUpdated: new Date().toISOString(),
            });
          }

          const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
            productId: targetProductRef.id,
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
  }, [firestore, companyId, user, ordersData, toast, addNotification, isMultiLocation, locations, recipesData, catalogProductsData]);


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
