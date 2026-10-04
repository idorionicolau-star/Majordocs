'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import type { InventoryContextType, Product } from '@/lib/types';
import { PasswordConfirmationDialog } from '@/components/auth/password-confirmation-dialog';
import { useAuthActions } from './inventory/auth-actions';
import { useProductActions } from './inventory/product-actions';
import { useSalesActions } from './inventory/sales-actions';
import { useProductionActions } from './inventory/production-actions';
import { useOrderActions } from './inventory/order-actions';
import { useSettingsActions } from './inventory/settings-actions';
import { useOfflineSync } from './inventory/offline-sync';
import { useInventoryCore } from './inventory/core';

export const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const core = useInventoryCore();
  const { loading, productsLoading, salesLoading, productionsLoading, ordersLoading, stockMovementsLoading, catalogProductsLoading, catalogCategoriesLoading, rawMaterialsLoading, recipesLoading, companyId, firestore, user, productsData, salesData, stockMovementsData, lastSaleTimestamp, firebaseUser, isReadOnly, isTrial, daysLeft, renewInDays, subscriptionReason, logout, profilePicture, handleSetProfilePicture, canView, canEdit, companyData, products, productionsData, ordersData, catalogProductsData, catalogProductsRaw, catalogCategoriesData, rawMaterialsData, recipesData, locations, isMultiLocation, notifications, monthlySalesChartData, dashboardStats, businessStartDate, chatHistory, setChatHistory, updateCompany, markNotificationAsRead, markAllAsRead, clearNotifications, addNotification, categorizeProductWithAI, notifyManagers } = core;
  const authActions = useAuthActions(core);
  const { login, loginWithGoogle, resetPassword, changePassword, registerCompany, registerCompanyWithGoogle } = authActions;
  const productActions = useProductActions(core);
  const { addProduct, syncSmartThresholds, setAutoThresholds, updateProduct, deleteProduct, clearProductsCollection, auditStock, transferStock, updateProductStock } = productActions;
  const salesActions = useSalesActions(core, { product_actions: productActions });
  const { addSale, addBulkSale, confirmSalePickup, deleteSale, recalculateReservedStock } = salesActions;
  const { pendingOfflineSales, syncOfflineSales } = useOfflineSync(core, { product_actions: productActions });
  const productionActions = useProductionActions(core);
  const { addProduction, addProductionLog, deleteProduction, updateProduction, restoreProduction } = productionActions;
  const orderActions = useOrderActions(core);
  const { deleteOrder, finalizeOrder } = orderActions;
  const settingsActions = useSettingsActions(core);
  const { addCatalogProduct, addCatalogCategory, deleteCatalogProducts, updateCatalogProducts, deleteCatalogCategory, addRawMaterial, updateRawMaterial, deleteRawMaterial, addRecipe, updateRecipe, restoreItem: restoreItemBase, hardDelete, exportCompanyData, availableUnits, addUnit, editUnit, removeUnit, availableCategories, addCategory, editCategory, removeCategory, mergeProducts, renameProduct, mergeIntoVariant } = settingsActions;
  // Restaurar uma produção refaz o stock e a matéria-prima; o resto da lixeira usa a regra geral
  // Editar um produto e mudar-lhe o nome: muda em todo o programa (senão o stock das outras localizações,
  // o catálogo e as encomendas ficavam com o nome antigo e deixavam de bater certo).
  const updateProductEverywhere = useCallback(async (instanceId: string, data: Partial<Product>) => {
    const current = products.find((p) => p.instanceId === instanceId);
    if (current && typeof data.name === 'string' && data.name.trim() && data.name.trim() !== current.name) {
      if (!(await renameProduct(current.name, data.name))) throw new Error('O nome não foi mudado.');
    }
    return updateProduct(instanceId, data);
  }, [products, renameProduct, updateProduct]);
  const restoreItem = useCallback((collectionName: string, id: string) => (collectionName === 'productions' ? restoreProduction(id) : restoreItemBase(collectionName, id)), [restoreProduction, restoreItemBase]);


  const isDataLoading = loading || productsLoading || salesLoading || productionsLoading || ordersLoading || stockMovementsLoading || catalogProductsLoading || catalogCategoriesLoading || rawMaterialsLoading || recipesLoading;


  // 30-Day Retention Policy Cleanup
  useEffect(() => {
    if (!companyId || !firestore || !user || user.role !== 'Admin') return;

    const cleanupOldDeletedItems = async () => {
      const retentionPeriod = 30 * 24 * 60 * 60 * 1000; // 30 days in ms
      const now = new Date().getTime();

      // Check Products
      if (productsData) {
        productsData.forEach(p => {
          if (p.deletedAt) {
            const deletedDate = new Date(p.deletedAt).getTime();
            if (now - deletedDate > retentionPeriod) {
              console.log(`Auto-deleting old product: ${p.name}`);
              hardDelete('products', p.id!);
            }
          }
        });
      }

      // Check Sales
      if (salesData) {
        salesData.forEach(s => {
          if (s.deletedAt) {
            const deletedDate = new Date(s.deletedAt).getTime();
            if (now - deletedDate > retentionPeriod) {
              console.log(`Auto-deleting old sale: ${s.guideNumber}`);
              hardDelete('sales', s.id);
            }
          }
        });
      }
    };

    // Run cleanup with a small delay to ensure data is loaded
    const timer = setTimeout(cleanupOldDeletedItems, 5000);
    return () => clearTimeout(timer);
  }, [companyId, firestore, user, productsData, salesData, hardDelete]);


  // Auto-Sync Smart Thresholds Background
  useEffect(() => {
    if (!companyId || !firestore || !productsData || !stockMovementsData) return;

    const tryAutoSync = () => {
      syncSmartThresholds();
    };

    // Run slightly after mount to not block UI rendering
    const timer = setTimeout(tryAutoSync, 8000);
    return () => clearTimeout(timer);
  }, [companyId, firestore, productsData, stockMovementsData, syncSmartThresholds]);


  // Real-time Event-Driven Prediction Recalculation (Após Vendas)
  useEffect(() => {
    if (!lastSaleTimestamp || lastSaleTimestamp === 0) return;

    // Wait 5 seconds to ensure Firebase snapshot is complete, then force a sync (true)
    const timer = setTimeout(() => {
      syncSmartThresholds('silent');
    }, 5000);

    return () => clearTimeout(timer);
  }, [lastSaleTimestamp, syncSmartThresholds]);


  // confirmAction implementation
  const [confirmationAction, setConfirmationAction] = useState<(() => Promise<void>) | null>(null);

  const [confirmationTitle, setConfirmationTitle] = useState<string>("Confirmação");

  const [confirmationMessage, setConfirmationMessage] = useState<string>("");


  const confirmAction = useCallback((action: () => Promise<void>, title: string = "Confirmação", message: string = "Tem a certeza?") => {
    setConfirmationAction(() => action);
    setConfirmationTitle(title);
    setConfirmationMessage(message);
  }, []);


  const handleConfirm = async () => {
    if (confirmationAction) {
      await confirmationAction();
      setConfirmationAction(null);
    }
  };


  const value: InventoryContextType = useMemo(() => ({
    user,
    firebaseUser,
    companyId,
    loading: isDataLoading,
    isReadOnly,
    isTrial,
    daysLeft,
    renewInDays,
    subscriptionReason,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
    changePassword,
    registerCompany,
    registerCompanyWithGoogle,
    profilePicture, setProfilePicture: handleSetProfilePicture,
    canView, canEdit,
    companyData,
    products: products,
    allProducts: productsData || [],
    sales: (salesData || []).filter(s => !s.deletedAt),
    allSales: salesData || [],
    productions: (productionsData || []).filter(p => !p.deletedAt),
    allProductions: productionsData || [],
    orders: (ordersData || []).filter(o => !o.deletedAt),
    allOrders: ordersData || [],
    stockMovements: stockMovementsData || [],
    catalogProducts: catalogProductsData || [],
    allCatalogProducts: catalogProductsRaw || [], // inclui a lixeira
    catalogCategories: catalogCategoriesData || [],
    rawMaterials: rawMaterialsData || [],
    recipes: recipesData || [],
    locations, isMultiLocation, notifications, monthlySalesChartData, dashboardStats,
    businessStartDate,
    chatHistory, setChatHistory,
    addProduct, updateProduct: updateProductEverywhere, deleteProduct,
    auditStock, transferStock, updateProductStock, updateCompany, addSale, addBulkSale, confirmSalePickup, addProductionLog,
    addProduction, updateProduction, deleteProduction, deleteOrder, finalizeOrder, deleteSale,
    clearProductsCollection,
    mergeProducts, renameProduct, mergeIntoVariant,
    restoreItem,
    hardDelete,
    deleteCatalogProducts, updateCatalogProducts, deleteCatalogCategory,
    exportCompanyData,
    syncSmartThresholds,
    setAutoThresholds,

    markNotificationAsRead, markAllAsRead, clearNotifications, addNotification,
    recalculateReservedStock,
    pendingOfflineSales, syncOfflineSales,
    addCatalogProduct, addCatalogCategory,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    addRecipe,
    updateRecipe,
    // deleteRecipe,
    categorizeProductWithAI,

    availableUnits, addUnit, editUnit, removeUnit,
    availableCategories, addCategory, editCategory, removeCategory,

    confirmAction,
    notifyManagers,
  }), [
    user, firebaseUser, companyId, isDataLoading, isReadOnly, isTrial, daysLeft, renewInDays, subscriptionReason,
    login, loginWithGoogle, logout, resetPassword, registerCompany, registerCompanyWithGoogle, profilePicture, handleSetProfilePicture,
    canView, canEdit,
    companyData, productsData, salesData, productionsData, ordersData, stockMovementsData, catalogProductsData, catalogProductsRaw, catalogCategoriesData,
    rawMaterialsData, recipesData,
    locations, isMultiLocation, notifications, monthlySalesChartData, dashboardStats,
    businessStartDate,
    chatHistory, setChatHistory,
    addProduct, updateProductEverywhere, deleteProduct,
    auditStock, transferStock, updateProductStock, updateCompany, addSale, addBulkSale, confirmSalePickup, addProductionLog,
    addProduction, updateProduction, deleteProduction, deleteOrder, finalizeOrder, deleteSale,
    clearProductsCollection,
    markNotificationAsRead, markAllAsRead, clearNotifications, addNotification,
    recalculateReservedStock, pendingOfflineSales, syncOfflineSales,
    addCatalogProduct, addCatalogCategory,
    addRawMaterial,
    updateRawMaterial,
    addRecipe,
    updateRecipe,
    mergeProducts, renameProduct, mergeIntoVariant,
    restoreItem, deleteCatalogProducts, updateCatalogProducts, deleteCatalogCategory,
    exportCompanyData,
    availableUnits, addUnit,
    availableCategories, addCategory,
    syncSmartThresholds,
    setAutoThresholds,
    confirmAction,
    notifyManagers,
  ]);


  return (
    <InventoryContext.Provider value={value}>
      {children}
      <PasswordConfirmationDialog
        open={!!confirmationAction}
        onOpenChange={(open) => !open && setConfirmationAction(null)}
        onConfirm={handleConfirm}
        title={confirmationTitle}
        description={confirmationMessage}
      />
    </InventoryContext.Provider>
  );
}

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
