
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
import type { Product, Location, Sale, Production, Order, Company, Employee } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
} from 'firebase/firestore';
import { initialCatalog } from '@/lib/data';

type CatalogProduct = Omit<
  Product,
  'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'
>;
type CatalogCategory = { id: string; name: string };

interface InventoryContextType {
  // Auth related
  user: Employee | null;
  companyId: string | null;
  loading: boolean;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  registerCompany: (companyName: string, adminUsername: string, adminPass: string) => Promise<boolean>;

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
  seedInitialCatalog: () => Promise<void>;
  clearCompanyData: () => Promise<void>;
  updateCompany: (details: Partial<Company>) => Promise<void>;
}

export const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export function InventoryProvider({ children }: { children: ReactNode }) {
  // AUTH STATE
  const [user, setUser] = useState<Employee | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // DATA STATE
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const [companyData, setCompanyData] = useState<Company | null>(null);
  
  // --- AUTH LOGIC ---
  
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('majorstockx-user');
      const storedCompanyId = localStorage.getItem('majorstockx-company-id');
      if (storedUser && storedCompanyId) {
        setUser(JSON.parse(storedUser));
        setCompanyId(storedCompanyId);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const login = async (fullUsername: string, pass: string): Promise<boolean> => {
    setAuthLoading(true);
    if (!firestore || !fullUsername.includes('@')) {
      setAuthLoading(false);
      return false;
    }
  
    const [username, companyDomain] = fullUsername.split('@');
  
    try {
      // 1. Find the company by its domain-like name
      const companiesRef = collection(firestore, 'companies');
      const companyQuery = query(companiesRef, where("name", "==", companyDomain));
      const companySnapshot = await getDocs(companyQuery);
  
      if (companySnapshot.empty) {
        throw new Error(`Empresa "${companyDomain}" não encontrada.`);
      }
      
      const companyDoc = companySnapshot.docs[0];
      const foundCompanyId = companyDoc.id;
  
      // 2. Find the user within that specific company's employee list
      const employeesRef = collection(firestore, `companies/${foundCompanyId}/employees`);
      const userQuery = query(employeesRef, where("username", "==", username));
      const userSnapshot = await getDocs(userQuery);
  
      if (userSnapshot.empty) {
        throw new Error(`Utilizador "${username}" não encontrado na empresa "${companyDomain}".`);
      }
  
      const userData = userSnapshot.docs[0].data() as Employee;
      
      // 3. Verify password
      if (userData.password === pass) { // WARNING: Insecure password check
        const userToStore = { ...userData, id: userSnapshot.docs[0].id };
        delete userToStore.password; // Do not store password in state or localStorage

        setUser(userToStore);
        setCompanyId(foundCompanyId);
        localStorage.setItem('majorstockx-user', JSON.stringify(userToStore));
        localStorage.setItem('majorstockx-company-id', foundCompanyId);
        setAuthLoading(false);
        return true;
      } else {
        throw new Error("Senha incorreta.");
      }
    } catch (error) {
      console.error("Login error: ", error);
      setAuthLoading(false);
      // Re-throw to be caught by the UI
      if (error instanceof Error) {
        throw error;
      }
      return false;
    }
  };
  
  const registerCompany = async (companyName: string, adminUsername: string, adminPass: string): Promise<boolean> => {
    if (!firestore) return false;
  
    const normalizedCompanyName = companyName.toLowerCase().replace(/\s+/g, '');
  
    try {
      const companiesRef = collection(firestore, 'companies');
      const companyQuery = query(companiesRef, where('name', '==', normalizedCompanyName));
      const existingCompanySnapshot = await getDocs(companyQuery);
      if (!existingCompanySnapshot.empty) {
        throw new Error('Uma empresa com este nome já existe.');
      }
  
      const companyDocRef = await addDoc(companiesRef, { name: normalizedCompanyName });
  
      const employeesCollectionRef = collection(firestore, `companies/${companyDocRef.id}/employees`);
      await addDoc(employeesCollectionRef, {
        username: adminUsername.split('@')[0], // Save only the username part
        password: adminPass, // In a real app, hash this password
        role: 'Admin',
        companyId: companyDocRef.id,
      });
  
      return true;
    } catch (error) {
      console.error('Registration error: ', error);
      if (error instanceof Error) {
        throw error;
      }
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setCompanyId(null);
    localStorage.removeItem('majorstockx-user');
    localStorage.removeItem('majorstockx-company-id');
    router.push('/login');
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
  
  const seedInitialCatalog = useCallback(async () => {
    if (!catalogProductsCollectionRef || !catalogCategoriesCollectionRef || !firestore) {
      toast({ variant: "destructive", title: "Erro", description: "A base de dados não está pronta." });
      return;
    }
    const existingProducts = await getDocs(query(catalogProductsCollectionRef));
    if (!existingProducts.empty) {
      toast({ title: "Catálogo já existente", description: "O catálogo de produtos base já foi carregado." });
      return;
    }
    toast({ title: "A carregar catálogo...", description: "Por favor, aguarde." });
    const batch = writeBatch(firestore);
    const categoryNameSet = new Set<string>();
    for (const category in initialCatalog) {
      categoryNameSet.add(category);
      for (const subType in initialCatalog[category]) {
        const items = initialCatalog[category][subType];
        items.forEach((itemName: string) => {
          const docRef = doc(catalogProductsCollectionRef);
          batch.set(docRef, {
            name: `${itemName} ${subType}`.trim(),
            category: category, price: 0, lowStockThreshold: 10, criticalStockThreshold: 5, unit: "un",
          });
        });
      }
    }
    categoryNameSet.forEach(name => {
        const docRef = doc(catalogCategoriesCollectionRef);
        batch.set(docRef, { name });
    });
    try {
      await batch.commit();
      toast({ title: "Sucesso!", description: "Catálogo inicial carregado." });
    } catch (error) {
      console.error("Error seeding catalog: ", error);
      toast({ variant: "destructive", title: "Erro ao carregar o catálogo" });
    }
  }, [catalogProductsCollectionRef, catalogCategoriesCollectionRef, firestore, toast]);

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

  const clearCompanyData = useCallback(async () => {
    if (!firestore || !companyId) {
      toast({ variant: "destructive", title: "Erro", description: "Utilizador ou empresa não identificado." });
      return;
    }
    const collectionsToDelete = ['products', 'sales', 'productions', 'orders', 'catalogProducts', 'catalogCategories', 'employees'];
    const batch = writeBatch(firestore);
    try {
      for (const collectionName of collectionsToDelete) {
        const collRef = collection(firestore, `companies/${companyId}/${collectionName}`);
        const snapshot = await getDocs(query(collRef));
        snapshot.forEach(doc => batch.delete(doc.ref));
      }
      await batch.commit();
    } catch (error) {
      console.error("Error clearing company data: ", error);
      toast({ variant: "destructive", title: "Erro ao Limpar Dados" });
    }
  }, [firestore, companyId, toast]);

  const updateCompany = useCallback(async (details: Partial<Company>) => {
      if(companyDocRef) {
         await setDoc(companyDocRef, details, { merge: true });
      }
  }, [companyDocRef]);

  // --- RENDER LOGIC ---
  const isAuthPage = pathname === '/login' || pathname === '/register';

  if (authLoading) {
    return <div className="flex h-screen w-full items-center justify-center">A carregar aplicação...</div>;
  }
  
  if (!user && !isAuthPage) {
     router.replace('/login');
     return <div className="flex h-screen w-full items-center justify-center">A redirecionar para o login...</div>;
  }
  
  if (user && isAuthPage) {
      router.replace('/dashboard');
      return <div className="flex h-screen w-full items-center justify-center">A redirecionar para o dashboard...</div>;
  }

  const value: InventoryContextType = {
    user, companyId, loading: authLoading || productsLoading || salesLoading || productionsLoading || ordersLoading || catalogProductsLoading || catalogCategoriesLoading,
    login, logout, registerCompany,
    companyData, products, sales: salesData || [], productions: productionsData || [],
    orders: ordersData || [], catalogProducts: catalogProductsData || [], catalogCategories: catalogCategoriesData || [],
    locations, isMultiLocation, addProduct, updateProduct, deleteProduct, transferStock,
    updateProductStock, seedInitialCatalog, clearCompanyData, updateCompany,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}
