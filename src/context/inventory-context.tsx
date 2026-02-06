

'use client';

import {
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
import type { Product, Location, Sale, Production, ProductionLog, Order, Company, Employee, ModulePermission, PermissionLevel, StockMovement, AppNotification, DashboardStats, InventoryContextType, ChatMessage, RawMaterial, Recipe } from '@/lib/types';
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
} from 'firebase/firestore';
import { allPermissions } from '@/lib/data';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";
import { format, eachMonthOfInterval, subMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { downloadSaleDocument, formatCurrency } from '@/lib/utils';
import {
  addDocumentNonBlocking,
  deleteDocumentNonBlocking,
  updateDocumentNonBlocking
} from '@/firebase/non-blocking-updates';


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
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: targetEmail, subject, ...payload }),
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
        await fetch('/api/email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: adminEmail,
            subject: '🎉 Bem-vindo ao MajorStockX!',
            type: 'WELCOME',
            companyName: companyName,
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
    return query(collection(firestore, `companies/${companyId}/products`));
  }, [firestore, companyId]);

  const salesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return query(collection(firestore, `companies/${companyId}/sales`));
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

    productsData.forEach(p => {
      const key = `${p.name}|${p.location || 'default'}`;
      const productWithInstanceId = { ...p, instanceId: p.id };

      if (productMap.has(key)) {
        const existing = productMap.get(key)!;
        existing.stock += productWithInstanceId.stock;
        existing.reservedStock += productWithInstanceId.reservedStock;
        existing.sourceIds.push(productWithInstanceId.id);
      } else {
        productMap.set(key, { ...productWithInstanceId, sourceIds: [productWithInstanceId.id] });
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
      if (!productsCollectionRef || !firestore || !user || !companyId) return;

      const { name, location, stock: newStock } = newProductData;

      const processAdd = async () => {
        try {
          await runTransaction(firestore, async (transaction) => {
            const q = query(productsCollectionRef, where("name", "==", name), where("location", "==", location || ""));

            const querySnapshot = await getDocs(q);

            let productId: string;
            const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

            if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              productId = existingDoc.id;
              const existingData = existingDoc.data();
              const oldStock = existingData.stock || 0;
              const docRef = doc(productsCollectionRef, productId);

              transaction.update(docRef, { stock: oldStock + newStock, lastUpdated: new Date().toISOString().split('T')[0] });
            } else {
              const newProduct: Omit<Product, 'id' | 'instanceId' | 'sourceIds'> = {
                ...newProductData,
                lastUpdated: new Date().toISOString().split('T')[0],
                reservedStock: 0,
              };
              const newDocRef = doc(productsCollectionRef);
              transaction.set(newDocRef, newProduct);
              productId = newDocRef.id;
            }

            const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
              productId: productId,
              productName: name,
              type: 'IN',
              quantity: newStock,
              toLocationId: location,
              reason: querySnapshot.empty ? `Criação de novo produto` : `Entrada de novo lote`,
              userId: user.id,
              userName: user.username,
            };
            const movementDocRef = doc(movementsRef);
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

      processAdd();
    },
    [productsCollectionRef, firestore, user, companyId, addNotification, toast]
  );

  const updateProduct = useCallback(async (instanceId: string, updatedData: Partial<Product>) => {
    if (!productsCollectionRef || !instanceId || !firestore) return;

    const productToUpdate = products.find(p => p.instanceId === instanceId);
    if (!productToUpdate || !productToUpdate.sourceIds) return;

    const batch = writeBatch(firestore);
    const { stock, ...restOfData } = updatedData;

    productToUpdate.sourceIds.forEach(id => {
      const docRef = doc(productsCollectionRef, id);
      batch.update(docRef, { ...restOfData, lastUpdated: new Date().toISOString().split('T')[0] });
    });

    if (stock !== undefined) {
      const firstDocRef = doc(productsCollectionRef, productToUpdate.sourceIds[0]);
      batch.update(firstDocRef, { stock });

      for (let i = 1; i < productToUpdate.sourceIds.length; i++) {
        const otherDocRef = doc(productsCollectionRef, productToUpdate.sourceIds[i]);
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

  const deleteProduct = useCallback((instanceId: string) => {
    if (!productsCollectionRef || !instanceId || !firestore || !user) return;
    const productToDelete = products.find(p => p.instanceId === instanceId);
    if (!productToDelete || !productToDelete.sourceIds) return;

    const batch = writeBatch(firestore);
    productToDelete.sourceIds.forEach(id => {
      const docRef = doc(productsCollectionRef, id);
      batch.update(docRef, {
        deletedAt: new Date().toISOString(),
        deletedBy: user.username
      });
    });

    batch.commit().then(() => {
      toast({ title: 'Produto movido para a Lixeira', description: 'Pode restaurá-lo nas Definições.' });
    });

  }, [productsCollectionRef, firestore, products, user, toast]);

  const clearCollection = useCallback(async (collectionRef: CollectionReference | null, toastTitle: string) => {
    if (!collectionRef) {
      toast({ variant: "destructive", title: "Erro", description: "Referência da coleção não disponível." });
      return;
    }
    toast({ title: "A limpar...", description: `A apagar todos os registos de ${toastTitle}.` });
    const querySnapshot = await getDocs(collectionRef);
    const batch = writeBatch(firestore);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    toast({ title: "Sucesso!", description: `Todos os registos de ${toastTitle} foram apagados.` });
  }, [firestore, toast]);

  const clearProductsCollection = useCallback(() => clearCollection(productsCollectionRef, "Inventário"), [clearCollection, productsCollectionRef]);
  const clearSales = useCallback(() => clearCollection(salesCollectionRef, "Vendas"), [clearCollection, salesCollectionRef]);
  const clearProductions = useCallback(() => clearCollection(productionsCollectionRef, "Produção"), [clearCollection, productionsCollectionRef]);
  const clearOrders = useCallback(() => clearCollection(ordersCollectionRef, "Encomendas"), [clearCollection, ordersCollectionRef]);
  const clearStockMovements = useCallback(() => clearCollection(stockMovementsCollectionRef, "Histórico de Movimentos"), [clearCollection, stockMovementsCollectionRef]);

  const auditStock = useCallback(async (product: Product, physicalCount: number, reason: string) => {
    if (!firestore || !companyId || !user || !product.id) return;

    const productRef = doc(firestore, `companies/${companyId}/products`, product.id);
    const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

    const systemCountBefore = product.stock;
    const adjustment = physicalCount - systemCountBefore;

    if (adjustment === 0) {
      toast({ title: 'Nenhum ajuste necessário', description: 'A contagem física corresponde ao stock do sistema.' });
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        // 1. Update the product's stock
        transaction.update(productRef, { stock: physicalCount });

        // 2. Create a stock movement record for the audit adjustment
        const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
          productId: product.id!,
          productName: product.name,
          type: 'ADJUSTMENT',
          quantity: adjustment,
          toLocationId: product.location, // An adjustment happens AT a location
          reason: reason,
          userId: user.id,
          userName: user.username,
          isAudit: true,
          systemCountBefore: systemCountBefore,
          physicalCount: physicalCount,
        };
        transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
      });

      toast({ title: 'Auditoria Concluída', description: `O stock de ${product.name} foi ajustado em ${adjustment > 0 ? '+' : ''}${adjustment}.` });

      // Post-transaction notification
      checkStockAndNotify({ ...product, stock: physicalCount });

    } catch (error) {
      console.error('Audit transaction failed: ', error);
      toast({ variant: 'destructive', title: 'Erro na Auditoria', description: 'Não foi possível guardar o ajuste de stock.' });
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
        const newFromStock = fromProduct.stock - quantity;
        transaction.update(fromDocRef, { stock: newFromStock });

        checkStockAndNotify({ ...fromProduct, stock: newFromStock });

        if (toProduct && toProduct.id) {
          const toDocRef = doc(productsRef, toProduct.id);
          transaction.update(toDocRef, { stock: toProduct.stock + quantity });
        } else {
          const { id, instanceId, ...restOfProduct } = fromProduct;
          const newDocRef = doc(productsRef);
          transaction.set(newDocRef, { ...restOfProduct, location: toLocationId, stock: quantity, reservedStock: 0, lastUpdated: new Date().toISOString().split('T')[0] });
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
      });

      toast({ title: 'Transferência Concluída' });
    } catch (error) {
      console.error('Error transferring stock:', error);
      toast({ variant: 'destructive', title: 'Erro na Transferência', description: (error as Error).message });
    }
  }, [firestore, companyId, user, products, toast, checkStockAndNotify]);

  const mergeProducts = useCallback(async (targetProductId: string, sourceProductIds: string[]) => {
    if (!firestore || !companyId || !user) return;
    if (user.role !== 'Admin') {
      toast({ variant: 'destructive', title: 'Acesso Negado', description: 'Apenas administradores podem unir produtos.' });
      return;
    }

    try {
      toast({ title: 'A Unificar...', description: 'Isto pode demorar alguns instantes.' });

      const targetRef = doc(firestore, `companies/${companyId}/products`, targetProductId);
      const targetDoc = await getDoc(targetRef);

      if (!targetDoc.exists()) {
        throw new Error("Produto alvo não encontrado.");
      }

      const targetData = targetDoc.data() as Product;

      await runTransaction(firestore, async (transaction) => {
        let totalStockToAdd = 0;
        let totalReservedToAdd = 0;

        // 1. Calculate stock from sources
        for (const sourceId of sourceProductIds) {
          const sourceRef = doc(firestore, `companies/${companyId}/products`, sourceId);
          const sourceDoc = await transaction.get(sourceRef);
          if (sourceDoc.exists()) {
            const sData = sourceDoc.data() as Product;
            totalStockToAdd += (sData.stock || 0);
            totalReservedToAdd += (sData.reservedStock || 0);
            transaction.delete(sourceRef);
          }
        }

        // 2. Update Target
        transaction.update(targetRef, {
          stock: (targetData.stock || 0) + totalStockToAdd,
          reservedStock: (targetData.reservedStock || 0) + totalReservedToAdd,
          lastUpdated: new Date().toISOString().split('T')[0]
        });

      });

      // 3. Batch Update Collections (Store has limit of 500 ops per batch, so we might need multiple batches for large datasets)
      // For simplicity/safety, we will do one batch per collection for now or assume dataset isn't huge.
      // Ideally we query and update.

      // Since we can't do arbitrary large updates in a transaction easily without reading, and batch interaction is separate.
      // We will perform these updates AFTER the transaction (Eventual Consistency).

      const updateCollectionReferences = async (collectionName: string, fieldName: 'productId' | 'productName', oldValue: string, newValue: string) => {
        // This is tricky because we need to query by sourceId.
        // We loop through sourceProductIds
      };

      const salesRef = collection(firestore, `companies/${companyId}/sales`);
      const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);
      const ordersRef = collection(firestore, `companies/${companyId}/orders`);

      const processReassignment = async (sourceId: string, sourceName: string) => {
        const batch = writeBatch(firestore);
        let opCount = 0;

        // Sales
        const salesQ = query(salesRef, where("productId", "==", sourceId));
        const salesSnaps = await getDocs(salesQ);
        salesSnaps.forEach(doc => {
          batch.update(doc.ref, { productId: targetProductId, productName: targetData.name });
          opCount++;
        });

        // Movements
        const movQ = query(movementsRef, where("productId", "==", sourceId));
        const movSnaps = await getDocs(movQ);
        movSnaps.forEach(doc => {
          batch.update(doc.ref, { productId: targetProductId, productName: targetData.name });
          opCount++;
        });

        // Orders
        const ordQ = query(ordersRef, where("productId", "==", sourceId));
        const ordSnaps = await getDocs(ordQ);
        ordSnaps.forEach(doc => {
          batch.update(doc.ref, { productId: targetProductId, productName: targetData.name });
          opCount++;
        });

        if (opCount > 0) await batch.commit();
      };

      // We need the source names to update the collections if they strictly rely on ID, but some rely on name.
      // Actually, since the sources are deleted, we can't get their names easily unless we read them before.
      // But we just deleted them?
      // Wait, deleting in transaction happens atomically.
      // For the history update, we should ideally query by ID (which is persistent in the sales record usually).

      // Let's loop sources again (we deleted them in DB but we have IDs).
      // Note: We need to handle this carefully.

      for (const sourceId of sourceProductIds) {
        await processReassignment(sourceId, "Unknown");
      }

      toast({ title: 'Unificação Concluída', description: `Produtos unificados com sucesso em ${targetData.name}.` });

    } catch (error: any) {
      console.error("Merge error:", error);
      toast({ variant: 'destructive', title: 'Erro na Unificação', description: error.message });
    }

  }, [firestore, companyId, user, toast]);



  const updateProductStock = useCallback(async (productName: string, quantity: number, locationId?: string) => {
    if (!firestore || !companyId || !user) return;
    const targetLocation = locationId || (isMultiLocation && locations.length > 0 ? locations[0].id : 'Principal');
    const catalogProduct = catalogProductsData?.find(p => p.name === productName);
    const existingInstance = products.find(p => p.name === productName && p.location === targetLocation);

    const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

    if (existingInstance && existingInstance.id) {
      const docRef = doc(firestore, `companies/${companyId}/products`, existingInstance.id);
      const batch = writeBatch(firestore);
      const newStock = existingInstance.stock + quantity;
      batch.update(docRef, { stock: newStock });

      checkStockAndNotify({ ...existingInstance, stock: newStock });

      const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
        productId: existingInstance.id,
        productName: productName,
        type: 'IN',
        quantity: quantity,
        toLocationId: targetLocation,
        reason: `Produção de Lote: ${quantity} unidades`,
        userId: user.id,
        userName: user.username,
      };
      batch.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
      await batch.commit();

    } else {
      if (!catalogProduct) {
        // toast is handled by caller or we throw to let caller know
        const errorMsg = `Produto Base Não Encontrado: Adicione "${productName}" ao catálogo primeiro.`;
        // We still show toast here for immediate feedback if not caught, but we must throw.
        // Better to JUST throw and let caller handle toast, but for safety lets throw.
        throw new Error(errorMsg);
      }
      const { id, ...restOfCatalogProduct } = catalogProduct;
      const productsRef = collection(firestore, `companies/${companyId}/products`);

      const batch = writeBatch(firestore);
      const newProductRef = doc(productsRef);
      batch.set(newProductRef, { ...restOfCatalogProduct, stock: quantity, reservedStock: 0, location: targetLocation, lastUpdated: new Date().toISOString().split('T')[0] });

      checkStockAndNotify({ ...catalogProduct, id: newProductRef.id, stock: quantity } as Product);

      const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
        productId: newProductRef.id,
        productName: productName,
        type: 'IN',
        quantity: quantity,
        toLocationId: targetLocation,
        reason: `Produção de Lote: ${quantity} unidades`,
        userId: user.id,
        userName: user.username,
      };
      batch.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
      await batch.commit();
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

  const confirmSalePickup = useCallback(async (sale: Sale) => {
    if (!firestore || !companyId || !productsCollectionRef || !user) throw new Error("Firestore não está pronto.");

    const amountPaid = sale.amountPaid ?? 0;
    // Allow for a small tolerance (e.g., 0.50) to account for rounding errors or negligible differences
    if ((sale.totalValue - amountPaid) > 0.5) {
      toast({
        variant: "destructive",
        title: 'Pagamento Incompleto',
        description: `Não é possível confirmar o levantamento. O cliente ainda precisa de pagar ${formatCurrency(sale.totalValue - amountPaid)}.`,
        duration: 6000,
      });
      return;
    }

    const productQuery = query(
      productsCollectionRef,
      where("name", "==", sale.productName),
      where("location", "==", sale.location || (isMultiLocation ? locations[0]?.id : 'Principal'))
    );
    const saleRef = doc(firestore, `companies/${companyId}/sales`, sale.id);
    const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

    await runTransaction(firestore, async (transaction) => {
      const productSnapshot = await getDocs(productQuery);
      if (productSnapshot.empty) {
        throw new Error(`Produto "${sale.productName}" não encontrado para atualizar estoque.`);
      }
      const productDoc = productSnapshot.docs[0];
      const productData = productDoc.data() as Product;

      const newStock = productData.stock - sale.quantity;
      let newReservedStock = productData.reservedStock - sale.quantity;

      if (newReservedStock < 0) {
        console.warn(`[Audit] Negative reserved stock detected for ${productData.name} during pickup. Clamped to 0. Was: ${productData.reservedStock}, Deducting: ${sale.quantity}`);
        newReservedStock = 0;
      }

      if (newStock < 0) {
        throw new Error("Erro Crítico: Stock insuficiente para realizar o levantamento."); // Physical stock MUST be sufficient
      }

      transaction.update(productDoc.ref, { stock: newStock, reservedStock: newReservedStock });
      transaction.update(saleRef, { status: 'Levantado' });

      checkStockAndNotify({ ...productData, stock: newStock });

      const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
        productId: productDoc.id,
        productName: sale.productName,
        type: 'OUT',
        quantity: -sale.quantity, // Negative for stock out
        fromLocationId: productData.location,
        reason: `Venda #${sale.guideNumber}`,
        userId: user.id,
        userName: user.username,
      };
      transaction.set(doc(movementsRef), { ...movement, timestamp: serverTimestamp() });
    });
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, user, checkStockAndNotify, toast]);

  const addProduction = useCallback(async (prodData: Omit<Production, 'id' | 'date' | 'registeredBy' | 'status'>) => {
    if (!firestore || !companyId || !user) throw new Error("Contexto não pronto.");

    const newProduction: Omit<Production, 'id'> = {
      ...prodData,
      date: new Date().toISOString().split('T')[0],
      registeredBy: user.username || 'Desconhecido',
      status: 'Concluído',
    };

    const productionsRef = collection(firestore, `companies/${companyId}/productions`);
    addDocumentNonBlocking(productionsRef, newProduction);

    addNotification({
      type: 'production',
      message: `Produção de ${newProduction.quantity} ${newProduction.unit} de ${newProduction.productName} registada.`,
      href: '/production',
    });
  }, [firestore, companyId, user, addNotification]);

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
        status: 'Concluído'
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
      // 1. Fetch all 'Paid' sales directly from Firestore
      const salesRef = collection(firestore, `companies/${companyId}/sales`);
      const q = query(salesRef, where("status", "==", "Pago"));
      const paidSalesSnapshot = await getDocs(q);
      const paidSales = paidSalesSnapshot.docs.map(doc => doc.data() as Sale);

      // 2. Calculate the correct reserved stock for each product instance (name + location)
      const correctReservedMap = new Map<string, number>(); // Key: 'productName|locationId'
      paidSales.forEach(sale => {
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
    deleteDocumentNonBlocking(doc(productionsCollectionRef, productionId));
    toast({ title: 'Registo de Produção Apagado' });
  }, [productionsCollectionRef, toast]);

  const updateProduction = useCallback((productionId: string, data: Partial<Production>) => {
    if (!productionsCollectionRef) return;
    const docRef = doc(productionsCollectionRef, productionId);
    updateDocumentNonBlocking(docRef, data);
    toast({ title: 'Registo de Produção Atualizado' });
  }, [productionsCollectionRef, toast]);

  const deleteOrder = useCallback((orderId: string) => {
    if (!ordersCollectionRef) return;
    deleteDocumentNonBlocking(doc(ordersCollectionRef, orderId));
    toast({ title: 'Encomenda Apagada' });
  }, [ordersCollectionRef, toast]);

  const addRawMaterial = useCallback(async (material: Omit<RawMaterial, 'id'>) => {
    if (!rawMaterialsCollectionRef) return;
    addDocumentNonBlocking(rawMaterialsCollectionRef, material);
    toast({ title: 'Matéria-Prima Adicionada' });
  }, [rawMaterialsCollectionRef, toast]);

  const updateRawMaterial = useCallback(async (materialId: string, data: Partial<RawMaterial>) => {
    if (!rawMaterialsCollectionRef) return;
    const docRef = doc(rawMaterialsCollectionRef, materialId);
    updateDocumentNonBlocking(docRef, data);
    toast({ title: 'Matéria-Prima Atualizada' });
  }, [rawMaterialsCollectionRef, toast]);

  const deleteRawMaterial = useCallback(async (materialId: string) => {
    if (!rawMaterialsCollectionRef) return;
    deleteDocumentNonBlocking(doc(rawMaterialsCollectionRef, materialId));
    toast({ title: 'Matéria-Prima Removida' });
  }, [rawMaterialsCollectionRef, toast]);

  const addRecipe = useCallback(async (recipe: Omit<Recipe, 'id'>) => {
    if (!recipesCollectionRef) return;
    addDocumentNonBlocking(recipesCollectionRef, recipe);
    toast({ title: 'Receita Adicionada' });
  }, [recipesCollectionRef, toast]);

  const updateRecipe = useCallback(async (recipeId: string, data: Partial<Recipe>) => {
    if (!recipesCollectionRef) return;
    const docRef = doc(recipesCollectionRef, recipeId);
    updateDocumentNonBlocking(docRef, data);
    toast({ title: 'Receita Atualizada' });
  }, [recipesCollectionRef, toast]);

  const deleteRecipe = useCallback(async (recipeId: string) => {
    if (!recipesCollectionRef) return;
    deleteDocumentNonBlocking(doc(recipesCollectionRef, recipeId));
    toast({ title: 'Receita Removida' });
  }, [recipesCollectionRef, toast]);

  const produceFromRecipe = useCallback(async (recipeId: string, quantityToProduce: number) => {
    if (!firestore || !companyId || !user || !recipesData) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Dados de produção indisponíveis.' });
      return;
    }

    const recipe = recipesData.find(r => r.id === recipeId);
    if (!recipe) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Receita não encontrada.' });
      return;
    }

    if (quantityToProduce <= 0) {
      toast({ variant: 'destructive', title: 'Quantidade Inválida', description: 'A quantidade deve ser maior que zero.' });
      return;
    }

    try {
      await runTransaction(firestore, async (transaction) => {
        // 1. Validate and Deduct Raw Materials atomically
        for (const ingredient of recipe.ingredients) {
          const materialRef = doc(firestore, `companies/${companyId}/rawMaterials`, ingredient.rawMaterialId);
          const materialDoc = await transaction.get(materialRef);

          if (!materialDoc.exists()) {
            throw new Error(`Matéria-prima não encontrada (ID: ${ingredient.rawMaterialId}).`);
          }

          const materialData = materialDoc.data() as RawMaterial;
          const requiredQty = ingredient.quantity * quantityToProduce;
          const newStock = (materialData.stock || 0) - requiredQty;

          if (newStock < 0) {
            throw new Error(`Stock insuficiente de ${materialData.name}. Necessário: ${requiredQty}, Disponível: ${materialData.stock}.`);
          }

          transaction.update(materialRef, { stock: newStock });
        }

        // 2. Add to Production Log (Create new document)
        const productionRef = doc(collection(firestore, `companies/${companyId}/productions`));
        const newProduction: Omit<Production, 'id'> = {
          date: new Date().toISOString().split('T')[0],
          productName: recipe.productName,
          quantity: quantityToProduce,
          unit: catalogProductsData?.find(p => p.name === recipe.productName)?.unit || 'un',
          registeredBy: user.username,
          status: 'Concluído'
        };
        transaction.set(productionRef, newProduction);

      });

      toast({ title: 'Produção Registada', description: `Produção de ${quantityToProduce} ${recipe.productName} registada com sucesso. Stock de insumos atualizado.` });

    } catch (e: any) {
      console.error("Production error:", e);
      toast({ variant: 'destructive', title: 'Erro na Produção', description: e.message });
      throw e;
    }
  }, [firestore, companyId, user, recipesData, catalogProductsData, toast]);

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
    const docRef = doc(firestore, `companies/${companyId}/${collectionName}`, id);
    await deleteDocumentNonBlocking(docRef);
    toast({ title: 'Item Apagado Permanentemente' });
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
  }, [companyData, products, salesData, toast]);





  const isDataLoading = loading || productsLoading || salesLoading || productionsLoading || ordersLoading || stockMovementsLoading || catalogProductsLoading || catalogCategoriesLoading || rawMaterialsLoading || recipesLoading;

  const value: InventoryContextType = useMemo(() => ({
    user, firebaseUser, companyId, loading: isDataLoading,
    login, logout, resetPassword, registerCompany, profilePicture, setProfilePicture: handleSetProfilePicture,
    canView, canEdit,
    companyData, products, sales: salesData || [], productions: productionsData || [],
    orders: ordersData || [], stockMovements: stockMovementsData || [], catalogProducts: catalogProductsData || [], catalogCategories: catalogCategoriesData || [],
    rawMaterials: rawMaterialsData || [],
    recipes: recipesData || [],
    locations, isMultiLocation, notifications, monthlySalesChartData, dashboardStats,
    businessStartDate,
    chatHistory, setChatHistory,
    addProduct, updateProduct, deleteProduct, clearProductsCollection,
    auditStock, transferStock, updateProductStock, updateCompany, addSale, confirmSalePickup, addProductionLog,
    // Products Merge Tool
    const mergeProducts = useCallback(async (targetProductId: string, sourceProductIds: string[]) => {
      if (!productsCollectionRef || !firestore || !companyId) return;

      try {
        const batch = writeBatch(firestore);
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
          const sourceProduct = productsData.find(p => p.id === sourceId);
          if (sourceProduct) {
            totalStockToAdd += (sourceProduct.stock || 0);
            totalReservedToAdd += (sourceProduct.reservedStock || 0);
            sourceIdsRecord.push(sourceId);

            // Delete source product
            const sourceRef = doc(productsCollectionRef, sourceId);
            batch.delete(sourceRef);
          }
        }

        // Update target product
        const targetRef = doc(productsCollectionRef, targetProductId);
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


    clearSales, clearProductions, clearOrders, clearStockMovements,
    markNotificationAsRead, markAllAsRead, clearNotifications, addNotification,
    recalculateReservedStock,
    addCatalogProduct, addCatalogCategory,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    produceFromRecipe,
  }), [
    user, firebaseUser, companyId, isDataLoading,
    login, logout, resetPassword, registerCompany, profilePicture, handleSetProfilePicture,
    canView, canEdit,
    companyData, products, salesData, productionsData, ordersData, stockMovementsData, catalogProductsData, catalogCategoriesData,
    rawMaterialsData, recipesData,
    locations, isMultiLocation, notifications, monthlySalesChartData, dashboardStats,
    businessStartDate,
    chatHistory, setChatHistory,
    addProduct, updateProduct, deleteProduct, clearProductsCollection,
    auditStock, transferStock, updateProductStock, updateCompany, addSale, confirmSalePickup, addProductionLog,
    addProduction, updateProduction, deleteProduction, deleteOrder, deleteSale,
    clearSales, clearProductions, clearOrders, clearStockMovements,
    markNotificationAsRead, markAllAsRead, clearNotifications, addNotification,
    recalculateReservedStock,
    addCatalogProduct, addCatalogCategory,
    addRawMaterial,
    updateRawMaterial,
    deleteRawMaterial,
    addRecipe,
    updateRecipe,
    deleteRecipe,
    produceFromRecipe,
    mergeProducts,
    restoreItem,
    hardDelete,
    exportCompanyData,
  ]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
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
