

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
  runTransaction,
  getDoc,
} from 'firebase/firestore';
import { allPermissions } from '@/lib/data';

type CatalogProduct = Omit<
  Product,
  'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'
>;
type CatalogCategory = { id: string; name: string };

// Defina o UID do Super Admin aqui. Deixe como string vazia se não houver.
const SUPER_ADMIN_UID = "COLOQUE_O_SEU_UID_AQUI"; 

interface InventoryContextType {
  // Auth related
  user: Employee | null;
  companyId: string | null;
  isSuperAdmin: boolean;
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
  updateCompany: (details: Partial<Company>) => Promise<void>;
  addSale: (newSaleData: Omit<Sale, 'id' | 'guideNumber'>) => Promise<void>;
  confirmSalePickup: (sale: Sale) => void;
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
  const isSuperAdmin = user?.id === SUPER_ADMIN_UID;

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
      const companiesRef = collection(firestore, 'companies');
      const companyQuery = query(companiesRef, where("name", "==", companyDomain));
      const companySnapshot = await getDocs(companyQuery);
  
      if (companySnapshot.empty) {
        throw new Error(`Empresa "${companyDomain}" não encontrada.`);
      }
      
      const companyDoc = companySnapshot.docs[0];
      const foundCompanyId = companyDoc.id;
  
      const employeesRef = collection(firestore, `companies/${foundCompanyId}/employees`);
      const userQuery = query(employeesRef, where("username", "==", username));
      const userSnapshot = await getDocs(userQuery);
  
      if (userSnapshot.empty) {
        throw new Error(`Utilizador "${username}" não encontrado na empresa "${companyDomain}".`);
      }
  
      const userDoc = userSnapshot.docs[0];
      const userData = userDoc.data() as Employee;
      
      const storedPass = userData.password || '';
      const encodedInputPass = Buffer.from(pass).toString('base64');
      
      if (storedPass === encodedInputPass || storedPass === pass) {
        const permissions = userData.permissions || {};
        const userToStore: Employee = { 
            ...userData,
            id: userDoc.id,
            permissions: permissions,
            token: { 
                companyId: foundCompanyId,
                role: userData.role,
                permissions: permissions
            }
        };
        delete userToStore.password;

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
      await runTransaction(firestore, async (transaction) => {
        const companiesRef = collection(firestore, 'companies');
        const companyQuery = query(companiesRef, where('name', '==', normalizedCompanyName));
        const existingCompanySnapshot = await getDocs(companyQuery);
        if (!existingCompanySnapshot.empty) {
          throw new Error('Uma empresa com este nome já existe.');
        }
        
        const newCompanyRef = doc(companiesRef);
        transaction.set(newCompanyRef, { name: normalizedCompanyName });

        const employeesCollectionRef = collection(firestore, `companies/${newCompanyRef.id}/employees`);
        const newEmployeeRef = doc(employeesCollectionRef);
        
        const adminPermissions = allPermissions.reduce((acc, p) => {
          acc[p.id] = 'write';
          return acc;
        }, {} as Record<ModulePermission, PermissionLevel>);
        
        transaction.set(newEmployeeRef, {
          username: adminUsername.split('@')[0],
          password: Buffer.from(adminPass).toString('base64'),
          role: 'Admin',
          companyId: newCompanyRef.id,
          permissions: adminPermissions
        });
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

  const logout = useCallback(() => {
    setUser(null);
    setCompanyId(null);
    localStorage.removeItem('majorstockx-user');
    localStorage.removeItem('majorstockx-company-id');
    router.push('/login');
    toast({ title: "Sessão terminada", description: "Foi desconectado com sucesso." });
  }, [router, toast]);

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


  const isDataLoading = authLoading || productsLoading || salesLoading || productionsLoading || ordersLoading || catalogProductsLoading || catalogCategoriesLoading;

  const value: InventoryContextType = {
    user, companyId, isSuperAdmin, loading: isDataLoading,
    login, logout, registerCompany,
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
