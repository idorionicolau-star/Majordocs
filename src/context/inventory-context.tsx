'use client';


import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Product, Location, Sale, Production, ProductionLog, Order, Company, Employee, ModulePermission, PermissionLevel, StockMovement, AppNotification, DashboardStats, InventoryContextType, ChatMessage, RawMaterial, Recipe, CartItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useFirestore, useMemoFirebase, getFirebaseAuth } from '@/firebase/provider';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseAuthUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  runTransaction,
  getDoc,
  serverTimestamp,
  arrayUnion,
  type CollectionReference,
  DocumentReference,
  limit,
  arrayRemove,
} from 'firebase/firestore';
import { allPermissions } from '@/lib/data';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { downloadSaleDocument, formatCurrency, normalizeString } from '@/lib/utils';
import {
  updateDocumentNonBlocking,
  addDocumentNonBlocking,
  deleteDocumentNonBlocking
} from '@/firebase/non-blocking-updates';
import { PasswordConfirmationDialog } from '@/components/auth/password-confirmation-dialog';


type CatalogProduct = Omit<
  Product,
  'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'
>;
type CatalogCategory = { id: string; name: string };

export const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [monthlySalesChartData, setMonthlySalesChartData] = useState<{ name: string; vendas: number }[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = getFirebaseAuth();
  const wasSyncing = useRef(false);

  const [companyData, setCompanyData] = useState<Company | null>(null);

  const locations = useMemo(() => companyData?.locations || [], [companyData]);
  const isMultiLocation = useMemo(() => !!companyData?.isMultiLocation, [companyData]);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'date' | 'read'>) => {
    setNotifications(prev => [
      {
        id: `notif-${Date.now()}`,
        date: new Date().toISOString(),
        read: false,
        ...notification,
      },
      ...prev
    ].slice(0, 50)); // Keep last 50 notifications
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleSetProfilePicture = useCallback(async (pictureUrl: string) => {
    if (!firestore || !user || !user.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Utilizador não autenticado.' });
      return;
    }

    toast({ title: 'A carregar...', description: 'A sua nova foto de perfil está a ser guardada.' });

    try {
      const userDocRef = doc(firestore, `companies/${user.companyId}/employees`, user.id);
      updateDocumentNonBlocking(userDocRef, { profilePictureUrl: pictureUrl });
      setProfilePicture(pictureUrl);

      toast({ title: 'Sucesso!', description: 'A sua foto de perfil foi atualizada.' });
    } catch (error) {
      console.error("Error updating profile picture: ", error);
      toast({ variant: 'destructive', title: 'Erro de Upload', description: 'Não foi possível guardar a sua foto.' });
    }
  }, [firestore, user, toast]);

  const triggerEmailAlert = useCallback(async (payload: any) => {
    const settings = companyData?.notificationSettings;
    const targetEmail = settings?.email;

    if (!targetEmail || targetEmail.trim() === '') {
      console.warn("E-mail de notificação não configurado. Alerta não enviado.");
      return;
    }

    let shouldSend = false;
    let subject = '';

    if (payload.type === 'CRITICAL' && settings.onCriticalStock) {
      shouldSend = true;
      subject = `🚨 ALERTA: ${payload.productName} com stock baixo!`;
      addNotification({
        type: 'stock',
        message: `Stock crítico para ${payload.productName}! Quantidade: ${payload.quantity}`,
        href: '/inventory',
      });
    } else if (payload.type === 'SALE' && settings.onSale) {
      shouldSend = true;
      subject = `✅ Nova Venda: ${payload.productName}`;
      addNotification({
        type: 'sale',
        message: `Nova venda de ${payload.productName} registada.`,
        href: '/sales',
      });
    }

    if (!shouldSend) {
      return;
    }

    try {
      const fbToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${fbToken}`
        },
        body: JSON.stringify({ to: targetEmail, subject, companyId, logoUrl: companyData?.logoUrl, companyName: companyData?.name, ...payload }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Erro desconhecido da API');
      }
    } catch (error: any) {
      console.warn("Falha ao enviar e-mail de notificação:", error.message);
      toast({
        variant: "destructive",
        title: "Falha na Notificação por E-mail",
        description: error.message,
        duration: 8000,
      });
    }
  }, [companyData, addNotification, toast]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      // onAuthStateChanged will handle the state updates (setUser, setFirebaseUser etc.)
      // and ClientLayout will handle the redirect.
      toast({ title: 'Sessão terminada' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao sair' });
    }
  }, [auth, toast]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setFirebaseUser(fbUser);
        const userMapDocRef = doc(firestore, `users/${fbUser.uid}`);
        try {
          const userMapDoc = await getDoc(userMapDocRef);
          if (userMapDoc.exists()) {
            const userCompanyId = userMapDoc.data().companyId;
            setCompanyId(userCompanyId);
          } else {
            throw new Error("Mapeamento de utilizador não encontrado.");
          }
        } catch (error) {
          console.error("Error fetching user map:", error);
          logout();
        }
      } else {
        setUser(null);
        setFirebaseUser(null);
        setCompanyId(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [auth, firestore, logout]);

  useEffect(() => {
    let unsubscribeEmployee: () => void = () => { };

    if (firebaseUser && companyId) {
      setNotifications([]); // Clear notifications on company change
      setChatHistory([]); // Clear chat history on company change
      const employeeDocRef = doc(firestore, `companies/${companyId}/employees/${firebaseUser.uid}`);
      unsubscribeEmployee = onSnapshot(employeeDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const employeeData = { id: docSnap.id, ...docSnap.data() } as Employee;
          setUser(employeeData);
          if (employeeData.profilePictureUrl) {
            setProfilePicture(employeeData.profilePictureUrl);
          } else {
            setProfilePicture(null);
          }
        } else {
          console.error("Perfil de funcionário não encontrado na empresa.");
          logout();
        }
        setLoading(false);
      }, (error) => {
        console.error("Error subscribing to employee data:", error);
        logout();
        setLoading(false);
      });
    } else if (!firebaseUser) {
      setLoading(false);
    }

    return () => unsubscribeEmployee();
  }, [firebaseUser, companyId, firestore, logout]);




  const login = async (email: string, pass: string): Promise<boolean> => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      return true;
    } catch (error: any) {
      console.error("Firebase Auth login error:", error);
      let message = "Ocorreu um erro ao fazer login.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = "Email ou senha inválidos.";
      }
      toast({ variant: 'destructive', title: 'Erro de Login', description: message });
      throw error;
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    try {
      const actionCodeSettings = {
        // URL you want to redirect back to. The domain (www.example.com) for this
        // URL must be whitelisted in the Firebase Console.
        url: window.location.origin + '/login',
        // This must be true.
        handleCodeInApp: true,
      };

      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      toast({
        title: "E-mail de redefinição enviado",
        description: "Verifique a sua caixa de entrada para redefinir a sua senha.",
      });
    } catch (error: any) {
      console.error("Firebase Auth reset password error:", error);
      let message = "Ocorreu um erro ao enviar o e-mail de redefinição.";
      if (error.code === 'auth/user-not-found') {
        message = "Não encontramos nenhuma conta com este endereço de e-mail.";
      }
      toast({ variant: 'destructive', title: 'Erro', description: message });
      throw error;
    }
  };

  const registerCompany = async (companyName: string, adminUsername: string, adminEmail: string, adminPass: string, businessType: 'manufacturer' | 'reseller'): Promise<boolean> => {
    if (!firestore) return false;

    try {
      const companiesRef = collection(firestore, 'companies');
      const companyQuery = query(companiesRef, where('name', '==', companyName));
      const existingCompanySnapshot = await getDocs(companyQuery);
      if (!existingCompanySnapshot.empty) {
        throw new Error('Uma empresa com este nome já existe.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
      const newUserId = userCredential.user.uid;

      const newCompanyRef = doc(companiesRef);

      const adminPermissions = allPermissions.reduce((acc, p) => {
        acc[p.id] = 'write';
        return acc;
      }, {} as Record<ModulePermission, PermissionLevel>);

      const employeesCollectionRef = collection(firestore, `companies/${newCompanyRef.id}/employees`);
      const newEmployeeRef = doc(employeesCollectionRef, newUserId);
      const userMapDocRef = doc(firestore, `users/${newUserId}`);

      const batch = writeBatch(firestore);

      batch.set(newEmployeeRef, {
        username: adminUsername,
        email: adminEmail,
        role: 'Admin',
        companyId: newCompanyRef.id,
        permissions: adminPermissions,
      });

      batch.set(userMapDocRef, { companyId: newCompanyRef.id });

      batch.set(newCompanyRef, { name: companyName, ownerId: newUserId, isMultiLocation: false, locations: [], businessType, saleCounter: 0 });

      await batch.commit();

      try {
        const fbToken = await auth.currentUser?.getIdToken();
        await fetch('/api/email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${fbToken}`
          },
          body: JSON.stringify({
            to: adminEmail,
            subject: '🎉 Bem-vindo ao MajorStockX!',
            type: 'WELCOME',
            companyName: companyName,
            companyId: newCompanyRef.id,
          }),
        });
      } catch (emailError) {
        console.warn("Falha ao enviar e-mail de boas-vindas, mas o registo foi bem-sucedido:", emailError);
      }

      return true;
    } catch (error: any) {
      console.error('Registration error: ', error);
      let message = 'Ocorreu um erro inesperado durante o registo.';
      if (error.code === 'auth/email-already-in-use') {
        message = 'Este endereço de email já está a ser utilizado.';
      } else if (error.message.includes('Uma empresa com este nome')) {
        message = error.message;
      }
      toast({ variant: 'destructive', title: 'Erro no Registo', description: message });
      return false;
    }
  };

  const canView = (module: ModulePermission) => {
    if (!user) return false;
    if (user.role === 'Admin' || user.role === 'Dono') return true;
    const level = user.permissions?.[module];
    return level === 'read' || level === 'write';
  };

  const canEdit = (module: ModulePermission) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    if (user.role === 'Dono') return false;
    return user.permissions?.[module] === 'write';
  };


  const productsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/products`);
  }, [firestore, companyId]);

  const salesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/sales`);
  }, [firestore, companyId]);

  const productionsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/productions`);
  }, [firestore, companyId]);

  const ordersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/orders`);
  }, [firestore, companyId]);

  const stockMovementsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/stockMovements`);
  }, [firestore, companyId]);

  const catalogProductsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/catalogProducts`);
  }, [firestore, companyId]);

  const catalogCategoriesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/catalogCategories`);
  }, [firestore, companyId]);

  const rawMaterialsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/rawMaterials`);
  }, [firestore, companyId]);

  const recipesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `companies/${companyId}/recipes`);
  }, [firestore, companyId]);

  const companyDocRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return doc(firestore, `companies`, companyId);
  }, [firestore, companyId]);

  useEffect(() => {
    if (!productsCollectionRef) return;

    const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
      const isSyncing = snapshot.metadata.hasPendingWrites;

      if (wasSyncing.current && !isSyncing) {
        toast({
          title: 'Sincronizado!',
          description: 'As suas alterações foram guardadas no servidor.',
        });
      }

      wasSyncing.current = isSyncing;
    }, (error) => {
      console.error("Sync listener error:", error);
    });

    return () => unsubscribe();
  }, [productsCollectionRef, toast]);


  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsCollectionRef);
  const { data: salesData, isLoading: salesLoading } = useCollection<Sale>(salesCollectionRef);
  const { data: productionsData, isLoading: productionsLoading } = useCollection<Production>(productionsCollectionRef);
  const { data: ordersData, isLoading: ordersLoading } = useCollection<Order>(ordersCollectionRef);
  const { data: stockMovementsData, isLoading: stockMovementsLoading } = useCollection<StockMovement>(stockMovementsCollectionRef);
  const { data: catalogProductsData, isLoading: catalogProductsLoading } = useCollection<CatalogProduct>(catalogProductsCollectionRef);
  const { data: catalogCategoriesData, isLoading: catalogCategoriesLoading } = useCollection<CatalogCategory>(catalogCategoriesCollectionRef);
  const { data: rawMaterialsData, isLoading: rawMaterialsLoading } = useCollection<RawMaterial>(rawMaterialsCollectionRef);
  const { data: recipesData, isLoading: recipesLoading } = useCollection<Recipe>(recipesCollectionRef);

  const products = useMemo(() => {
    if (!productsData) return [];

    const productMap = new Map<string, Product & { sourceIds: string[] }>();

    // Filter out deleted items FIRST
    const activeProducts = productsData.filter(p => !p.deletedAt);

    activeProducts.forEach(p => {
      const key = `${p.name}|${p.location || 'default'}`;
      // Ensure instanceId is ALWAYS present and unique-ish for React keys
      const productWithInstanceId = { ...p, instanceId: p.id || `inst-${p.name}-${p.location}` } as Product;

      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.stock += productWithInstanceId.stock;
        existing.reservedStock += productWithInstanceId.reservedStock;
        if (productWithInstanceId.id && !existing.sourceIds?.includes(productWithInstanceId.id)) {
          existing.sourceIds = [...(existing.sourceIds || []), productWithInstanceId.id];
        }
      } else {
        productMap.set(key, { ...productWithInstanceId, sourceIds: productWithInstanceId.id ? [productWithInstanceId.id] : [] });
      }
    });

    return Array.from(productMap.values());
  }, [productsData]);

  useEffect(() => {
    if (companyDocRef) {
      const unsub = onSnapshot(companyDocRef, (doc) => {
        if (doc.exists()) {
          setCompanyData({ id: doc.id, ...doc.data() } as Company);
        }
      });
      return () => unsub();
    }
  }, [companyDocRef]);

  const businessStartDate = useMemo(() => {
    if (!salesData || salesData.length === 0) return null;
    return salesData.reduce((earliest, currentSale) => {
      const currentDate = new Date(currentSale.date);
      return currentDate < earliest ? currentDate : earliest;
    }, new Date(salesData[0].date));
  }, [salesData]);

  useEffect(() => {
    const end = new Date();
    const start = subMonths(end, 5);
    const monthInterval = eachMonthOfInterval({ start, end });

    if (!salesData) {
      const emptyData = monthInterval.map(d => ({
        name: format(d, 'MMM', { locale: pt }).replace('.', ''),
        vendas: 0,
      }));
      setMonthlySalesChartData(emptyData);
      return;
    }

    const chartData = monthInterval.map(monthStart => {
      const monthSales = salesData.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate.getFullYear() === monthStart.getFullYear() && saleDate.getMonth() === monthStart.getMonth();
      }).reduce((sum, s) => sum + s.totalValue, 0);

      const monthName = format(monthStart, 'MMM', { locale: pt });
      return {
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1).replace('.', ''),
        vendas: monthSales,
      };
    });
    setMonthlySalesChartData(chartData);

  }, [salesData]);

  const dashboardStats = useMemo(() => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const monthlySales = salesData?.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
    }) || [];

    const monthlySalesValue = monthlySales.reduce((sum, sale) => {
      return sum + (sale.amountPaid ?? sale.totalValue);
    }, 0);
    const monthlySalesCount = monthlySales.length;
    const averageTicket = monthlySalesCount > 0 ? monthlySalesValue / monthlySalesCount : 0;

    const totalInventoryValue = products?.reduce((sum, p) => sum + (p.stock * p.price), 0) || 0;
    const totalItemsInStock = products?.reduce((sum, p) => sum + p.stock, 0) || 0;

    const pendingOrders = ordersData?.filter(o => o.status === 'Pendente').length || 0;
    const readyForTransfer = productionsData?.filter(p => p.status === 'Concluído').length || 0;

    return {
      monthlySalesValue,
      averageTicket,
      totalInventoryValue,
      totalItemsInStock,
      pendingOrders,
      readyForTransfer,
    };
  }, [salesData, products, ordersData, productionsData]);


  const checkStockAndNotify = useCallback(async (product: Product) => {
    const settings = companyData?.notificationSettings;
    const availableStock = product.stock - (product.reservedStock || 0);

    const isCritical = availableStock <= (product.criticalStockThreshold || 0);
    if (!isCritical || !settings?.onCriticalStock) {
      return;
    }

    if (!settings.email || settings.email.trim() === '') {
      toast({
        variant: "destructive",
        title: "E-mail de Notificação em Falta",
        description: `O produto ${product.name} está com stock crítico, mas não há um e-mail de notificação configurado nos Ajustes.`,
      });
      return;
    }

    await triggerEmailAlert({
      type: 'CRITICAL',
      productName: product.name,
      quantity: availableStock,
      location: locations.find(l => l.id === product.location)?.name || 'Principal',
      threshold: product.criticalStockThreshold,
    });
  }, [companyData, locations, triggerEmailAlert, toast]);

  const addProduct = useCallback(
    (newProductData: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock' | 'sourceIds'>) => {
      if (!productsCollectionRef || !firestore || !user || !companyId) return Promise.resolve();

      const { name, location, stock: newStock } = newProductData;

      const processAdd = async () => {
        try {
          // 1. Move Robust Check and Query OUTSIDE the transaction
          let existingProductId: string | null = null;

          if (productsData) {
            const normalizedNewName = normalizeString(name);
            const targetLoc = location || "";

            const match = productsData.find(p =>
              normalizeString(p.name) === normalizedNewName &&
              (p.location === targetLoc || (!p.location && !targetLoc))
            );

            if (match) {
              existingProductId = match.id || null;
            }
          }

          if (!existingProductId) {
            const q = query(productsCollectionRef, where("name", "==", name), where("location", "==", location || ""));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              existingProductId = querySnapshot.docs[0].id;
            }
          }

          let finalProductId: string | null = null;

          await runTransaction(firestore, async (transaction) => {
            // 2. READ FIRST
            const docRef = existingProductId ? doc(productsCollectionRef as CollectionReference, existingProductId) : doc(productsCollectionRef as CollectionReference);
            const existingDocSnap = await transaction.get(docRef);
            const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

            // 3. APPLY LOGIC AND WRITE LAST
            if (existingDocSnap.exists()) {
              finalProductId = docRef.id;
              const existingData = existingDocSnap.data() as Product;
              const oldStock = existingData.stock || 0;
              const updateData: Record<string, any> = { stock: oldStock + newStock, lastUpdated: new Date().toISOString() };
              // Preserve imageUrl if provided with the new product data
              if (newProductData.imageUrl) {
                updateData.imageUrl = newProductData.imageUrl;
              }
              transaction.update(docRef, updateData);
            } else {
              const newProduct: Omit<Product, 'id' | 'instanceId' | 'sourceIds'> = {
                ...newProductData,
                lastUpdated: new Date().toISOString(),
                reservedStock: 0,
              };
              transaction.set(docRef, newProduct);
              finalProductId = docRef.id;
            }

            const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
              productId: finalProductId!,
              productName: name,
              type: 'IN',
              quantity: newStock,
              toLocationId: location,
              reason: existingDocSnap.exists() ? `Entrada de novo lote (Match)` : `Criação de novo produto`,
              userId: user.id,
              userName: user.username,
            };
            const movementDocRef = doc(movementsRef as CollectionReference);
            transaction.set(movementDocRef, { ...movement, timestamp: serverTimestamp() });
          });


          addNotification({
            type: 'production',
            message: `Inventário atualizado para: ${name}`,
            href: '/inventory',
          });

        } catch (error) {
          console.error("Failed to add/update product:", error);
          toast({
            variant: "destructive",
            title: "Erro ao atualizar inventário",
            description: "Não foi possível guardar as alterações.",
          });
        }
      };

      return processAdd();
    },
    [productsCollectionRef, firestore, user, companyId, addNotification, toast]
  );

  const updateProduct = useCallback(async (instanceId: string, updatedData: Partial<Product>) => {
    if (!productsCollectionRef || !instanceId || !firestore) return;

    const productToUpdate = products.find(p => p.instanceId === instanceId);
    if (!productToUpdate || !productToUpdate.sourceIds) return;

    const batch = writeBatch(firestore);
    const { stock, ...restOfData } = updatedData;

    // Remove undefined values to prevent Firestore errors
    const safeData = Object.entries(restOfData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, any>);

    productToUpdate.sourceIds.forEach(id => {
      const docRef = doc(productsCollectionRef, id);
      batch.update(docRef, { ...safeData, lastUpdated: new Date().toISOString() });
    });

    if (stock !== undefined) {
      const firstDocRef = doc(productsCollectionRef as CollectionReference, productToUpdate.sourceIds[0]);
      batch.update(firstDocRef, { stock });

      for (let i = 1; i < productToUpdate.sourceIds.length; i++) {
        const otherDocRef = doc(productsCollectionRef as CollectionReference, productToUpdate.sourceIds[i]);
        batch.update(otherDocRef, { stock: 0, reservedStock: 0 });
      }
    }

    await batch.commit();

    const fullProduct = products.find(p => p.id === instanceId);
    if (fullProduct) {
      const productForNotification = { ...fullProduct, ...updatedData };
      checkStockAndNotify(productForNotification);
    }
  }, [productsCollectionRef, products, checkStockAndNotify, firestore]);

  const deleteProduct = useCallback(async (instanceId: string) => {
    if (!productsCollectionRef || !instanceId || !firestore || !user) return;
    const productToDelete = products.find(p => p.instanceId === instanceId);
    if (!productToDelete) return;

    const batch = writeBatch(firestore);

    const idsToDelete = productToDelete.sourceIds && productToDelete.sourceIds.length > 0
      ? productToDelete.sourceIds
      : [productToDelete.id || instanceId];

    idsToDelete.forEach(id => {
      if (id) {
        const docRef = doc(productsCollectionRef as CollectionReference, id);
        batch.update(docRef, {
          deletedAt: new Date().toISOString(),
          deletedBy: user.username
        });
      }
    });

    try {
      await batch.commit();
      toast({ title: 'Produto movido para a Lixeira', description: 'Pode restaurá-lo nas Definições.' });
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({ variant: 'destructive', title: 'Erro ao apagar', description: 'Tente novamente.' });
    }
  }, [productsCollectionRef, products, firestore, user, toast]);

  const clearProductsCollection = useCallback(async () => {
    if (!productsCollectionRef || !firestore || !user) return;
    const batch = writeBatch(firestore);
    let count = 0;

    products.forEach(product => {
      const idsToDelete = product.sourceIds && product.sourceIds.length > 0
        ? product.sourceIds
        : [product.id || product.instanceId];

      idsToDelete.forEach(id => {
        if (id) {
          const docRef = doc(productsCollectionRef as CollectionReference, id);
          batch.update(docRef, {
            deletedAt: new Date().toISOString(),
            deletedBy: user.username
          });
          count++;
        }
      });
    });

    if (count === 0) return;

    try {
      await batch.commit();
      toast({
        title: "Inventário Limpo",
        description: `${count} produtos movidos para a lixeira.`,
      });
    } catch (error) {
      console.error("Error clearing inventory:", error);
      toast({
        variant: "destructive",
        title: "Erro ao Limpar",
        description: "Não foi possível limpar o inventário.",
      });
    }
  }, [productsCollectionRef, products, firestore, user, toast]);

  const auditStock = useCallback(async (product: Product, physicalCount: number, reason: string) => {
    console.log("auditStock called", { product, physicalCount, reason, firestore: !!firestore, companyId, user: !!user });

    if (!firestore) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro de conexão: Firestore não disponível.' });
      return;
    }
    if (!companyId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro de sessão: ID da empresa em falta.' });
      return;
    }
    if (!user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro de sessão: Utilizador não identificado.' });
      return;
    }
    if (!product.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Produto inválido: ID em falta.' });
      return;
    }

    const productRef = doc(firestore, `companies/${companyId}/products`, product.id);
    const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

    const systemCountBefore = product.stock;
    const adjustment = physicalCount - systemCountBefore;

    // If adjustment is 0, we still log the audit confirmation.
    if (adjustment === 0) {
      // toast({ title: 'Stock Verificado', description: 'A contagem física confirma o stock do sistema.' });
      // Proceed to log
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        // 1. READ FIRST
        const pSnap = await transaction.get(productRef);
        if (!pSnap.exists()) {
          throw new Error("Produto não encontrado na base de dados para auditoria.");
        }
        const freshData = pSnap.data() as Product;
        const currentSystemStock = freshData.stock || 0;
        const realAdjustment = physicalCount - currentSystemStock;

        // 2. WRITE LAST
        transaction.update(productRef, { stock: physicalCount, lastUpdated: new Date().toISOString() });

        const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
          productId: product.id!,
          productName: product.name,
          type: 'ADJUSTMENT',
          quantity: realAdjustment,
          toLocationId: product.location,
          reason: reason,
          userId: user.id,
          userName: user.username,
          isAudit: true,
          systemCountBefore: currentSystemStock,
          physicalCount: physicalCount,
        };
        transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });

        // Use fresh data for post-transaction logic
        checkStockAndNotify({ ...freshData, stock: physicalCount });
      });

      toast({ title: 'Auditoria Concluída', description: `O stock de ${product.name} foi ajustado.` });

    } catch (error) {
      console.error('Audit transaction failed: ', error);
      toast({ variant: 'destructive', title: 'Erro na Auditoria', description: (error as Error).message });
    }

  }, [firestore, companyId, user, toast, checkStockAndNotify]);

  const transferStock = useCallback(async (productName: string, fromLocationId: string, toLocationId: string, quantity: number) => {
    if (!firestore || !companyId || !user) return;

    const fromProduct = products.find(p => p.name === productName && p.location === fromLocationId);
    if (!fromProduct || !fromProduct.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Produto de origem não encontrado.' });
      return;
    }
    if (fromProduct.stock - fromProduct.reservedStock < quantity) {
      toast({ variant: 'destructive', title: 'Stock Insuficiente', description: `Disponível: ${fromProduct.stock - fromProduct.reservedStock}` });
      return;
    }

    const toProduct = products.find(p => p.name === productName && p.location === toLocationId);

    try {
      await runTransaction(firestore, async (transaction) => {
        const productsRef = collection(firestore, `companies/${companyId}/products`);
        const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

        const fromDocRef = doc(productsRef, fromProduct.id!);
        const toDocRef = toProduct?.id ? doc(productsRef, toProduct.id) : doc(productsRef);

        // 1. READ ALL FIRST
        const fromSnap = await transaction.get(fromDocRef);
        const toSnap = toProduct?.id ? await transaction.get(toDocRef) : null;

        if (!fromSnap.exists()) {
          throw new Error("Produto de origem não encontrado na base de dados.");
        }

        const freshFromData = fromSnap.data() as Product;
        const freshToData = toSnap?.exists() ? toSnap.data() as Product : null;

        // 2. VALIDATE AND CALCULATE
        if ((freshFromData.stock || 0) < quantity) {
          throw new Error(`Stock insuficiente em ${fromLocationId}. Disponível: ${freshFromData.stock}`);
        }

        const newFromStock = freshFromData.stock - quantity;

        // 3. WRITE ALL LAST
        transaction.update(fromDocRef, { stock: newFromStock, lastUpdated: new Date().toISOString() });

        if (freshToData) {
          transaction.update(toDocRef, { stock: (freshToData.stock || 0) + quantity, lastUpdated: new Date().toISOString() });
        } else {
          const { id, instanceId, stock, reservedStock, location: _, lastUpdated: __, ...restOfProduct } = freshFromData;
          transaction.set(toDocRef, {
            ...restOfProduct,
            location: toLocationId,
            stock: quantity,
            reservedStock: 0,
            lastUpdated: new Date().toISOString()
          });
        }

        const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
          productId: fromProduct.id!,
          productName,
          type: 'TRANSFER',
          quantity,
          fromLocationId,
          toLocationId,
          reason: `Transferência manual`,
          userId: user.id,
          userName: user.username,
        };
        transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });

        // Side effect post-transaction logic
        checkStockAndNotify({ ...freshFromData, stock: newFromStock });
      });


      toast({ title: 'Transferência Concluída' });
    } catch (error) {
      console.error('Error transferring stock:', error);
      toast({ variant: 'destructive', title: 'Erro na Transferência', description: (error as Error).message });
    }
  }, [firestore, companyId, user, products, toast, checkStockAndNotify]);





  const updateProductStock = useCallback(async (productName: string, quantity: number, locationId?: string) => {
    if (!firestore || !companyId || !user) return;
    const targetLocation = locationId || (isMultiLocation && locations.length > 0 ? locations[0].id : 'Principal');
    const catalogProduct = catalogProductsData?.find(p => p.name === productName);
    const existingInstance = products.find(p => p.name === productName && p.location === targetLocation);

    const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

    try {
      await runTransaction(firestore, async (transaction) => {
        let docRef: DocumentReference;
        let freshData: Product | null = null;
        const productsRef = collection(firestore, `companies/${companyId}/products`);

        if (existingInstance && existingInstance.id) {
          docRef = doc(productsRef, existingInstance.id);
          const pSnap = await transaction.get(docRef);
          if (pSnap.exists()) {
            freshData = pSnap.data() as Product;
          }
        } else {
          docRef = doc(productsRef);
        }

        if (freshData) {
          const newStock = (freshData.stock || 0) + quantity;
          transaction.update(docRef, { stock: newStock, lastUpdated: new Date().toISOString() });
          checkStockAndNotify({ ...freshData, stock: newStock });
        } else {
          let productDataToUse: any = {};
          if (catalogProduct) {
            const { id, ...rest } = catalogProduct;
            productDataToUse = rest;
          } else {
            const blueprint = products.find(p => p.name === productName);
            if (blueprint) {
              const { id, instanceId, stock, reservedStock, location, lastUpdated, ...rest } = blueprint;
              productDataToUse = rest;
            } else {
              productDataToUse = { name: productName, category: 'Geral', price: 0, unit: 'un', lowStockThreshold: 5, criticalStockThreshold: 2 };
            }
          }

          transaction.set(docRef, {
            ...productDataToUse,
            stock: quantity,
            reservedStock: 0,
            location: targetLocation,
            lastUpdated: new Date().toISOString()
          });
        }

        const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
          productId: docRef.id,
          productName,
          type: 'IN',
          quantity,
          toLocationId: targetLocation,
          reason: freshData ? `Produção de Lote: ${quantity} unidades` : `Início de Produção: ${quantity} unidades`,
          userId: user.id,
          userName: user.username,
        };
        transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
      });
    } catch (e: any) {
      console.error("Error updating product stock:", e);
      toast({ variant: 'destructive', title: 'Erro ao Atualizar Stock', description: e.message });
    }


    addNotification({
      type: 'production',
      message: `${quantity} unidades de ${productName} foram produzidas.`,
      href: '/production',
    });
  }, [firestore, companyId, products, catalogProductsData, isMultiLocation, locations, toast, user, checkStockAndNotify, addNotification]);

  const updateCompany = useCallback(async (details: Partial<Company>) => {
    if (companyDocRef) {
      updateDocumentNonBlocking(companyDocRef, details);
    }
  }, [companyDocRef]);

  const addSale = useCallback(async (newSaleData: Omit<Sale, 'id' | 'guideNumber'>, reserveStock = true) => {
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

    // This is a read outside the transaction to get the document reference.
    const productSnapshot = reserveStock ? await getDocs(productQuery) : null;
    if (reserveStock && productSnapshot && productSnapshot.empty) {
      throw new Error(`Produto "${newSaleData.productName}" não encontrado no estoque para a localização selecionada.`);
    }
    const productDocRef = productSnapshot ? productSnapshot.docs[0].ref : null;

    await runTransaction(firestore, async (transaction) => {
      const companyDoc = await transaction.get(companyDocRef);
      if (!companyDoc.exists()) {
        throw new Error("Documento da empresa não encontrado.");
      }
      const currentCompanyData = companyDoc.data();
      const newSaleCounter = (currentCompanyData.saleCounter || 0) + 1;

      const guideNumber = `GT-${String(newSaleCounter).padStart(6, '0')}`;
      guideNumberForOuterScope = guideNumber;

      if (reserveStock && productDocRef) {
        const productDoc = await transaction.get(productDocRef);
        if (!productDoc.exists()) {
          throw new Error(`Produto "${newSaleData.productName}" não encontrado no estoque.`);
        }
        const productData = productDoc.data() as Product;
        const availableStock = productData.stock - productData.reservedStock;

        if (availableStock < newSaleData.quantity) {
          throw new Error(`Estoque insuficiente. Disponível: ${availableStock}.`);
        }

        const newReservedStock = productData.reservedStock + newSaleData.quantity;
        transaction.update(productDoc.ref, { reservedStock: newReservedStock });
      }

      transaction.update(companyDocRef, { saleCounter: newSaleCounter });
      transaction.set(newSaleRef, { ...newSaleData, guideNumber });
    });

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
    }

  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, companyData, toast, triggerEmailAlert]);

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
    }
  ) => {
    if (!firestore || !companyId || !productsCollectionRef || !user) throw new Error("Firestore não está pronto.");
    if (!items || items.length === 0) throw new Error("O carrinho está vazio.");

    const salesCollectionRef = collection(firestore, `companies/${companyId}/sales`);
    const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);
    const companyDocRef = doc(firestore, `companies/${companyId}`);

    let guideNumberForOuterScope: string | null = null;
    let createdSalesForOuterScope: Sale[] = [];

    await runTransaction(firestore, async (transaction) => {
      // 1. READS (All reads must come before writes)
      const companyDoc = await transaction.get(companyDocRef);
      if (!companyDoc.exists()) throw new Error("Empresa não encontrada.");

      const productReads = items.map(item => transaction.get(doc(productsCollectionRef, item.productId)));
      const productSnaps = await Promise.all(productReads);

      // 2. VALIDATION & LOGIC
      const currentCompanyData = companyDoc.data();
      const newSaleCounter = (currentCompanyData.saleCounter || 0) + 1;
      const guideNumber = `GT-${String(newSaleCounter).padStart(6, '0')}`;
      guideNumberForOuterScope = guideNumber;

      const salesToCreate: Sale[] = [];
      const movementsToCreate: any[] = [];
      const productUpdates: { ref: DocumentReference; data: any }[] = [];

      productSnaps.forEach((pSnap, index) => {
        if (!pSnap.exists()) {
          throw new Error(`Produto "${items[index].productName}" (ID: ${items[index].productId}) não encontrado.`);
        }
        const productData = pSnap.data() as Product;
        const item = items[index];

        const availableStock = productData.stock - productData.reservedStock;
        if (availableStock < item.quantity) {
          throw new Error(`Stock insuficiente para "${item.productName}". Disponível: ${availableStock}.`);
        }

        const newReservedStock = productData.reservedStock + item.quantity;

        productUpdates.push({
          ref: pSnap.ref,
          data: { reservedStock: newReservedStock, lastUpdated: new Date().toISOString() }
        });

        const newSaleRef = doc(salesCollectionRef); // Auto-ID
        const sale: Sale = {
          id: newSaleRef.id,
          guideNumber,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalValue: item.subtotal,
          subtotal: item.subtotal,
          date: new Date().toISOString(),
          status: 'Pago', // Default to Paid for POS/Bulk
          paymentMethod: 'Numerário', // Default, should be passed in saleData ideally
          location: item.location || productData.location || (locations.length > 0 ? locations[0].id : 'Principal'),
          unit: item.unit || productData.unit || 'un',
          soldBy: user.username,
          documentType: saleData.documentType,
          clientName: saleData.clientName,
          customerId: saleData.customerId,
          notes: saleData.notes,
        };

        salesToCreate.push(sale);
        createdSalesForOuterScope.push(sale);

        // We don't create movement here for RESERVED stock, only when picked up? 
        // Logic in addSale updates reservedStock. Logic in confirmSalePickup deducts stock and creates movement.
        // Assuming bulk sale (POS) is immediate pickup? 
        // If it's POS, usually stock is deducted immediately. 
        // However, addSale logic reserves it. 
        // If we want immediate deduction, we should do it here. 
        // But to keep consistency with "Confirm Pickup" flow, we might just reserve. 
        // WAITING: If POS, we usually want it DONE. 
        // Let's stick to RESERVING logic to match `addSale`, or check if `addSale` has an option.
        // `addSale` has `reserveStock` param. 
        // For POS, if the customer takes it, we should probably confirm pickup immediately?
        // But for now, let's just create the sale (which reserves stock) and let the user "Confirm Pickup" or we auto-confirm?
        // To be safe and consistent with existing flow: Create Sale (Reserved). 
        // The user can then "Deliver" it. 
        // OR: If it's POS, maybe we auto-confirm? 
        // Let's just do Reserve for now to be safe.
      });

      // 3. WRITES
      transaction.update(companyDocRef, { saleCounter: newSaleCounter });

      productUpdates.forEach(update => {
        transaction.update(update.ref, update.data);
      });

      salesToCreate.forEach(sale => {
        transaction.set(doc(salesCollectionRef, sale.id), sale);
      });
    });

    // Post-transaction UI/Notifications
    if (guideNumberForOuterScope && createdSalesForOuterScope.length > 0) {
      toast({
        title: "Venda Registada!",
        description: `Guia ${guideNumberForOuterScope} gerada com ${items.length} itens.`,
      });
      // Trigger alerts or downloads if needed
    }

  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, companyData, toast, triggerEmailAlert]);

  const confirmSalePickup = useCallback(async (sale: Sale) => {
    if (!firestore || !companyId || !productsCollectionRef || !user) throw new Error("Firestore não está pronto.");

    const saleRef = doc(firestore, `companies/${companyId}/sales`, sale.id);
    const saleSnap = await getDoc(saleRef);
    if (!saleSnap.exists()) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Venda não encontrada.' });
      return;
    }
    const freshSale = saleSnap.data() as Sale;

    if (freshSale.status === 'Levantado') {
      toast({
        title: "Já Levantado",
        description: "Esta venda já foi marcada como levantada. O stock não foi alterado.",
      });
      return;
    }

    const amountPaid = freshSale.amountPaid ?? 0;
    if ((freshSale.totalValue - amountPaid) > 0.5) {
      toast({
        variant: "destructive",
        title: 'Pagamento Incompleto',
        description: `Não é possível confirmar o levantamento. O cliente ainda precisa de pagar ${formatCurrency(freshSale.totalValue - amountPaid)}.`,
        duration: 6000,
      });
      return;
    }

    const productQuery = query(
      productsCollectionRef,
      where("name", "==", freshSale.productName),
      where("location", "==", freshSale.location || (isMultiLocation ? locations[0]?.id : 'Principal'))
    );
    const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

    const productQuerySnapshot = await getDocs(productQuery);
    if (productQuerySnapshot.empty) {
      throw new Error(`Produto "${freshSale.productName}" não encontrado para atualizar estoque.`);
    }
    const productDocRef = productQuerySnapshot.docs[0].ref;

    await runTransaction(firestore, async (transaction) => {
      // 1. READS
      const pSnap = await transaction.get(productDocRef);
      if (!pSnap.exists()) {
        throw new Error(`Produto "${freshSale.productName}" não encontrado na base de dados.`);
      }
      const productData = pSnap.data() as Product;

      // 2. CALCULATIONS
      const newStock = productData.stock - freshSale.quantity;
      let newReservedStock = productData.reservedStock - freshSale.quantity;

      if (newReservedStock < 0) {
        console.warn(`[Audit] Negative reserved stock detected for ${productData.name} during pickup. Clamped to 0. Was: ${productData.reservedStock}, Deducting: ${freshSale.quantity}`);
        newReservedStock = 0;
      }

      if (newStock < 0) {
        throw new Error("Erro Crítico: Stock insuficiente para realizar o levantamento.");
      }

      // 3. WRITES
      transaction.update(productDocRef, { stock: newStock, reservedStock: newReservedStock, lastUpdated: new Date().toISOString() });
      transaction.update(saleRef, { status: 'Levantado' });

      // Side effect post-transaction logic
      checkStockAndNotify({ ...productData, stock: newStock });

      const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
        productId: productDocRef.id,
        productName: freshSale.productName,
        type: 'OUT',
        quantity: -freshSale.quantity,
        fromLocationId: productData.location,
        reason: `Venda #${freshSale.guideNumber}`,
        userId: user.id,
        userName: user.username,
      };
      transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
    });

  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, user, checkStockAndNotify, toast]);

  const addProduction = useCallback(async (prodData: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => {
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
          status: 'Concluído',
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

  const addProductionLog = useCallback((orderId: string, logData: { quantity: number; notes?: string }) => {
    if (!firestore || !companyId || !user || !ordersData) return;

    const orderToUpdate = ordersData.find(o => o.id === orderId);

    if (orderToUpdate) {
      const orderDocRef = doc(firestore, `companies/${companyId}/orders`, orderId);
      const productionsRef = collection(firestore, `companies/${companyId}/productions`);

      const batch = writeBatch(firestore);

      const newLog: ProductionLog = {
        id: `log-${Date.now()}`,
        date: new Date().toISOString(),
        quantity: logData.quantity,
        notes: logData.notes,
        registeredBy: user.username || 'Desconhecido',
      };
      const newQuantityProduced = orderToUpdate.quantityProduced + logData.quantity;

      batch.update(orderDocRef, {
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
        orderId: orderId // Link production to order
      };
      batch.set(doc(productionsRef), newProduction);

      batch.commit().then(() => {
        toast({
          title: "Registo de Produção Adicionado",
          description: `${logData.quantity} unidades de "${orderToUpdate?.productName}" foram registadas.`,
        });
        addNotification({
          type: 'production',
          message: `Produção de ${orderToUpdate.productName} atualizada.`,
          href: `/orders?id=${orderId}`
        })
      }).catch(error => {
        console.error("Error adding production log: ", error);
        toast({
          variant: "destructive",
          title: "Erro ao Registar",
          description: "Não foi possível guardar o registo de produção.",
        });
      });
    }
  }, [firestore, companyId, user, ordersData, toast, addNotification]);

  const addCatalogProduct = useCallback(async (productData: Omit<CatalogProduct, 'id'>) => {
    if (!catalogProductsCollectionRef) {
      throw new Error("Referência da coleção do catálogo não disponível.");
    }
    try {
      addDocumentNonBlocking(catalogProductsCollectionRef, productData);
    } catch (e) {
      console.error("Error adding catalog product:", e);
      throw new Error("Não foi possível adicionar o produto ao catálogo.");
    }
  }, [catalogProductsCollectionRef]);

  const addCatalogCategory = useCallback(async (categoryName: string) => {
    if (!catalogCategoriesCollectionRef || !catalogCategoriesData) return;
    const trimmedName = categoryName.trim();
    if (!trimmedName) return;

    const exists = catalogCategoriesData.some(c => c.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      return;
    }

    try {
      addDocumentNonBlocking(catalogCategoriesCollectionRef, { name: trimmedName });
    } catch (e) {
      console.error("Error adding catalog category:", e);
      throw new Error("Não foi possível adicionar a nova categoria.");
    }
  }, [catalogCategoriesCollectionRef, catalogCategoriesData]);

  const deleteSale = useCallback(async (saleId: string) => {
    if (!firestore || !companyId || !productsCollectionRef || !user) {
      toast({ variant: 'destructive', title: 'Erro', description: 'A base de dados não está pronta.' });
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
      });

      toast({ title: 'Venda enviada para Lixeira', description: 'O stock foi reposto.' });

    } catch (error: any) {
      console.error("Error deleting sale: ", error);
      toast({ variant: 'destructive', title: 'Erro ao Apagar Venda', description: error.message });
    }
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, toast, user]);

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
      const q = query(salesRef, where("status", "in", ["Pago", "Pendente"]));
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

      productsData.forEach(product => {
        const locationKey = product.location || '';
        const key = `${product.name}|${locationKey}`;
        const correctReserved = correctReservedMap.get(key) || 0;

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

  const deleteProduction = useCallback((productionId: string) => {
    if (!productionsCollectionRef) return;
    const docRef = doc(productionsCollectionRef, productionId);
    updateDocumentNonBlocking(docRef, { deletedAt: new Date().toISOString() });
    toast({ title: 'Registo de Produção movido para Lixeira' });
  }, [productionsCollectionRef, toast]);

  const updateProduction = useCallback((productionId: string, data: Partial<Production>) => {
    if (!productionsCollectionRef) return;
    const docRef = doc(productionsCollectionRef, productionId);
    updateDocumentNonBlocking(docRef, data);
    toast({ title: 'Registo de Produção Atualizado' });
  }, [productionsCollectionRef, toast]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!ordersCollectionRef || !firestore || !companyId) return;

    try {
      const orderRef = doc(ordersCollectionRef, orderId);
      const orderSnap = await getDoc(orderRef);

      if (orderSnap.exists()) {
        const orderData = orderSnap.data() as Order;

        // If order is pending or in production, we need to release the Reserved Stock
        if ((orderData.status === 'Pendente' || orderData.status === 'Em produção') && orderData.productId) {
          const productRef = doc(firestore, `companies/${companyId}/products`, orderData.productId);
          await runTransaction(firestore, async (transaction) => {
            const pDoc = await transaction.get(productRef);
            if (pDoc.exists()) {
              const pData = pDoc.data() as Product;
              const currentReserved = pData.reservedStock || 0;
              const quantityToRelease = orderData.quantity;

              // Clamp to 0 to avoid negative stock if data is somehow inconsistent
              const newReserved = Math.max(0, currentReserved - quantityToRelease);

              transaction.update(productRef, {
                reservedStock: newReserved,
                lastUpdated: new Date().toISOString()
              });
            }
            // Perform the soft delete within the transaction or after? 
            // Transaction is safer for stock. 
            // Soft delete is just an update to the order doc.
            transaction.update(orderRef, { deletedAt: new Date().toISOString() });
          });
        } else {
          // Standard soft delete for completed/delivered orders (stock was already handled)
          await updateDocumentNonBlocking(orderRef, { deletedAt: new Date().toISOString() });
        }
        toast({ title: 'Encomenda movida para Lixeira' });
      }
    } catch (e: any) {
      console.error("Error deleting order:", e);
      toast({ variant: 'destructive', title: 'Erro ao Apagar', description: e.message });
    }
  }, [ordersCollectionRef, firestore, companyId, toast]);

  const finalizeOrder = useCallback(async (orderId: string, finalPayment: number) => {
    if (!firestore || !companyId || !user) return;

    try {
      // 1. Get Sale ID (outside transaction query)
      const salesRef = collection(firestore, `companies/${companyId}/sales`);
      const q = query(salesRef, where("orderId", "==", orderId));
      const salesSnap = await getDocs(q);
      const saleDoc = salesSnap.docs[0];

      await runTransaction(firestore, async (transaction) => {
        // --- READS ---

        // 1. Get Order
        const orderRef = doc(firestore, `companies/${companyId}/orders`, orderId);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Encomenda não encontrada.");
        const orderData = orderSnap.data() as Order;

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
        let productRef: DocumentReference | null = null;
        if (orderData.productId) {
          productRef = doc(firestore, `companies/${companyId}/products`, orderData.productId);
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            freshProductData = productSnap.data() as Product;
          }
        }

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

        // 6. Deduct Stock from Inventory
        if (productRef && freshProductData) {
          const currentStock = freshProductData.stock || 0;
          if (currentStock < orderData.quantity) {
            throw new Error(`Stock insuficiente para finalizar a encomenda. Stock actual: ${currentStock}, Necessário: ${orderData.quantity}. Verifique se o produto foi vendido por engano.`);
          }
          const newStock = currentStock - orderData.quantity;
          let newReserved = (freshProductData.reservedStock || 0) - orderData.quantity;
          if (newReserved < 0) newReserved = 0;

          transaction.update(productRef, {
            stock: newStock,
            reservedStock: newReserved,
            lastUpdated: new Date().toISOString()
          });
        }
      });


      toast({ title: 'Encomenda Finalizada', description: 'Stock atualizado e venda registada.' });

    } catch (e: any) {
      console.error("Error finalizing order:", e);
      toast({ variant: 'destructive', title: 'Erro ao Finalizar', description: e.message });
    }
  }, [firestore, companyId, user, toast]);

  const addRawMaterial = useCallback(async (material: Omit<RawMaterial, 'id'>) => {
    if (!rawMaterialsCollectionRef) return;
    addDocumentNonBlocking(rawMaterialsCollectionRef, material);
    toast({ title: 'Matéria-Prima Adicionada' });
  }, [rawMaterialsCollectionRef, toast]);

  const updateRawMaterial = useCallback(async (materialId: string, data: Partial<RawMaterial>) => {
    if (!rawMaterialsCollectionRef) return;
    const docRef = doc(rawMaterialsCollectionRef as CollectionReference, materialId);
    updateDocumentNonBlocking(docRef, data);
    toast({ title: 'Matéria-Prima Atualizada' });
  }, [rawMaterialsCollectionRef, toast]);

  const deleteRawMaterial = useCallback(async (materialId: string) => {
    if (!rawMaterialsCollectionRef) return;
    deleteDocumentNonBlocking(doc(rawMaterialsCollectionRef as CollectionReference, materialId));
    toast({ title: 'Matéria-Prima Removida' });
  }, [rawMaterialsCollectionRef, toast]);

  const addRecipe = useCallback(async (recipe: Omit<Recipe, 'id'>) => {
    if (!recipesCollectionRef) return;
    addDocumentNonBlocking(recipesCollectionRef, recipe);
    toast({ title: 'Receita Adicionada' });
  }, [recipesCollectionRef, toast]);

  const updateRecipe = useCallback(async (recipeId: string, data: Partial<Recipe>) => {
    if (!recipesCollectionRef) return;
    const docRef = doc(recipesCollectionRef as CollectionReference, recipeId);
    updateDocumentNonBlocking(docRef, data);
    toast({ title: 'Receita Atualizada' });
  }, [recipesCollectionRef, toast]);

  /*
  const deleteRecipe = useCallback(async (recipeId: string) => {
    if (!recipesCollectionRef) return;
    deleteDocumentNonBlocking(doc(recipesCollectionRef as CollectionReference, recipeId));
    toast({ title: 'Receita Removida' });
  }, [recipesCollectionRef, toast]);
  */



  const restoreItem = useCallback(async (collectionName: string, id: string) => {
    if (!firestore || !companyId) return;
    const docRef = doc(firestore, `companies/${companyId}/${collectionName}`, id);

    // If it's a sale, we might need to deduct stock again?
    // For simplicity in this iteration, we just restore the record. 
    // Ideally, if we restored stock on delete, we should consume it on restore.
    // This logic is complex for "Undo".
    // Let's implement basic restore (remove deletedAt) first.

    await updateDocumentNonBlocking(docRef, { deletedAt: null, deletedBy: null });
    toast({ title: 'Item Restaurado' });
  }, [firestore, companyId, toast]);

  const hardDelete = useCallback(async (collectionName: string, id: string) => {
    if (!firestore || !companyId) return;
    try {
      const docRef = doc(firestore, `companies/${companyId}/${collectionName}`, id);
      await deleteDoc(docRef); // Force standard delete to ensure it waits and updates
      toast({ title: 'Item Apagado Permanentemente' });
    } catch (error: any) {
      console.error("Hard delete error:", error);
      toast({ variant: 'destructive', title: 'Erro ao Apagar', description: error.message });
    }
  }, [firestore, companyId, toast]);

  const exportCompanyData = useCallback(async () => {
    if (!productsData || !salesData) {
      toast({ variant: 'destructive', title: 'Aguarde', description: 'Os dados ainda estão a carregar.' });
      return;
    }

    const backup = {
      date: new Date().toISOString(),
      company: companyData,
      products: products,
      sales: salesData,
      clients: [], // Assuming separate clients collection later, for now implicit in sales
      version: '1.0'
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `majorstockx-backup-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }, [productsData, salesData, companyData, products, toast]);

  // --- Units & Categories Management ---
  const availableUnits = useMemo(() => {
    const defaultUnits = ['un', 'kg', 'm', 'm²', 'm³', 'L', 'cxs', 'saco', 'rolo', 'cj', 'ton', 'lata', 'galão'];
    const companyUnits = companyData?.validUnits || [];
    // Also include units currently in use by products to prevent data loss or hiding
    const productUnits = productsData?.map(p => p.unit).filter(Boolean) as string[] || [];
    const materialUnits = rawMaterialsData?.map(m => m.unit).filter(Boolean) as string[] || [];

    // Merge unique
    const allUnits = Array.from(new Set([...defaultUnits, ...companyUnits, ...productUnits, ...materialUnits]));
    return allUnits.sort((a, b) => a.localeCompare(b));
  }, [companyData, productsData, rawMaterialsData]);

  const addUnit = useCallback(async (unit: string) => {
    if (!firestore || !companyId) return;
    try {
      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        validUnits: arrayUnion(unit)
      });
      toast({ title: 'Unidade Adicionada', description: `A unidade "${unit}" foi adicionada.` });
    } catch (error) {
      console.error("Error adding unit:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao adicionar unidade." });
    }
  }, [firestore, companyId, toast]);

  const editUnit = useCallback(async (oldUnit: string, newUnit: string) => {
    if (!firestore || !companyId || !oldUnit || !newUnit) return;
    try {
      const batch = writeBatch(firestore);

      const currentValidUnits = companyData?.validUnits || [];
      const updatedValidUnits = Array.from(new Set(currentValidUnits.filter(u => u !== oldUnit).concat(newUnit)));
      const companyRef = doc(firestore, 'companies', companyId);
      batch.update(companyRef, { validUnits: updatedValidUnits });

      const productsToUpdate = productsData?.filter(p => p.unit === oldUnit) || [];
      productsToUpdate.forEach(p => {
        if (p.id) {
          const docRef = doc(firestore, `companies/${companyId}/products`, p.id);
          batch.update(docRef, { unit: newUnit, lastUpdated: new Date().toISOString() });
        }
      });

      const rawMaterialsToUpdate = rawMaterialsData?.filter(r => r.unit === oldUnit) || [];
      rawMaterialsToUpdate.forEach(r => {
        if (r.id) {
          const docRef = doc(firestore, `companies/${companyId}/rawMaterials`, r.id);
          batch.update(docRef, { unit: newUnit });
        }
      });

      await batch.commit();
      toast({ title: 'Unidade Editada', description: `A unidade "${oldUnit}" passou a "${newUnit}".` });
    } catch (error) {
      console.error("Error editing unit:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao editar a unidade." });
    }
  }, [firestore, companyId, toast, companyData, productsData, rawMaterialsData]);

  const removeUnit = useCallback(async (unit: string) => {
    if (!firestore || !companyId || !unit) return;
    try {
      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        validUnits: arrayRemove(unit)
      });
      toast({ title: 'Unidade Removida', description: `A unidade "${unit}" foi removida da lista.` });
    } catch (error) {
      console.error("Error removing unit:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao remover unidade." });
    }
  }, [firestore, companyId, toast]);

  const availableCategories = useMemo(() => {
    const catalogCats = catalogCategoriesData?.map(c => c.name) || [];
    const companyCats = companyData?.validCategories || [];
    const productCats = productsData?.map(p => p.category).filter(Boolean) as string[] || [];

    const allCats = Array.from(new Set([...catalogCats, ...companyCats, ...productCats]));
    return allCats.sort((a, b) => a.localeCompare(b));
  }, [catalogCategoriesData, companyData, productsData]);

  const addCategory = useCallback(async (category: string) => {
    if (!firestore || !companyId) return;
    try {
      // We update company-specific categories to keep it clean
      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        validCategories: arrayUnion(category)
      });
      toast({ title: 'Categoria Adicionada', description: `Categoria "${category}" adicionada.` });
    } catch (error) {
      console.error("Error adding category:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao adicionar categoria." });
    }
  }, [firestore, companyId, toast]);

  const editCategory = useCallback(async (oldCategory: string, newCategory: string) => {
    if (!firestore || !companyId || !oldCategory || !newCategory) return;
    try {
      const batch = writeBatch(firestore);

      const currentValidCategories = companyData?.validCategories || [];
      const updatedValidCategories = Array.from(new Set(currentValidCategories.filter(c => c !== oldCategory).concat(newCategory)));
      const companyRef = doc(firestore, 'companies', companyId);
      batch.update(companyRef, { validCategories: updatedValidCategories });

      const catalogProductsToUpdate = catalogProductsData?.filter(p => p.category === oldCategory) || [];
      catalogProductsToUpdate.forEach(p => {
        if (p.id) {
          const docRef = doc(firestore, `companies/${companyId}/catalogProducts`, p.id);
          batch.update(docRef, { category: newCategory });
        }
      });

      const productsToUpdate = productsData?.filter(p => p.category === oldCategory) || [];
      productsToUpdate.forEach(p => {
        if (p.id) {
          const docRef = doc(firestore, `companies/${companyId}/products`, p.id);
          batch.update(docRef, { category: newCategory, lastUpdated: new Date().toISOString() });
        }
      });

      await batch.commit();
      toast({ title: 'Categoria Editada', description: `A categoria "${oldCategory}" passou a "${newCategory}".` });
    } catch (error) {
      console.error("Error editing category:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao editar a categoria." });
    }
  }, [firestore, companyId, toast, companyData, productsData, catalogProductsData]);

  const removeCategory = useCallback(async (category: string) => {
    if (!firestore || !companyId || !category) return;
    try {
      const companyRef = doc(firestore, 'companies', companyId);
      await updateDoc(companyRef, {
        validCategories: arrayRemove(category)
      });
      toast({ title: 'Categoria Removida', description: `Categoria "${category}" removida.` });
    } catch (error) {
      console.error("Error removing category:", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao remover categoria." });
    }
  }, [firestore, companyId, toast]);

  // Products Merge Tool
  const mergeProducts = useCallback(async (targetProductId: string, sourceProductIds: string[]) => {
    if (!productsCollectionRef || !firestore || !companyId) return;

    try {
      const batch = writeBatch(firestore);
      if (!productsData) return;
      const targetProduct = productsData.find(p => p.id === targetProductId);

      if (!targetProduct) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Produto principal não encontrado.' });
        return;
      }

      let totalStockToAdd = 0;
      let totalReservedToAdd = 0;
      const sourceIdsRecord: string[] = targetProduct.sourceIds || [];

      // Calculate totals and mark sources for deletion
      for (const sourceId of sourceProductIds) {
        const sourceProduct = productsData?.find(p => p.id === sourceId);
        if (sourceProduct) {
          totalStockToAdd += (sourceProduct.stock || 0);
          totalReservedToAdd += (sourceProduct.reservedStock || 0);
          sourceIdsRecord.push(sourceId);

          // Delete source product
          const sourceRef = doc(productsCollectionRef as CollectionReference, sourceId);
          batch.delete(sourceRef);
        }
      }

      // Update target product
      const targetRef = doc(productsCollectionRef as CollectionReference, targetProductId);
      batch.update(targetRef, {
        stock: (targetProduct.stock || 0) + totalStockToAdd,
        reservedStock: (targetProduct.reservedStock || 0) + totalReservedToAdd,
        sourceIds: sourceIdsRecord,
        lastUpdated: new Date().toISOString()
      });

      await batch.commit();
      toast({
        title: 'Produtos Unificados!',
        description: `${sourceProductIds.length} produtos foram fundidos em "${targetProduct.name}".`
      });

    } catch (error) {
      console.error("Error merging products:", error);
      toast({ variant: 'destructive', title: 'Erro ao Unificar', description: 'Ocorreu um erro ao tentar unificar os produtos.' });
    }
  }, [productsCollectionRef, firestore, companyId, productsData, toast]);

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
    user, firebaseUser, companyId, loading: isDataLoading,
    login, logout, resetPassword, registerCompany, profilePicture, setProfilePicture: handleSetProfilePicture,
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
    catalogCategories: catalogCategoriesData || [],
    rawMaterials: rawMaterialsData || [],
    recipes: recipesData || [],
    locations, isMultiLocation, notifications, monthlySalesChartData, dashboardStats,
    businessStartDate,
    chatHistory, setChatHistory,
    addProduct, updateProduct, deleteProduct,
    auditStock, transferStock, updateProductStock, updateCompany, addSale, addBulkSale, confirmSalePickup, addProductionLog,
    addProduction, updateProduction, deleteProduction, deleteOrder, finalizeOrder, deleteSale,
    clearProductsCollection,
    mergeProducts,
    restoreItem,
    hardDelete,
    exportCompanyData,

    markNotificationAsRead, markAllAsRead, clearNotifications, addNotification,
    recalculateReservedStock,
    addCatalogProduct, addCatalogCategory,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    addRecipe,
    updateRecipe,
    // deleteRecipe,

    availableUnits, addUnit, editUnit, removeUnit,
    availableCategories, addCategory, editCategory, removeCategory,

    confirmAction,
  }), [
    user, firebaseUser, companyId, isDataLoading,
    login, logout, resetPassword, registerCompany, profilePicture, handleSetProfilePicture,
    canView, canEdit,
    companyData, productsData, salesData, productionsData, ordersData, stockMovementsData, catalogProductsData, catalogCategoriesData,
    rawMaterialsData, recipesData,
    locations, isMultiLocation, notifications, monthlySalesChartData, dashboardStats,
    businessStartDate,
    chatHistory, setChatHistory,
    addProduct, updateProduct, deleteProduct,
    auditStock, transferStock, updateProductStock, updateCompany, addSale, addBulkSale, confirmSalePickup, addProductionLog,
    addProduction, updateProduction, deleteProduction, deleteOrder, finalizeOrder, deleteSale,
    clearProductsCollection,
    markNotificationAsRead, markAllAsRead, clearNotifications, addNotification,
    recalculateReservedStock,
    addCatalogProduct, addCatalogCategory,
    addRawMaterial,
    updateRawMaterial,
    addRecipe,
    updateRecipe,
    mergeProducts,
    restoreItem,
    exportCompanyData,
    availableUnits, addUnit,
    availableCategories, addCategory,
    confirmAction,
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
