
'use client';

import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Product, Location, Sale, Production, Order, Company, Employee, ModulePermission, PermissionLevel, StockMovement } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, getFirebaseAuth } from '@/firebase';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
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
  type CollectionReference,
} from 'firebase/firestore';
import { allPermissions } from '@/lib/data';
import { getStorage, ref, uploadString, getDownloadURL } from "firebase/storage";

type CatalogProduct = Omit<
  Product,
  'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'
>;
type CatalogCategory = { id: string; name: string };

interface InventoryContextType {
  // Auth related
  user: Employee | null;
  firebaseUser: FirebaseAuthUser | null;
  companyId: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  registerCompany: (companyName: string, adminUsername: string, adminEmail: string, adminPass: string) => Promise<boolean>;
  profilePicture: string | null;
  setProfilePicture: (url: string) => void;

  // Permission helpers
  canView: (module: ModulePermission) => boolean;
  canEdit: (module: ModulePermission) => boolean;

  // Data related
  products: Product[];
  sales: Sale[];
  productions: Production[];
  orders: Order[];
  catalogProducts: CatalogProduct[];
  catalogCategories: CatalogCategory[];
  locations: Location[];
  isMultiLocation: boolean;
  companyData: Company | null;

  // Functions
  addProduct: (
    newProductData: Omit<
      Product,
      'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'
    >
  ) => void;
  updateProduct: (instanceId: string, updatedData: Partial<Product>) => void;
  deleteProduct: (instanceId: string) => void;
  clearProductsCollection: () => Promise<void>;
  transferStock: (
    productName: string,
    fromLocationId: string,
    toLocationId: string,
    quantity: number
  ) => void;
  updateProductStock: (
    productName: string,
    quantity: number,
    locationId?: string
  ) => void;
  updateCompany: (details: Partial<Company>) => Promise<void>;
  addSale: (newSaleData: Omit<Sale, 'id' | 'guideNumber'>) => Promise<void>;
  confirmSalePickup: (sale: Sale) => void;
  deleteSale: (saleId: string) => void;
  deleteProduction: (productionId: string) => void;
  deleteOrder: (orderId: string) => void;
  clearSales: () => Promise<void>;
  clearProductions: () => Promise<void>;
  clearOrders: () => Promise<void>;
  clearStockMovements: () => Promise<void>;
}

