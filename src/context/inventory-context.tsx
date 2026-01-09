
'use client';

import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import type { Product, Location, Sale, Production, Order, User, Company } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { useUser } from '@/firebase/auth/use-user';
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
} from 'firebase/firestore';
import { initialCatalog } from '@/lib/data';

type CatalogProduct = Omit<
  Product,
  'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'
>;
type CatalogCategory = { id: string; name: string };

interface InventoryContextType {
  companyId: string | null;
  userData: User | null;
  companyData: Company | null;
  products: Product[];
  sales: Sale[];
  productions: Production[];
  orders: Order[];
  catalogProducts: CatalogProduct[];
  catalogCategories: CatalogCategory[];
  locations: Location[];
  isMultiLocation: boolean;
  loading: boolean;
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
  clearProductsCollection: () => Promise<void>;
}

export const InventoryContext = createContext<InventoryContextType | undefined>(
  undefined
);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userData, isLoading: userLoading } = useDoc<User>(userDocRef);
  
  // **LÓGICA DA `companyId` - PASSO 4: UTILIZAÇÃO CENTRALIZADA**
  // A `companyId` é obtida a partir do perfil do utilizador autenticado.
  const companyId = userData?.companyId;

  // Todas as consultas subsequentes utilizam esta `companyId` para garantir
  // que apenas os dados da empresa correta são acedidos.
  const companyDocRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return doc(firestore, 'companies', companyId);
  }, [firestore, companyId]);
  const { data: companyData, isLoading: companyLoading } = useDoc<Company>(companyDocRef);

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

  const { data: productsData, isLoading: productsLoading } =
    useCollection<Product>(productsCollectionRef);
  const { data: salesData, isLoading: salesLoading } =
    useCollection<Sale>(salesCollectionRef);
   const { data: productionsData, isLoading: productionsLoading } =
    useCollection<Production>(productionsCollectionRef);
   const { data: ordersData, isLoading: ordersLoading } =
    useCollection<Order>(ordersCollectionRef);
  const { data: catalogProductsData, isLoading: catalogProductsLoading } =
    useCollection<CatalogProduct>(catalogProductsCollectionRef);
  const {
    data: catalogCategoriesData,
    isLoading: catalogCategoriesLoading,
  } = useCollection<CatalogCategory>(catalogCategoriesCollectionRef);

  const products = useMemo(() => {
    if (!productsData) return [];
    return productsData.map((p) => ({
      ...p,
      instanceId: p.id,
    }));
  }, [productsData]);

  const [locations, setLocations] = useState<Location[]>([]);
  const [isMultiLocation, setIsMultiLocation] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const multiLocationEnabled =
        localStorage.getItem('majorstockx-multi-location-enabled') === 'true';
      setIsMultiLocation(multiLocationEnabled);

      const storedLocations = localStorage.getItem('majorstockx-locations');
      if (storedLocations) {
        setLocations(JSON.parse(storedLocations));
      }
    }
  }, []);

 const addProduct = useCallback(
    (
      newProductData: Omit<
        Product,
        'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'
      >
    ) => {
      if (!productsCollectionRef) return;
      
      const newProduct: Omit<Product, 'id' | 'instanceId'> = {
        name: newProductData.name,
        category: newProductData.category,
        price: newProductData.price,
        stock: newProductData.stock,
        lowStockThreshold: newProductData.lowStockThreshold,
        criticalStockThreshold: newProductData.criticalStockThreshold,
        lastUpdated: new Date().toISOString().split('T')[0],
        location:
          newProductData.location ||
          (locations.length > 0 ? locations[0].id : 'Principal'),
        reservedStock: 0,
      };
      addDoc(productsCollectionRef, newProduct);
    },
    [productsCollectionRef, locations]
  );
  
  const seedInitialCatalog = useCallback(async () => {
    if (!catalogProductsCollectionRef || !catalogCategoriesCollectionRef || !firestore) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A base de dados não está pronta. Tente novamente.",
      });
      return;
    }

    const existingProducts = await getDocs(query(catalogProductsCollectionRef));
    if (!existingProducts.empty) {
      toast({
        title: "Catálogo já existente",
        description: "O catálogo de produtos base já foi carregado.",
      });
      return;
    }
  
    toast({
      title: "A carregar catálogo...",
      description: "Por favor, aguarde enquanto os produtos e categorias são criados.",
    });
  
    const batch = writeBatch(firestore);
    const categoryNameSet = new Set<string>();
  
    for (const category in initialCatalog) {
      categoryNameSet.add(category);
      for (const subType in initialCatalog[category]) {
        const items = initialCatalog[category][subType];
        items.forEach((itemName: string) => {
          const docRef = doc(catalogProductsCollectionRef);
          const productData = {
            name: `${itemName} ${subType}`.trim(),
            category: category,
            price: 0,
            lowStockThreshold: 10,
            criticalStockThreshold: 5,
            unit: "un",
          };
          batch.set(docRef, productData);
        });
      }
    }

    categoryNameSet.forEach(name => {
        const docRef = doc(catalogCategoriesCollectionRef);
        batch.set(docRef, { name });
    });
  
    try {
      await batch.commit();
      toast({
        title: "Sucesso!",
        description: "Catálogo inicial de produtos carregado com sucesso.",
      });
    } catch (error) {
      console.error("Error seeding catalog: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar o catálogo",
        description: "Ocorreu um problema ao tentar guardar os produtos.",
      });
    }
  }, [catalogProductsCollectionRef, catalogCategoriesCollectionRef, firestore, toast]);

  const updateProduct = useCallback(
    (instanceId: string, updatedData: Partial<Product>) => {
       if (!productsCollectionRef || !instanceId) return;

      const docRef = doc(productsCollectionRef, instanceId);
      updateDoc(docRef, {
        ...updatedData,
        lastUpdated: new Date().toISOString().split('T')[0],
      });
    },
    [productsCollectionRef]
  );

  const deleteProduct = useCallback(
    (instanceId: string) => {
       if (!productsCollectionRef || !instanceId) return;
       const docRef = doc(productsCollectionRef, instanceId);
      deleteDoc(docRef);
    },
    [productsCollectionRef]
  );

  const transferStock = useCallback(
    async (
      productName: string,
      fromLocationId: string,
      toLocationId: string,
      quantity: number
    ) => {
      if (!firestore || !companyId) return;

      const fromProduct = products.find(
        (p) => p.name === productName && p.location === fromLocationId
      );
      const toProduct = products.find(
        (p) => p.name === productName && p.location === toLocationId
      );

      if (!fromProduct || !fromProduct.id) {
        toast({
          variant: 'destructive',
          title: 'Erro na Transferência',
          description: 'Produto de origem não encontrado.',
        });
        return;
      }
      if (fromProduct.stock < quantity) {
        toast({
          variant: 'destructive',
          title: 'Stock Insuficiente',
          description: 'Não há stock suficiente na localização de origem.',
        });
        return;
      }

      const batch = writeBatch(firestore);
      const productsRef = collection(firestore, `companies/${companyId}/products`);

      const fromDocRef = doc(productsRef, fromProduct.id);
      batch.update(fromDocRef, { stock: fromProduct.stock - quantity });

      if (toProduct && toProduct.id) {
        const toDocRef = doc(productsRef, toProduct.id);
        batch.update(toDocRef, { stock: toProduct.stock + quantity });
      } else {
        const { id, instanceId, ...restOfProduct } = fromProduct;
        const newProductData = {
          ...restOfProduct,
          location: toLocationId,
          stock: quantity,
          reservedStock: 0,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
        const newDocRef = doc(productsRef);
        batch.set(newDocRef, newProductData);
      }

      try {
        await batch.commit();
        toast({
          title: 'Transferência Concluída',
          description: `Stock movido com sucesso.`,
        });
      } catch (error) {
        console.error('Error transferring stock:', error);
        toast({
          variant: 'destructive',
          title: 'Erro na Transferência',
          description: 'Ocorreu um erro ao transferir o stock. Tente novamente.',
        });
      }
    },
    [firestore, companyId, products, toast]
  );

  const updateProductStock = useCallback(
    async (productName: string, quantity: number, locationId?: string) => {
      if (!firestore || !companyId) return;

      const targetLocation =
        locationId ||
        (isMultiLocation && locations.length > 0
          ? locations[0].id
          : 'Principal');
      
      const catalogProduct = catalogProductsData?.find(p => p.name === productName);

      const existingInstance = products.find(
        (p) => p.name === productName && p.location === targetLocation
      );

      if (existingInstance && existingInstance.id) {
        const docRef = doc(firestore, `companies/${companyId}/products`, existingInstance.id);
        updateDoc(docRef, {
          stock: existingInstance.stock + quantity,
        });
      } else {
        if (!catalogProduct) {
           toast({
            variant: 'destructive',
            title: 'Produto Base Não Encontrado',
            description: `O produto "${productName}" não existe no catálogo base. Adicione-o no catálogo antes de registar produção.`,
          });
          return;
        }
        const { id, ...restOfCatalogProduct } = catalogProduct;
        const newProductData = {
          ...restOfCatalogProduct,
          stock: quantity,
          reservedStock: 0,
          location: targetLocation,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
        const productsRef = collection(firestore, `companies/${companyId}/products`);
        addDoc(productsRef, newProductData);
      }
    },
    [firestore, companyId, products, catalogProductsData, isMultiLocation, locations, toast]
  );

  const clearProductsCollection = useCallback(async () => {
    if (!productsCollectionRef) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível aceder à base de dados. Tente novamente.",
      });
      return;
    }

    try {
      const q = query(productsCollectionRef);
      const querySnapshot = await getDocs(q);
      const batch = writeBatch(firestore);
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error clearing products collection: ", error);
      toast({
        variant: "destructive",
        title: "Erro ao Limpar Coleção",
        description: "Ocorreu um problema ao tentar apagar os produtos.",
      });
    }
  }, [productsCollectionRef, firestore, toast]);

  const value: InventoryContextType = {
    companyId,
    userData: userData || null,
    companyData: companyData || null,
    products,
    sales: salesData || [],
    productions: productionsData || [],
    orders: ordersData || [],
    catalogProducts: catalogProductsData || [],
    catalogCategories: catalogCategoriesData || [],
    locations,
    isMultiLocation,
    loading: userLoading || companyLoading || productsLoading || salesLoading || productionsLoading || ordersLoading || catalogProductsLoading || catalogCategoriesLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    transferStock,
    updateProductStock,
    seedInitialCatalog,
    clearProductsCollection,
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}
