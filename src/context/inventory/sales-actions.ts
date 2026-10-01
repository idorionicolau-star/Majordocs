'use client';

import { useCallback } from 'react';
import type { Product, Sale, StockMovement, CartItem } from '@/lib/types';
import { collection, doc, writeBatch, getDocs, query, where, runTransaction, getDoc, serverTimestamp, DocumentReference, limit } from 'firebase/firestore';
import { ref } from "firebase/storage";
import { downloadSaleDocument, formatCurrency } from '@/lib/utils';
import type { InventoryCore } from './core';
import type { ProductActions } from './product-actions';

export function useSalesActions(core: InventoryCore, deps: { product_actions: ProductActions }) {
  const { assertOnline, isReadOnly, toast, firestore, companyId, productsCollectionRef, companyData, isMultiLocation, locations, user, sendPush, triggerEmailAlert, setLastSaleTimestamp, products, notifyManagers, isManagerUser, productsData } = core;
  const { checkStockAndNotify } = deps.product_actions;


  const addSale = useCallback(async (newSaleData: Omit<Sale, 'id' | 'guideNumber'>, reserveStock = true) => {
    assertOnline('registar a venda');
    if (isReadOnly) {
      toast({ variant: "destructive", title: "Conta em modo leitura", description: "Modo leitura activo — contacte o suporte para reactivar o acesso completo." });
      return;
    }
    if (!firestore || !companyId || !productsCollectionRef) throw new Error("Firestore não está pronto.");

    const settings = companyData?.notificationSettings;
    if (settings?.onSale && (!settings.email || settings.email.trim() === '')) {
      toast({
        variant: "destructive",
        title: "E-mail de Notificação em Falta",
        description: "Ativou as notificações de venda, mas não configurou um e-mail de destino nos Ajustes.",
      });
    }

    const productQuery = query(
      productsCollectionRef,
      where("name", "==", newSaleData.productName),
      where("location", "==", newSaleData.location || (isMultiLocation ? locations[0]?.id : 'Principal'))
    );

    const salesCollectionRef = collection(firestore, `companies/${companyId}/sales`);
    const newSaleRef = doc(salesCollectionRef);
    const companyDocRef = doc(firestore, `companies/${companyId}`);

    let guideNumberForOuterScope: string | null = null;
    let referencePriceForReview = 0;
    let reviewForPush: Record<string, any> | null = null;

    const isProforma = newSaleData.documentType === 'Factura Proforma';
    const shouldReserveStock = reserveStock && !isProforma;
    const finalStatus = isProforma ? 'Pendente' : newSaleData.status;

    // This is a read outside the transaction to get the document reference.
    const productSnapshot = shouldReserveStock ? await getDocs(productQuery) : null;
    if (shouldReserveStock && productSnapshot && productSnapshot.empty) {
      throw new Error(`Produto "${newSaleData.productName}" não encontrado no estoque para a localização selecionada.`);
    }
    const productDocRef = productSnapshot ? productSnapshot.docs[0].ref : null;

    await runTransaction(firestore, async (transaction) => {
      const companyDoc = await transaction.get(companyDocRef);
      if (!companyDoc.exists()) {
        throw new Error("Documento da empresa não encontrado.");
      }
      const currentCompanyData = companyDoc.data();
      const allNumbering = currentCompanyData.documentNumbering || {};
      const typeConfig = allNumbering[newSaleData.documentType];
      const newSaleCounter = (currentCompanyData.saleCounter || 0) + 1;

      let guideNumber: string;
      if (typeConfig && typeConfig.prefix) {
        const num = typeConfig.nextNumber || 1;
        const padded = typeConfig.padding > 0 ? String(num).padStart(typeConfig.padding, '0') : String(num);
        guideNumber = `${typeConfig.prefix}${typeConfig.separator || ''}${padded}`;
      } else {
        guideNumber = `GT-${String(newSaleCounter).padStart(6, '0')}`;
      }
      guideNumberForOuterScope = guideNumber;

      let unitCost = 0;
      if (productDocRef) {
        const productDoc = await transaction.get(productDocRef as DocumentReference);
        if (productDoc.exists()) {
          const productData = productDoc.data() as Product;
          unitCost = productData.cost || 0;
          referencePriceForReview = Number(productData.price) || 0;

          if (shouldReserveStock) {
            const availableStock = (productData.stock || 0) - (productData.reservedStock || 0);
            if (availableStock < newSaleData.quantity) {
              throw new Error(`Estoque insuficiente. Disponível: ${availableStock}.`);
            }
            if (finalStatus === 'Levantado') {
              // Levantado na hora: o material sai do stock já. Nada fica reservado.
              transaction.update(productDoc.ref, { stock: (productData.stock || 0) - newSaleData.quantity, lastUpdated: new Date().toISOString() });
              const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
                productId: productDoc.id,
                productName: newSaleData.productName,
                type: 'OUT',
                quantity: -newSaleData.quantity,
                fromLocationId: productData.location,
                reason: 'Venda levantada no acto',
                userId: user?.id || 'unknown',
                userName: user?.username || 'Sistema',
              };
              transaction.set(doc(collection(firestore, `companies/${companyId}/stockMovements`)), { ...movement, timestamp: serverTimestamp() });
            } else {
              // Pago mas por levantar: reservar.
              transaction.update(productDoc.ref, { reservedStock: (productData.reservedStock || 0) + newSaleData.quantity });
            }
          }
        }
      }

      transaction.update(companyDocRef, {
        saleCounter: newSaleCounter,
        ...(typeConfig && typeConfig.prefix ? { [`documentNumbering.${newSaleData.documentType}.nextNumber`]: (typeConfig.nextNumber || 1) + 1 } : {})
      });
      transaction.set(newSaleRef, { ...newSaleData, status: finalStatus, guideNumber, unitCost });

      // Preço de venda: aprende se o produto não tem preço; se é diferente do habitual, pede confirmação ao gestor.
      const soldPrice = Number(newSaleData.unitPrice) || 0;
      if (!isProforma && productDocRef && soldPrice > 0) {
        if (referencePriceForReview <= 0) {
          transaction.update(productDocRef as DocumentReference, { price: soldPrice });
        } else if (Math.abs(soldPrice - referencePriceForReview) >= 0.01 && user?.role !== 'Admin' && user?.role !== 'Dono') {
          reviewForPush = {
            productName: newSaleData.productName, productIds: [(productDocRef as DocumentReference).id],
            location: newSaleData.location || '', unit: newSaleData.unit || 'un',
            referencePrice: referencePriceForReview, soldPrice, quantity: newSaleData.quantity,
            saleId: newSaleRef.id, guideNumber, clientName: newSaleData.clientName || '',
            soldBy: user?.username || '', soldById: user?.id || '', status: 'pending', createdAt: new Date().toISOString(),
          };
          transaction.set(doc(collection(firestore, `companies/${companyId}/priceReviews`)), reviewForPush);
        }
      }
    });

    if (reviewForPush) {
      const r = reviewForPush as Record<string, any>;
      sendPush({
        title: `💲 Preço diferente numa venda — confirmar`,
        body: `${r.productName}: vendido a ${formatCurrency(r.soldPrice)} (habitual ${formatCurrency(r.referencePrice)}) por ${r.soldBy}`,
        link: '/sales/precos',
        tag: 'price-review',
        type: 'price',
        audience: 'managers',
      });
    }

    if (guideNumberForOuterScope) {
      const createdSale: Sale = {
        ...newSaleData,
        id: newSaleRef.id,
        guideNumber: guideNumberForOuterScope,
      };
      downloadSaleDocument(createdSale, companyData);

      await triggerEmailAlert({
        type: 'SALE',
        ...newSaleData,
        guideNumber: guideNumberForOuterScope,
        location: locations.find(l => l.id === newSaleData.location)?.name || 'Principal',
      });

      // Trigger stock alert check after sale
      if (productDocRef) {
        getDoc(productDocRef as DocumentReference).then(docSnap => {
          if (docSnap.exists()) {
            checkStockAndNotify(docSnap.data() as Product);
          }
        });
      }
    }

    setLastSaleTimestamp(Date.now());
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, companyData, toast, triggerEmailAlert, user, sendPush]);


  const addBulkSale = useCallback(async (
    items: CartItem[],
    saleData: {
      customerId?: string;
      clientName?: string;
      documentType: Sale['documentType'];
      notes?: string;
      discount?: { type: 'fixed' | 'percentage'; value: number };
      applyVat: boolean;
      vatPercentage: number;
      isPickedUp?: boolean;
      /** ISO date for sales registered late (defaults to now) */
      date?: string;
      /** Numerário, M-Pesa, e-Mola, Transferência, POS… (defaults to Numerário) */
      paymentMethod?: string;
      /** Amount received now; less than the total leaves the rest as debt (defaults to full) */
      amountPaid?: number;
    }
  ) => {
    assertOnline('registar a venda');
    if (isReadOnly) {
      toast({ variant: "destructive", title: "Conta em modo leitura", description: "Modo leitura activo — contacte o suporte para reactivar o acesso completo." });
      return;
    }
    if (!firestore || !companyId || !productsCollectionRef || !user) throw new Error("Firestore não está pronto.");
    if (!items || items.length === 0) throw new Error("O carrinho está vazio.");

    const salesCollectionRef = collection(firestore, `companies/${companyId}/sales`);
    const companyDocRef = doc(firestore, `companies/${companyId}`);

    let guideNumberForOuterScope: string | null = null;
    let createdSalesForOuterScope: Sale[] = [];
    let pendingPriceReviews: Record<string, any>[] = [];

    // Calculate totals for proportional distribution
    const cartSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDiscountAmount = saleData.discount
      ? (saleData.discount.type === 'percentage' ? cartSubtotal * (saleData.discount.value / 100) : saleData.discount.value)
      : 0;
    const totalAfterDiscount = Math.max(0, cartSubtotal - totalDiscountAmount);
    const totalVatAmount = saleData.applyVat ? totalAfterDiscount * (saleData.vatPercentage / 100) : 0;
    const cartTotal = totalAfterDiscount + totalVatAmount;
    // Parte paga agora (venda a crédito / sinal). Sem valor = pago na totalidade.
    const paidRatio = saleData.amountPaid === undefined || cartTotal <= 0 ? 1 : Math.max(0, Math.min(1, saleData.amountPaid / cartTotal));

    // To deduct across multiple source documents, we need all relevant products.
    // We already have `products` aggregated from the query. Let's just use the sourceIds!
    // But we are in a transaction, so we must read the raw docs.
    const allSourceIds = new Set<string>();
    items.forEach(item => {
      const targetLoc = item.location || (isMultiLocation && locations.length > 0 ? locations[0]?.id : 'Principal');
      const aggregatedProduct = products.find(p =>
        p.name === item.productName &&
        (!isMultiLocation || p.location === targetLoc || (!p.location && (targetLoc === 'Principal' || !item.location)))
      );

      if (aggregatedProduct?.sourceIds) {
        aggregatedProduct.sourceIds.forEach(id => allSourceIds.add(id));
      } else if (item.productId) {
        allSourceIds.add(item.productId);
      }
    });

    await runTransaction(firestore, async (transaction) => {
      // 1. READS
      const companyDoc = await transaction.get(companyDocRef);
      if (!companyDoc.exists()) throw new Error("Empresa não encontrada.");

      const sourceDocRefs = Array.from(allSourceIds).map(id => doc(productsCollectionRef, id));
      const sourceSnaps = await Promise.all(sourceDocRefs.map(ref => transaction.get(ref)));

      const loadedProducts = sourceSnaps.filter(s => s.exists()).map(s => ({ id: s.id, ref: s.ref, data: s.data() as Product }));

      // 2. VALIDATION & LOGIC
      const currentCompanyData = companyDoc.data();
      const allBulkNumbering = currentCompanyData.documentNumbering || {};
      const bulkTypeConfig = allBulkNumbering[saleData.documentType];
      const newSaleCounter = (currentCompanyData.saleCounter || 0) + 1;

      let guideNumber: string;
      if (bulkTypeConfig && bulkTypeConfig.prefix) {
        const num = bulkTypeConfig.nextNumber || 1;
        const padded = bulkTypeConfig.padding > 0 ? String(num).padStart(bulkTypeConfig.padding, '0') : String(num);
        guideNumber = `${bulkTypeConfig.prefix}${bulkTypeConfig.separator || ''}${padded}`;
      } else {
        guideNumber = `GT-${String(newSaleCounter).padStart(6, '0')}`;
      }
      guideNumberForOuterScope = guideNumber;

      const salesToCreate: Sale[] = [];
      const productUpdates: { ref: DocumentReference; data: any }[] = [];
      const stockOutMovements: { productId: string; productName: string; quantity: number; location?: string }[] = [];
      // Preço de venda: a venda ensina o preço a produtos sem preço; preço diferente do habitual → pedido de confirmação ao gestor.
      const priceReviews: Record<string, any>[] = [];

      items.forEach((item, index) => {
        const isProforma = saleData.documentType === 'Factura Proforma';

        let remainingQuantityToDeduct = item.quantity;
        // Find all underlying documents for this item's name and location
        const targetLocation = item.location || (isMultiLocation && locations.length > 0 ? locations[0]?.id : 'Principal');
        const availableSources = loadedProducts.filter(p =>
          p.data.name === item.productName &&
          (!isMultiLocation || p.data.location === targetLocation || (!p.data.location && (targetLocation === 'Principal' || !item.location)))
        );

        const totalAvailableStock = availableSources.reduce((sum, p) => sum + (p.data.stock - p.data.reservedStock), 0);

        if (!isProforma && totalAvailableStock < item.quantity) {
          throw new Error(`Stock insuficiente para "${item.productName}". Disponível: ${totalAvailableStock}.`);
        }

        // Levantado no acto => sai do stock já; por levantar => fica reservado.
        const pickedUpNow = !isProforma && saleData.isPickedUp !== false;

        if (!isProforma) {
          for (const source of availableSources) {
            if (remainingQuantityToDeduct <= 0) break;
            const availableInSource = (source.data.stock || 0) - (source.data.reservedStock || 0);
            if (availableInSource > 0) {
              const deductAmount = Math.min(availableInSource, remainingQuantityToDeduct);
              if (pickedUpNow) {
                source.data.stock = (source.data.stock || 0) - deductAmount;
                stockOutMovements.push({ productId: source.ref.id, productName: item.productName, quantity: deductAmount, location: source.data.location });
              } else {
                source.data.reservedStock = (source.data.reservedStock || 0) + deductAmount;
              }
              remainingQuantityToDeduct -= deductAmount;

              const data = { stock: source.data.stock || 0, reservedStock: source.data.reservedStock || 0, lastUpdated: new Date().toISOString() };
              const existingUpdate = productUpdates.find(u => u.ref.id === source.ref.id);
              if (existingUpdate) existingUpdate.data = data;
              else productUpdates.push({ ref: source.ref, data });
            }
          }
        }

        // Proportional math for this specific Sale document
        const proportion = cartSubtotal > 0 ? (item.subtotal / cartSubtotal) : 0;
        const itemDiscount = totalDiscountAmount * proportion;
        const itemVat = totalVatAmount * proportion;
        const itemTotal = item.subtotal - itemDiscount + itemVat;

        const newSaleRef = doc(salesCollectionRef); // Auto-ID
        const sale: Sale = {
          id: newSaleRef.id,
          guideNumber,
          productId: item.productId, // primary id reference
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost: item.originalCost || 0,
          subtotal: item.subtotal,
          discount: itemDiscount,
          vat: itemVat,
          totalValue: itemTotal,
          amountPaid: saleData.documentType !== 'Factura Proforma' ? Math.round(itemTotal * paidRatio * 100) / 100 : 0,
          date: saleData.date || new Date().toISOString(),
          status: saleData.documentType === 'Factura Proforma' ? 'Pendente' : (saleData.isPickedUp === false ? 'Pago' : 'Levantado'),
          paymentMethod: saleData.paymentMethod || 'Numerário',
          location: targetLocation,
          unit: item.unit || 'un',
          soldBy: user.username,
          documentType: saleData.documentType,
          clientName: saleData.clientName || '',
          ...(saleData.customerId && { customerId: saleData.customerId }),
          ...(saleData.notes && { notes: saleData.notes }),
        };

        salesToCreate.push(sale);
        createdSalesForOuterScope.push(sale);

        if (!isProforma && availableSources.length > 0 && item.unitPrice > 0) {
          const reference = Number(availableSources[0].data.price) || 0;
          if (reference <= 0) {
            // Produto sem preço: aprende com esta venda.
            availableSources.forEach(src => {
              const existing = productUpdates.find(u => u.ref.id === src.ref.id);
              if (existing) existing.data.price = item.unitPrice;
              else productUpdates.push({ ref: src.ref, data: { price: item.unitPrice, lastUpdated: new Date().toISOString() } });
            });
          } else if (Math.abs(item.unitPrice - reference) >= 0.01 && user.role !== 'Admin' && user.role !== 'Dono') {
            // (O gestor a vender com outro preço já decidiu — não precisa de se confirmar a si próprio.)
            priceReviews.push({
              productName: item.productName,
              productIds: availableSources.map(src => src.ref.id),
              location: targetLocation || '',
              unit: item.unit || 'un',
              referencePrice: reference,
              soldPrice: item.unitPrice,
              quantity: item.quantity,
              saleId: sale.id,
              guideNumber,
              clientName: saleData.clientName || '',
              soldBy: user.username,
              soldById: user.id,
              status: 'pending',
              createdAt: new Date().toISOString(),
            });
          }
        }
      });

      // 3. WRITES
      const priceReviewsRef = collection(firestore, `companies/${companyId}/priceReviews`);
      priceReviews.forEach(r => transaction.set(doc(priceReviewsRef), r));
      pendingPriceReviews = priceReviews;
      transaction.update(companyDocRef, {
        saleCounter: newSaleCounter,
        ...(bulkTypeConfig && bulkTypeConfig.prefix ? { [`documentNumbering.${saleData.documentType}.nextNumber`]: (bulkTypeConfig.nextNumber || 1) + 1 } : {})
      });

      productUpdates.forEach(update => {
        transaction.update(update.ref, update.data);
      });

      const bulkMovementsRef = collection(firestore, `companies/${companyId}/stockMovements`);
      stockOutMovements.forEach(m => {
        const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
          productId: m.productId,
          productName: m.productName,
          type: 'OUT',
          quantity: -m.quantity,
          fromLocationId: m.location,
          reason: `Venda ${guideNumber} (levantada no acto)`,
          userId: user.id,
          userName: user.username,
        };
        transaction.set(doc(bulkMovementsRef), { ...movement, timestamp: serverTimestamp() });
      });

      salesToCreate.forEach(sale => {
        transaction.set(doc(salesCollectionRef, sale.id), sale);
      });
    });

    // Desconto grande (≥ 10%) → avisar o gestor.
    if (cartSubtotal > 0 && totalDiscountAmount / cartSubtotal >= 0.1) {
      notifyManagers({
        type: 'security',
        title: `🏷️ Desconto de ${Math.round((totalDiscountAmount / cartSubtotal) * 100)}% numa venda`,
        body: `${user.username} · ${formatCurrency(totalDiscountAmount)} de desconto em ${formatCurrency(cartSubtotal)}${saleData.clientName ? ` · ${saleData.clientName}` : ''}`,
        link: '/sales',
      });
    }

    // Preço diferente do habitual → avisar o gestor (push) para confirmar.
    if (pendingPriceReviews.length) {
      const first = pendingPriceReviews[0];
      sendPush({
        title: `💲 Preço diferente numa venda — confirmar`,
        body: pendingPriceReviews.length === 1
          ? `${first.productName}: vendido a ${formatCurrency(first.soldPrice)} (habitual ${formatCurrency(first.referencePrice)}) por ${first.soldBy}`
          : `${pendingPriceReviews.length} produtos vendidos com preço diferente do habitual por ${first.soldBy}`,
        link: '/sales/precos',
        tag: 'price-review',
        type: 'price',
        audience: 'managers',
      });
    }

    // Post-transaction UI/Notifications
    if (guideNumberForOuterScope && createdSalesForOuterScope.length > 0) {
      toast({
        title: "Venda Registada!",
        description: `Guia ${guideNumberForOuterScope} gerada com ${items.length} itens.`,
      });
      // Try to download single document with all sales
      downloadSaleDocument(createdSalesForOuterScope, companyData);

      await triggerEmailAlert({
        type: 'SALE',
        ...createdSalesForOuterScope[0], // Use first for email alert properties like status/clientName
        totalValue: cartTotal, // overriding total for single sum
        guideNumber: guideNumberForOuterScope,
        location: locations.find(l => l.id === createdSalesForOuterScope[0].location)?.name || 'Principal',
      });

      // Trigger stock alert checks for all items in bulk sale using fresh data
      items.forEach(item => {
        const targetLocation = item.location || (isMultiLocation && locations.length > 0 ? locations[0]?.id : 'Principal');
        const pQuery = query(
          productsCollectionRef,
          where("name", "==", item.productName),
          where("location", "==", targetLocation),
          limit(1)
        );
        getDocs(pQuery).then(snap => {
          if (!snap.empty) {
            checkStockAndNotify(snap.docs[0].data() as Product);
          }
        });
      });
    }

    setLastSaleTimestamp(Date.now());
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, companyData, products, toast, triggerEmailAlert, sendPush, user, notifyManagers]);



  const confirmSalePickup = useCallback(async (sale: Sale) => {
    assertOnline('confirmar o levantamento');
    if (isReadOnly) {
      toast({ variant: "destructive", title: "Conta em modo leitura", description: "Modo leitura activo — contacte o suporte para reactivar o acesso completo." });
      return;
    }
    if (!firestore || !companyId || !productsCollectionRef || !user) throw new Error("Firestore não está pronto.");

    const saleRef = doc(firestore, `companies/${companyId}/sales`, sale.id);
    const saleSnap = await getDoc(saleRef);
    if (!saleSnap.exists()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Venda não encontrada.' });
      return;
    }
    const freshSale = saleSnap.data() as Sale;

    if (freshSale.status === 'Levantado') {
      throw new Error("Esta venda já foi marcada como levantada. O stock não foi alterado.");
    }

    // Vendas de encomenda são levantadas em Encomendas → "Finalizar / Levantar",
    // que também regista a produção. Levantar aqui descontava o stock duas vezes.
    if (freshSale.orderId || freshSale.documentType === 'Encomenda') {
      throw new Error("Esta venda pertence a uma encomenda. Use Encomendas → Finalizar / Levantar.");
    }

    const amountPaid = freshSale.amountPaid ?? 0;
    if ((freshSale.totalValue - amountPaid) > 0.5) {
      throw new Error(`Pagamento incompleto. O cliente ainda precisa de pagar ${formatCurrency(freshSale.totalValue - amountPaid)}.`);
    }

    const targetLocation = freshSale.location || (isMultiLocation ? locations[0]?.id : 'Principal');
    const aggregatedProduct = products.find(p =>
      p.name === freshSale.productName &&
      (!isMultiLocation || p.location === targetLocation || (!p.location && (targetLocation === 'Principal' || !freshSale.location)))
    );

    let sourceIdsToCheck: string[] = [];
    if (aggregatedProduct?.sourceIds && aggregatedProduct.sourceIds.length > 0) {
      sourceIdsToCheck = aggregatedProduct.sourceIds;
    } else if (freshSale.productId) {
      sourceIdsToCheck = [freshSale.productId];
    } else {
      // Fallback query if not in context
      const productQuery = query(
        productsCollectionRef,
        where("name", "==", freshSale.productName),
        where("location", "==", targetLocation)
      );
      const snap = await getDocs(productQuery);
      if (!snap.empty) {
        sourceIdsToCheck = snap.docs.map(d => d.id);
      }
    }

    if (sourceIdsToCheck.length === 0) {
      throw new Error(`Produto "${freshSale.productName}" não encontrado para atualizar estoque.`);
    }

    await runTransaction(firestore, async (transaction) => {
      // 1. READS
      const sourceDocRefs = sourceIdsToCheck.map(id => doc(productsCollectionRef, id));
      const sourceSnaps = await Promise.all(sourceDocRefs.map(ref => transaction.get(ref)));

      const loadedProducts = sourceSnaps.filter(s => s.exists()).map(s => ({ ref: s.ref, data: s.data() as Product }));

      if (loadedProducts.length === 0) {
        throw new Error(`Produto "${freshSale.productName}" não encontrado na base de dados.`);
      }

      // Check total available BEFORE deducting
      const totalStock = loadedProducts.reduce((sum, p) => sum + p.data.stock, 0);
      if (totalStock < freshSale.quantity) {
        throw new Error(`Erro Crítico: Stock insuficiente para realizar o levantamento. Disp: ${totalStock}, Necessário: ${freshSale.quantity}`);
      }

      // 2. CALCULATIONS & WRITES
      let remainingToDeduct = freshSale.quantity;
      const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

      // Libertar a reserva onde ela está (pode estar num documento diferente do que tem o stock).
      let reservedToRelease = freshSale.quantity;
      const next = new Map(loadedProducts.map(p => [p.ref.id, { stock: p.data.stock || 0, reserved: p.data.reservedStock || 0 }]));
      for (const source of loadedProducts) {
        if (reservedToRelease <= 0) break;
        const st = next.get(source.ref.id)!;
        const release = Math.min(st.reserved, reservedToRelease);
        st.reserved -= release;
        reservedToRelease -= release;
      }

      for (const source of loadedProducts) {
        if (remainingToDeduct <= 0) break;

        const st = next.get(source.ref.id)!;
        if (st.stock > 0) {
          const deductAmount = Math.min(st.stock, remainingToDeduct);
          st.stock -= deductAmount;

          // Movement log per document modified
          const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
            productId: source.ref.id,
            productName: freshSale.productName,
            type: 'OUT',
            quantity: -deductAmount,
            fromLocationId: source.data.location,
            reason: `Levantamento Venda #${freshSale.guideNumber}`,
            userId: user.id,
            userName: user.username,
          };
          transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });

          remainingToDeduct -= deductAmount;
        }
      }

      // Uma única escrita por documento (stock e reserva já calculados)
      for (const source of loadedProducts) {
        const st = next.get(source.ref.id)!;
        if (st.stock !== (source.data.stock || 0) || st.reserved !== (source.data.reservedStock || 0)) {
          transaction.update(source.ref, { stock: st.stock, reservedStock: st.reserved, lastUpdated: new Date().toISOString() });
        }
      }

      transaction.update(saleRef, { status: 'Levantado' });

      // Side effect post-transaction logic
      // Send notification with total remaining stock
      checkStockAndNotify({ ...loadedProducts[0].data, stock: totalStock - freshSale.quantity });
    });

  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, user, checkStockAndNotify, toast]);


  const deleteSale = useCallback(async (saleId: string) => {
    if (isReadOnly) {
      toast({ variant: "destructive", title: "Conta em modo leitura", description: "Modo leitura activo — contacte o suporte para reactivar o acesso completo." });
      return;
    }
    if (!firestore || !companyId || !productsCollectionRef || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'A base de dados não está pronta.' });
      return;
    }
    if (!isManagerUser) {
      toast({ variant: 'destructive', title: 'Só o gestor pode apagar vendas', description: 'Peça ao gestor para apagar ou corrigir esta venda.' });
      return;
    }
    const saleRef = doc(firestore, `companies/${companyId}/sales`, saleId);

    try {
      const saleDoc = await getDoc(saleRef);
      if (!saleDoc.exists()) {
        throw new Error("Venda não encontrada.");
      }
      const saleData = saleDoc.data() as Sale;

      let productDocRef: DocumentReference | null = null;
      if (saleData.status === 'Pago' || saleData.status === 'Levantado') {
        const productQuery = query(
          productsCollectionRef,
          where("name", "==", saleData.productName),
          where("location", "==", saleData.location || (isMultiLocation ? locations[0]?.id : 'Principal'))
        );
        const productSnapshot = await getDocs(productQuery);
        if (!productSnapshot.empty) {
          productDocRef = productSnapshot.docs[0].ref;
        }
      }

      await runTransaction(firestore, async (transaction) => {
        // We reinstate stock because "Deleting" a sale usually means it was valid but we want to cancel it.
        // Soft delete logic: Just mark as deleted? If we mark as deleted but keep stock deducted, it's just hiding.
        // User expects "Undo" usually for accidental deletion.
        // If we want "Undo" to work perfectly, we should NOT revert stock on soft delete if we assume it's just moving to trash,
        // BUT if we don't revert stock, the stock count is wrong if the sale is indeed cancelled.
        // Plan: Soft delete = "Cancelled" effectively. So we revert stock.
        // Restore = "Re-do" sale. We take stock again.

        if (productDocRef) {
          const productDoc = await transaction.get(productDocRef);
          if (productDoc.exists()) {
            const productData = productDoc.data() as Product;
            let stockUpdate = {};

            // If it was just 'Pago' (reserved), we free reserved.
            // If it was 'Levantado' (stock taken), we free stock AND reserved? No, just stock.
            // Wait, logic:
            // Pago -> Reserved Stock increased.
            // Levantado -> Stock decreased (Reserved decreased).

            if (saleData.status === 'Pago') {
              const newReserved = Math.max(0, productData.reservedStock - saleData.quantity);
              stockUpdate = { reservedStock: newReserved };
            } else if (saleData.status === 'Levantado') {
              // Stock was already taken. Put it back.
              const newStock = productData.stock + saleData.quantity;
              stockUpdate = { stock: newStock };
            }

            transaction.update(productDocRef, stockUpdate);
          }
        }

        // Soft delete the sale document
        transaction.update(saleRef, {
          deletedAt: new Date().toISOString(),
          deletedBy: user.username
        });
        // Fica registado quem apagou, quando e o que era a venda (histórico imutável)
        transaction.set(doc(collection(saleRef, 'history')), {
          action: 'apagada',
          userId: user.id,
          userName: user.username,
          at: serverTimestamp(),
          guideNumber: saleData.guideNumber || null,
          snapshot: {
            productName: saleData.productName, quantity: saleData.quantity, unitPrice: saleData.unitPrice,
            totalValue: saleData.totalValue, status: saleData.status, clientName: saleData.clientName || null,
          },
        });
      });

      toast({ title: 'Venda enviada para Lixeira', description: 'O stock foi reposto.' });
      notifyManagers({
        type: 'security',
        title: `🗑️ Venda ${saleData.guideNumber || ''} apagada`,
        body: `${user.username} · ${saleData.productName} × ${saleData.quantity} · ${formatCurrency(saleData.totalValue || 0)}${saleData.clientName ? ` · ${saleData.clientName}` : ''}`,
        link: '/sales',
      });

    } catch (error: any) {
      console.error("Error deleting sale: ", error);
      toast({ variant: 'destructive', title: 'Erro ao Apagar Venda', description: error.message });
    }
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, toast, user, notifyManagers, isManagerUser]);


  const recalculateReservedStock = useCallback(async () => {
    if (!firestore || !companyId || !productsData) {
      toast({ variant: 'destructive', title: 'Erro', description: 'A base de dados não está pronta para esta operação.' });
      return;
    }

    toast({ title: 'A recalcular stock reservado...', description: 'Isto pode demorar um momento.' });

    try {
      // 1. Fetch all 'Paid' and 'Pending' sales directly from Firestore
      const salesRef = collection(firestore, `companies/${companyId}/sales`);
      // We use "in" query to get both Paid and Pending
      // Só vendas pagas e ainda por levantar reservam stock (proformas "Pendente" não reservam).
      const q = query(salesRef, where("status", "==", "Pago"));
      const salesSnapshot = await getDocs(q);
      const sales = salesSnapshot.docs.map(doc => doc.data() as Sale);

      // 2. Calculate the correct reserved stock for each product instance (name + location)
      const correctReservedMap = new Map<string, number>(); // Key: 'productName|locationId'
      sales.forEach(sale => {
        // Exclude deleted sales
        if (sale.deletedAt) return;

        // Exclude Proformas (usually don't reserve stock)
        if (sale.documentType === 'Factura Proforma') return;

        // Use an empty string for undefined location to ensure consistency
        const locationKey = sale.location || '';
        const key = `${sale.productName}|${locationKey}`;
        const currentReserved = correctReservedMap.get(key) || 0;
        correctReservedMap.set(key, currentReserved + sale.quantity);
      });

      // 3. Compare with existing data and prepare batch update
      const batch = writeBatch(firestore);
      let updatesCount = 0;

      // Produtos duplicados (mesmo nome + local) são somados na app: a reserva fica toda no 1.º documento.
      const seenKeys = new Set<string>();
      productsData.forEach(product => {
        if (product.deletedAt) return;
        const locationKey = product.location || '';
        const key = `${product.name}|${locationKey}`;
        const correctReserved = seenKeys.has(key) ? 0 : (correctReservedMap.get(key) || 0);
        seenKeys.add(key);

        if (product.reservedStock !== correctReserved) {
          const productRef = doc(firestore, `companies/${companyId}/products`, product.id);
          batch.update(productRef, { reservedStock: correctReserved });
          updatesCount++;
        }
      });

      // 4. Commit batch if needed
      if (updatesCount > 0) {
        await batch.commit();
        toast({ title: 'Sucesso!', description: `${updatesCount} registo(s) de stock reservado foram corrigidos.` });
      } else {
        toast({ title: 'Tudo certo!', description: 'Nenhuma inconsistência encontrada no stock reservado.' });
      }

    } catch (error: any) {
      console.error("Error recalculating reserved stock:", error);
      toast({ variant: 'destructive', title: 'Erro ao Recalcular', description: 'Não foi possível completar a operação.' });
    }
  }, [firestore, companyId, productsData, toast]);
  return { addSale, addBulkSale, confirmSalePickup, deleteSale, recalculateReservedStock };
}

export type SalesActions = ReturnType<typeof useSalesActions>;