export const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = getFirebaseAuth();
  
  const [companyData, setCompanyData] = useState<Company | null>(null);

  const locations = useMemo(() => companyData?.locations || [], [companyData]);
  const isMultiLocation = useMemo(() => !!companyData?.isMultiLocation, [companyData]);

  const handleSetProfilePicture = useCallback(async (pictureUrl: string) => {
    if (!firestore || !user || !user.id ) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Utilizador não autenticado.' });
        return;
    }
    
    toast({ title: 'A carregar...', description: 'A sua nova foto de perfil está a ser guardada.' });

    try {
        const userDocRef = doc(firestore, `companies/${user.companyId}/employees`, user.id);
        await updateDoc(userDocRef, { profilePictureUrl: pictureUrl });
        setProfilePicture(pictureUrl);
        
        toast({ title: 'Sucesso!', description: 'A sua foto de perfil foi atualizada.' });
    } catch(error) {
        console.error("Error updating profile picture: ", error);
        toast({ variant: 'destructive', title: 'Erro de Upload', description: 'Não foi possível guardar a sua foto.' });
    }
  }, [firestore, user, toast]);

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
  }, [auth, firestore]);

  useEffect(() => {
    let unsubscribeEmployee: () => void = () => {};

    if (firebaseUser && companyId) {
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
  }, [firebaseUser, companyId, firestore]);
  

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

  const registerCompany = async (companyName: string, adminUsername: string, adminEmail: string, adminPass: string): Promise<boolean> => {
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

      batch.set(newCompanyRef, { name: companyName, ownerId: newUserId, isMultiLocation: false, locations: [] });

      await batch.commit();

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

  const logout = useCallback(async () => {
    try {
        await signOut(auth);
        setUser(null);
        setCompanyId(null);
        setFirebaseUser(null);
        router.push('/login');
        toast({ title: "Sessão terminada" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao sair' });
    }
  }, [auth, router, toast]);

  const canView = (module: ModulePermission) => {
    if (!user) return false;
    if (user.role === 'Admin' || user.role === 'Dono') return true;
    const level = user.permissions?.[module];
    return level === 'read' || level === 'write';
  };

  const canEdit = (module: ModulePermission) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    // Dono (Owner) role has read-only access
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
  
  const companyDocRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return doc(firestore, `companies`, companyId);
  }, [firestore, companyId]);


  const { data: productsData, isLoading: productsLoading } = useCollection<Product>(productsCollectionRef);
  const { data: salesData, isLoading: salesLoading } = useCollection<Sale>(salesCollectionRef);
  const { data: productionsData, isLoading: productionsLoading } = useCollection<Production>(productionsCollectionRef);
  const { data: ordersData, isLoading: ordersLoading } = useCollection<Order>(ordersCollectionRef);
  const { data: catalogProductsData, isLoading: catalogProductsLoading } = useCollection<CatalogProduct>(catalogProductsCollectionRef);
  const { data: catalogCategoriesData, isLoading: catalogCategoriesLoading } = useCollection<CatalogCategory>(catalogCategoriesCollectionRef);

  const products = useMemo(() => {
    if (!productsData) return [];
    return productsData.map((p) => ({
      ...p,
      instanceId: p.id,
    }));
  }, [productsData]);

  useEffect(() => {
    if(companyDocRef) {
      const unsub = onSnapshot(companyDocRef, (doc) => {
        if(doc.exists()) {
          setCompanyData({ id: doc.id, ...doc.data() } as Company);
        }
      });
      return () => unsub();
    }
  }, [companyDocRef]);

  const triggerEmailAlert = useCallback(async (product: Product, type: 'CRITICAL') => {
    if (!companyData?.notificationEmail) {
        console.warn("Email de notificação não configurado.");
        return;
    }

    try {
        await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: companyData.notificationEmail,
            subject: `🚨 ALERTA: ${product.name} com stock baixo!`,
            productName: product.name,
            quantity: product.stock,
            location: locations.find(l => l.id === product.location)?.name || 'Principal',
            type: type,
            threshold: product.criticalStockThreshold,
        }),
        });
    } catch (error) {
        console.error("Falha ao enviar e-mail de alerta:", error);
        toast({
            variant: "destructive",
            title: "Erro de Notificação",
            description: "Não foi possível enviar o e-mail de alerta de stock."
        });
    }
  }, [companyData?.notificationEmail, locations, toast]);

  const checkStockAndSendAlerts = useCallback(async (productId: string, updatedStock: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Create a temporary updated product object to check against thresholds
    const updatedProduct = { ...product, stock: updatedStock };

    const wasAboveThreshold = product.stock > product.criticalStockThreshold;
    const isBelowThreshold = updatedStock <= product.criticalStockThreshold;

    if (wasAboveThreshold && isBelowThreshold) {
      await triggerEmailAlert(updatedProduct, 'CRITICAL');
    }
  }, [products, triggerEmailAlert]);

 const addProduct = useCallback(
    (newProductData: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => {
      if (!productsCollectionRef) return;
      
      const newProduct: Omit<Product, 'id' | 'instanceId'> = {
        ...newProductData,
        lastUpdated: new Date().toISOString().split('T')[0],
        reservedStock: 0,
      };
      addDoc(productsCollectionRef, newProduct);
    },
    [productsCollectionRef]
  );
  
  const updateProduct = useCallback(async (instanceId: string, updatedData: Partial<Product>) => {
       if (!productsCollectionRef || !instanceId) return;
      const docRef = doc(productsCollectionRef, instanceId);
      await updateDoc(docRef, { ...updatedData, lastUpdated: new Date().toISOString().split('T')[0] });

      if (updatedData.stock !== undefined) {
        await checkStockAndSendAlerts(instanceId, updatedData.stock);
      }
    }, [productsCollectionRef, checkStockAndSendAlerts]);

  const deleteProduct = useCallback((instanceId: string) => {
       if (!productsCollectionRef || !instanceId) return;
       const docRef = doc(productsCollectionRef, instanceId);
      deleteDoc(docRef);
    }, [productsCollectionRef]);
    
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


 const transferStock = useCallback(async (productName: string, fromLocationId: string, toLocationId: string, quantity: number) => {
    if (!firestore || !companyId || !user) return;

    const fromProduct = products.find(p => p.name === productName && p.location === fromLocationId);
    if (!fromProduct || !fromProduct.id) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Produto de origem não encontrado.' });
        return;
    }
    if (fromProduct.stock - fromProduct.reservedStock < quantity) {
        toast({ variant: 'destructive', title: 'Stock Insuficiente', description: `Disponível: ${fromProduct.stock - fromProduct.reservedStock}`});
        return;
    }

    const toProduct = products.find(p => p.name === productName && p.location === toLocationId);
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const productsRef = collection(firestore, `companies/${companyId}/products`);
            const movementsRef = collection(firestore, `companies/${companyId}/stockMovements`);

            // 1. Update source product
            const fromDocRef = doc(productsRef, fromProduct.id!);
            const newFromStock = fromProduct.stock - quantity;
            transaction.update(fromDocRef, { stock: newFromStock });
            
            checkStockAndSendAlerts(fromProduct.id!, newFromStock);

            // 2. Update or create destination product
            if (toProduct && toProduct.id) {
                const toDocRef = doc(productsRef, toProduct.id);
                transaction.update(toDocRef, { stock: toProduct.stock + quantity });
            } else {
                const { id, instanceId, ...restOfProduct } = fromProduct;
                const newDocRef = doc(productsRef); // Auto-generate ID
                transaction.set(newDocRef, { ...restOfProduct, location: toLocationId, stock: quantity, reservedStock: 0, lastUpdated: new Date().toISOString().split('T')[0] });
            }

            // 3. Create stock movement record
            const movement: Omit<StockMovement, 'id' | 'timestamp'> = {
                productId: fromProduct.id!, // or a more stable catalog ID if you have one
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
}, [firestore, companyId, products, toast, user, checkStockAndSendAlerts]);

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
        
        checkStockAndSendAlerts(existingInstance.id, newStock);
        
        const movement: Omit<StockMovement, 'id'|'timestamp'> = {
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
           toast({ variant: 'destructive', title: 'Produto Base Não Encontrado', description: `Adicione "${productName}" ao catálogo primeiro.` });
          return;
        }
        const { id, ...restOfCatalogProduct } = catalogProduct;
        const productsRef = collection(firestore, `companies/${companyId}/products`);
        
        const batch = writeBatch(firestore);
        const newProductRef = doc(productsRef);
        batch.set(newProductRef, { ...restOfCatalogProduct, stock: quantity, reservedStock: 0, location: targetLocation, lastUpdated: new Date().toISOString().split('T')[0] });
        
        checkStockAndSendAlerts(newProductRef.id, quantity);

        const movement: Omit<StockMovement, 'id'|'timestamp'> = {
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
    }, [firestore, companyId, products, catalogProductsData, isMultiLocation, locations, toast, user, checkStockAndSendAlerts]);

  const updateCompany = useCallback(async (details: Partial<Company>) => {
      if(companyDocRef) {
         await updateDoc(companyDocRef, details);
      }
  }, [companyDocRef]);
  
  const addSale = useCallback(async (newSaleData: Omit<Sale, 'id' | 'guideNumber'>) => {
    if (!firestore || !companyId || !productsCollectionRef) throw new Error("Firestore não está pronto.");

    const productQuery = query(
        productsCollectionRef,
        where("name", "==", newSaleData.productName),
        where("location", "==", newSaleData.location || (isMultiLocation ? locations[0]?.id : 'Principal'))
    );

    const now = new Date();
    const guideNumber = `GT${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Date.now().toString().slice(-3)}`;
    const salesCollectionRef = collection(firestore, `companies/${companyId}/sales`);
    const newSaleRef = doc(salesCollectionRef);

    await runTransaction(firestore, async (transaction) => {
        const productSnapshot = await getDocs(productQuery);
        if (productSnapshot.empty) {
            throw new Error(`Produto "${newSaleData.productName}" não encontrado no estoque.`);
        }
        const productDoc = productSnapshot.docs[0];
        const productData = productDoc.data() as Product;
        const availableStock = productData.stock - productData.reservedStock;

        if (availableStock < newSaleData.quantity) {
            throw new Error(`Estoque insuficiente. Disponível: ${availableStock}.`);
        }

        const newReservedStock = productData.reservedStock + newSaleData.quantity;
        transaction.update(productDoc.ref, { reservedStock: newReservedStock });
        transaction.set(newSaleRef, { ...newSaleData, guideNumber });
    });
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations]);

  const confirmSalePickup = useCallback(async (sale: Sale) => {
     if (!firestore || !companyId || !productsCollectionRef || !user) throw new Error("Firestore não está pronto.");

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
        const newReservedStock = productData.reservedStock - sale.quantity;

        if (newStock < 0 || newReservedStock < 0) {
            throw new Error("Erro de consistência de dados. O estoque ficaria negativo.");
        }

        transaction.update(productDoc.ref, { stock: newStock, reservedStock: newReservedStock });
        transaction.update(saleRef, { status: 'Levantado' });

        checkStockAndSendAlerts(productDoc.id, newStock);

        const movement: Omit<StockMovement, 'id'|'timestamp'> = {
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
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations, user, checkStockAndSendAlerts]);

  const deleteSale = useCallback(async (saleId: string) => {
    if (!salesCollectionRef) return;
    await deleteDoc(doc(salesCollectionRef, saleId));
    toast({ title: 'Venda Apagada' });
  }, [salesCollectionRef, toast]);

  const deleteProduction = useCallback(async (productionId: string) => {
    if (!productionsCollectionRef) return;
    await deleteDoc(doc(productionsCollectionRef, productionId));
    toast({ title: 'Registo de Produção Apagado' });
  }, [productionsCollectionRef, toast]);

  const deleteOrder = useCallback(async (orderId: string) => {
    if (!ordersCollectionRef) return;
    await deleteDoc(doc(ordersCollectionRef, orderId));
    toast({ title: 'Encomenda Apagada' });
  }, [ordersCollectionRef, toast]);


  const isDataLoading = loading || productsLoading || salesLoading || productionsLoading || ordersLoading || catalogProductsLoading || catalogCategoriesLoading;

  const value: InventoryContextType = {
    user, firebaseUser, companyId, loading: isDataLoading,
    login, logout, registerCompany, profilePicture, setProfilePicture: handleSetProfilePicture,
    canView, canEdit,
    companyData, products, sales: salesData || [], productions: productionsData || [],
    orders: ordersData || [], catalogProducts: catalogProductsData || [], catalogCategories: catalogCategoriesData || [],
    locations, isMultiLocation, addProduct, updateProduct, deleteProduct, clearProductsCollection,
    transferStock, updateProductStock, updateCompany, addSale, confirmSalePickup,
    deleteSale, deleteProduction, deleteOrder,
    clearSales, clearProductions, clearOrders, clearStockMovements,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}
