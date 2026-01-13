

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
import type { Product, Location, Sale, Production, Order, Company, Employee, ModulePermission, PermissionLevel } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase, getFirebaseAuth } from '@/firebase';
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  User as FirebaseAuthUser,
  GoogleAuthProvider,
  signInWithPopup,
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
  collectionGroup,
} from 'firebase/firestore';
import { allPermissions } from '@/lib/data';

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
  needsOnboarding: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  registerCompany: (companyName: string, adminUsername: string, adminEmail: string, adminPass: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  completeOnboarding: (companyName: string) => Promise<boolean>;


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
}

export const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Employee | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseAuthUser | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = getFirebaseAuth();
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const [companyData, setCompanyData] = useState<Company | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const allEmployeesQuery = query(collectionGroup(firestore, 'employees'));
        
        try {
          const snapshot = await getDocs(allEmployeesQuery);
          const userDoc = snapshot.docs.find(doc => doc.id === fbUser.uid);

          if (userDoc) {
            const employeeData = userDoc.data() as Employee;
            const userCompanyId = userDoc.ref.parent.parent?.id;

            if (userCompanyId) {
              setUser({ ...employeeData, id: userDoc.id });
              setCompanyId(userCompanyId);
              setNeedsOnboarding(false);
            } else {
              // Should not happen if data is consistent
              setUser(null); setCompanyId(null);
            }
          } else {
            // New user (likely from Google Sign-In) who needs to complete onboarding
            setUser(null);
            setCompanyId(null);
            setNeedsOnboarding(true);
          }
        } catch (error) {
           console.error("Error fetching user profile:", error);
           setUser(null); setCompanyId(null);
        }
      } else {
        // User is signed out
        setUser(null);
        setFirebaseUser(null);
        setCompanyId(null);
        setNeedsOnboarding(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);
  

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

  const signInWithGoogle = async (): Promise<void> => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      setLoading(true);
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the rest, including redirection to dashboard or onboarding
    } catch (error: any) {
      console.error("Google Sign-In Error:", { code: error.code, message: error.message });
      let description = 'Ocorreu um erro inesperado durante o login com o Google.';
      if (error.code === 'auth/popup-closed-by-user') {
        description = 'A janela de login foi fechada antes da conclusão.';
      } else if (error.code === 'auth/operation-not-allowed') {
        description = 'O login com Google não está ativado no seu projeto Firebase. Por favor, ative-o no Console do Firebase.';
      } else if (error.code === 'auth/unauthorized-domain') {
          description = 'Este domínio não está autorizado para operações de login. Por favor, adicione-o à lista de domínios autorizados no Console do Firebase.';
      }
      toast({ 
        variant: 'destructive', 
        title: 'Erro de Login com Google', 
        description: description
      });
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async (companyName: string): Promise<boolean> => {
    if (!firestore || !firebaseUser) return false;

    setLoading(true);
    try {
      await runTransaction(firestore, async (transaction) => {
        const companiesRef = collection(firestore, 'companies');
        const companyQuery = query(companiesRef, where('name', '==', companyName));
        const existingCompanySnapshot = await getDocs(companyQuery);
        if (!existingCompanySnapshot.empty) {
          throw new Error('Uma empresa com este nome já existe.');
        }

        const newCompanyRef = doc(companiesRef);
        transaction.set(newCompanyRef, { name: companyName });

        const employeesCollectionRef = collection(firestore, `companies/${newCompanyRef.id}/employees`);
        const newEmployeeRef = doc(employeesCollectionRef, firebaseUser.uid);
        
        const adminPermissions = allPermissions.reduce((acc, p) => {
          acc[p.id] = 'write';
          return acc;
        }, {} as Record<ModulePermission, PermissionLevel>);
        
        transaction.set(newEmployeeRef, {
          username: firebaseUser.displayName || 'Novo Utilizador',
          email: firebaseUser.email || 'sem-email',
          role: 'Admin',
          companyId: newCompanyRef.id,
          permissions: adminPermissions,
        });
      });
      setNeedsOnboarding(false); // Onboarding complete
      // Re-fetch will be triggered by onAuthStateChanged finding the new doc
      toast({ title: 'Bem-vindo!', description: 'A sua empresa foi criada com sucesso.' });
      return true;
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const registerCompany = async (companyName: string, adminUsername: string, adminEmail: string, adminPass: string): Promise<boolean> => {
    if (!firestore) return false;
  
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPass);
        const newUserId = userCredential.user.uid;

        await runTransaction(firestore, async (transaction) => {
            const companiesRef = collection(firestore, 'companies');
            const companyQuery = query(companiesRef, where('name', '==', companyName));
            const existingCompanySnapshot = await getDocs(companyQuery);
            if (!existingCompanySnapshot.empty) {
              throw new Error('Uma empresa com este nome já existe.');
            }
            
            const newCompanyRef = doc(companiesRef);
            transaction.set(newCompanyRef, { name: companyName });

            const employeesCollectionRef = collection(firestore, `companies/${newCompanyRef.id}/employees`);
            const newEmployeeRef = doc(employeesCollectionRef, newUserId);
            
            const adminPermissions = allPermissions.reduce((acc, p) => {
              acc[p.id] = 'write';
              return acc;
            }, {} as Record<ModulePermission, PermissionLevel>);
            
            transaction.set(newEmployeeRef, {
              username: adminUsername,
              email: adminEmail,
              role: 'Admin',
              companyId: newCompanyRef.id,
              permissions: adminPermissions,
            });
        });
      // Login will be handled by onAuthStateChanged
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
        setNeedsOnboarding(false);
        router.push('/login');
        toast({ title: "Sessão terminada" });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Erro ao sair' });
    }
  }, [auth, router, toast]);

  const canView = (module: ModulePermission) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    const level = user.permissions?.[module];
    return level === 'read' || level === 'write';
  };

  const canEdit = (module: ModulePermission) => {
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return user.permissions?.[module] === 'write';
  };


  // --- DATA FETCHING LOGIC ---

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
    if (companyId) {
      const multiLocationEnabled = localStorage.getItem(`majorstockx-multi-location-enabled-${companyId}`) === 'true';
      setIsMultiLocation(multiLocationEnabled);
      const storedLocations = localStorage.getItem(`majorstockx-locations-${companyId}`);
      if (storedLocations) {
        setLocations(JSON.parse(storedLocations));
      }
    } else {
        setIsMultiLocation(false);
        setLocations([]);
    }
  }, [companyId]);

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
  
  const updateProduct = useCallback((instanceId: string, updatedData: Partial<Product>) => {
       if (!productsCollectionRef || !instanceId) return;
      const docRef = doc(productsCollectionRef, instanceId);
      updateDoc(docRef, { ...updatedData, lastUpdated: new Date().toISOString().split('T')[0] });
    }, [productsCollectionRef]);

  const deleteProduct = useCallback((instanceId: string) => {
       if (!productsCollectionRef || !instanceId) return;
       const docRef = doc(productsCollectionRef, instanceId);
      deleteDoc(docRef);
    }, [productsCollectionRef]);

  const transferStock = useCallback(async (productName: string, fromLocationId: string, toLocationId: string, quantity: number) => {
      if (!firestore || !companyId) return;
      const fromProduct = products.find(p => p.name === productName && p.location === fromLocationId);
      if (!fromProduct || !fromProduct.id) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Produto de origem não encontrado.' });
        return;
      }
      if (fromProduct.stock < quantity) {
        toast({ variant: 'destructive', title: 'Stock Insuficiente' });
        return;
      }
      const toProduct = products.find(p => p.name === productName && p.location === toLocationId);
      const batch = writeBatch(firestore);
      const productsRef = collection(firestore, `companies/${companyId}/products`);
      const fromDocRef = doc(productsRef, fromProduct.id);
      batch.update(fromDocRef, { stock: fromProduct.stock - quantity });
      if (toProduct && toProduct.id) {
        const toDocRef = doc(productsRef, toProduct.id);
        batch.update(toDocRef, { stock: toProduct.stock + quantity });
      } else {
        const { id, instanceId, ...restOfProduct } = fromProduct;
        const newDocRef = doc(productsRef);
        batch.set(newDocRef, { ...restOfProduct, location: toLocationId, stock: quantity, reservedStock: 0, lastUpdated: new Date().toISOString().split('T')[0] });
      }
      try {
        await batch.commit();
        toast({ title: 'Transferência Concluída' });
      } catch (error) {
        console.error('Error transferring stock:', error);
        toast({ variant: 'destructive', title: 'Erro na Transferência' });
      }
    }, [firestore, companyId, products, toast]);

  const updateProductStock = useCallback(async (productName: string, quantity: number, locationId?: string) => {
      if (!firestore || !companyId) return;
      const targetLocation = locationId || (isMultiLocation && locations.length > 0 ? locations[0].id : 'Principal');
      const catalogProduct = catalogProductsData?.find(p => p.name === productName);
      const existingInstance = products.find(p => p.name === productName && p.location === targetLocation);
      if (existingInstance && existingInstance.id) {
        const docRef = doc(firestore, `companies/${companyId}/products`, existingInstance.id);
        updateDoc(docRef, { stock: existingInstance.stock + quantity });
      } else {
        if (!catalogProduct) {
           toast({ variant: 'destructive', title: 'Produto Base Não Encontrado', description: `Adicione "${productName}" ao catálogo primeiro.` });
          return;
        }
        const { id, ...restOfCatalogProduct } = catalogProduct;
        const productsRef = collection(firestore, `companies/${companyId}/products`);
        addDoc(productsRef, { ...restOfCatalogProduct, stock: quantity, reservedStock: 0, location: targetLocation, lastUpdated: new Date().toISOString().split('T')[0] });
      }
    }, [firestore, companyId, products, catalogProductsData, isMultiLocation, locations, toast]);

  const updateCompany = useCallback(async (details: Partial<Company>) => {
      if(companyDocRef) {
         await setDoc(companyDocRef, details, { merge: true });
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
     if (!firestore || !companyId || !productsCollectionRef) throw new Error("Firestore não está pronto.");

    const productQuery = query(
        productsCollectionRef,
        where("name", "==", sale.productName),
        where("location", "==", sale.location || (isMultiLocation ? locations[0]?.id : 'Principal'))
    );
    const saleRef = doc(firestore, `companies/${companyId}/sales`, sale.id);

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
    });
  }, [firestore, companyId, productsCollectionRef, isMultiLocation, locations]);


  const isDataLoading = loading || productsLoading || salesLoading || productionsLoading || ordersLoading || catalogProductsLoading || catalogCategoriesLoading;

  const value: InventoryContextType = {
    user, firebaseUser, companyId, loading: isDataLoading, needsOnboarding,
    login, logout, registerCompany, signInWithGoogle, completeOnboarding,
    canView, canEdit,
    companyData, products, sales: salesData || [], productions: productionsData || [],
    orders: ordersData || [], catalogProducts: catalogProductsData || [], catalogCategories: catalogCategoriesData || [],
    locations, isMultiLocation, addProduct, updateProduct, deleteProduct, transferStock,
    updateProductStock, updateCompany, addSale, confirmSalePickup
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}
