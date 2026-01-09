
'use client';

import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import type { Product, Location, Sale, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useCollection,
  useDoc,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { useUser as useAuthUser } from '@/firebase/auth/use-user';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { initialCatalog } from '@/lib/data';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;
type CatalogCategory = { id: string; name: string };

interface InventoryContextType {
  products: Product[];
  sales: Sale[];
  users: User[];
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
    productId: string,
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
  const firestore = useFirestore();
  const { user: authUser, loading: authLoading } = useAuthUser();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, `users/${authUser.uid}`);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: profileLoading } = useDoc<User>(userProfileRef);

  const companyId = userProfile?.companyId;

  const productsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `users/${companyId}/products`);
  }, [firestore, companyId]);

  const salesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `users/${companyId}/sales`);
  }, [firestore, companyId]);

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return query(collection(firestore, 'users'), where('companyId', '==', companyId));
  }, [firestore, companyId]);

  const catalogProductsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `users/${companyId}/catalogProducts`);
  }, [firestore, companyId]);

  const catalogCategoriesCollectionRef = useMemoFirebase(() => {
    if (!firestore || !companyId) return null;
    return collection(firestore, `users/${companyId}/catalogCategories`);
  }, [firestore, companyId]);

  const { data: productsData, isLoading: productsLoading } =
    useCollection<Product>(productsCollectionRef);
  
  const { data: salesData, isLoading: salesLoading } =
    useCollection<Sale>(salesCollectionRef);

  const { data: usersData, isLoading: usersLoading } =
    useCollection<User>(usersCollectionRef);
  
  const { data: catalogProductsData, isLoading: catalogProductsLoading } = 
    useCollection<CatalogProduct>(catalogProductsCollectionRef);

  const { data: catalogCategoriesData, isLoading: catalogCategoriesLoading } =
    useCollection<CatalogCategory>(catalogCategoriesCollectionRef);

  const products = useMemo(() => {
    if (!productsData) return [];
    return productsData.map(p => ({ ...p, instanceId: p.instanceId || self.crypto.randomUUID() }));
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
      
      const newProduct: Omit<Product, 'id'> = {
        name: newProductData.name,
        category: newProductData.category,
        price: newProductData.price,
        stock: newProductData.stock,
        lowStockThreshold: newProductData.lowStockThreshold,
        criticalStockThreshold: newProductData.criticalStockThreshold,
        instanceId: self.crypto.randomUUID(), // For unique key in UI, not the doc ID
        lastUpdated: new Date().toISOString().split('T')[0],
        location:
          newProductData.location ||
          (locations.length > 0 ? locations[0].id : 'Principal'),
        reservedStock: 0,
      };
      addDocumentNonBlocking(productsCollectionRef, newProduct);
    },
    [productsCollectionRef, locations]
  );
  
  const seedInitialCatalog = useCallback(async () => {
    if (!catalogProductsCollectionRef || !catalogCategoriesCollectionRef || !companyId || !firestore) {
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
    const categoryNames = Object.keys(initialCatalog);
    const categoryNameSet = new Set<string>();
  
    for (const category in initialCatalog) {
      categoryNameSet.add(category);
      for (const subType in initialCatalog[category]) {
        const items = initialCatalog[category][subType];
        items.forEach((itemName: string) => {
          const docRef = doc(catalogProductsCollectionRef);
          const productData = {
            id: docRef.id,
            name: `${itemName} ${subType}`.trim(),
            category: category,
            price: 0, // Default price
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
        batch.set(docRef, { id: docRef.id, name });
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
  }, [catalogProductsCollectionRef, catalogCategoriesCollectionRef, companyId, firestore, toast]);

  const updateProduct = useCallback(
    (instanceId: string, updatedData: Partial<Product>) => {
      const productToUpdate = products.find((p) => p.instanceId === instanceId);
      if (!productToUpdate || !firestore || !companyId || !productToUpdate.id) return;

      const docRef = doc(
        firestore,
        `users/${companyId}/products`,
        productToUpdate.id
      );
      updateDocumentNonBlocking(docRef, {
        ...updatedData,
        lastUpdated: new Date().toISOString().split('T')[0],
      });
    },
    [products, firestore, companyId]
  );

  const deleteProduct = useCallback(
    (instanceId: string) => {
      const productToDelete = products.find((p) => p.instanceId === instanceId);
      if (!productToDelete || !firestore || !companyId || !productToDelete.id) return;

      const docRef = doc(
        firestore,
        `users/${companyId}/products`,
        productToDelete.id
      );
      deleteDocumentNonBlocking(docRef);
    },
    [products, firestore, companyId]
  );

  const transferStock = useCallback(
    async (
      productId: string,
      fromLocationId: string,
      toLocationId: string,
      quantity: number
    ) => {
      if (!firestore || !companyId) return;

      // Note: This logic assumes productId is the base ID, not instance ID
      const fromProduct = products.find(
        (p) => p.name === productId && p.location === fromLocationId
      );
      const toProduct = products.find(
        (p) => p.name === productId && p.location === toLocationId
      );

      if (!fromProduct) {
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

      if(fromProduct.id){
        const fromDocRef = doc(
          firestore,
          `users/${companyId}/products`,
          fromProduct.id
        );
        batch.update(fromDocRef, { stock: fromProduct.stock - quantity });
      }

      if (toProduct && toProduct.id) {
        const toDocRef = doc(
          firestore,
          `users/${companyId}/products`,
          toProduct.id
        );
        batch.update(toDocRef, { stock: toProduct.stock + quantity });
      } else {
        const newProductData = {
          ...fromProduct,
          location: toLocationId,
          stock: quantity,
          reservedStock: 0,
          lastUpdated: new Date().toISOString().split('T')[0],
          instanceId: self.crypto.randomUUID(),
        };
        delete newProductData.id;
        const newDocRef = doc(
          collection(firestore, `users/${companyId}/products`)
        );
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
          description:
            'Ocorreu um erro ao transferir o stock. Tente novamente.',
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
        const docRef = doc(
          firestore,
          `users/${companyId}/products`,
          existingInstance.id
        );
        updateDocumentNonBlocking(docRef, {
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
        const newProductData = {
          name: catalogProduct.name,
          category: catalogProduct.category,
          price: catalogProduct.price,
          lowStockThreshold: catalogProduct.lowStockThreshold,
          criticalStockThreshold: catalogProduct.criticalStockThreshold,
          unit: catalogProduct.unit,
          stock: quantity,
          reservedStock: 0,
          location: targetLocation,
          lastUpdated: new Date().toISOString().split('T')[0],
          instanceId: self.crypto.randomUUID(),
        };
        const productsRef = collection(
          firestore,
          `users/${companyId}/products`
        );
        addDocumentNonBlocking(productsRef, newProductData);
      }
    },
    [firestore, companyId, products, catalogProductsData, isMultiLocation, locations, toast]
  );
  
  const clearProductsCollection = useCallback(async () => {
    if (!productsCollectionRef || !companyId) {
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
  }, [productsCollectionRef, companyId, firestore, toast]);

  const value: InventoryContextType = {
    products,
    sales: salesData || [],
    users: usersData || [],
    catalogProducts: catalogProductsData || [],
    catalogCategories: catalogCategoriesData || [],
    locations,
    isMultiLocation,
    loading: authLoading || profileLoading || productsLoading || catalogProductsLoading || catalogCategoriesLoading || salesLoading || usersLoading,
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
