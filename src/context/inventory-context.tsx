
'use client';

import {
  createContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import type { Product, Location, Sale, User } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useCollection,
  useMemoFirebase,
} from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
} from 'firebase/firestore';
import {
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

// This will be the single path for all data, since auth is removed.
const DATA_PATH = 'appData/v1';

export function InventoryProvider({ children }: { children: ReactNode }) {
  const firestore = useFirestore();
  const { toast } = useToast();

  const productsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `${DATA_PATH}/products`);
  }, [firestore]);

  const salesCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `${DATA_PATH}/sales`);
  }, [firestore]);

  const catalogProductsCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `${DATA_PATH}/catalogProducts`);
  }, [firestore]);

  const catalogCategoriesCollectionRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, `${DATA_PATH}/catalogCategories`);
  }, [firestore]);

  const { data: productsData, isLoading: productsLoading } =
    useCollection<Product>(productsCollectionRef);
  
  const { data: salesData, isLoading: salesLoading } =
    useCollection<Sale>(salesCollectionRef);
  
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
        instanceId: self.crypto.randomUUID(),
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
            id: docRef.id,
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
  }, [catalogProductsCollectionRef, catalogCategoriesCollectionRef, firestore, toast]);

  const updateProduct = useCallback(
    (instanceId: string, updatedData: Partial<Product>) => {
      const productToUpdate = products.find((p) => p.instanceId === instanceId);
      if (!productToUpdate || !firestore || !productToUpdate.id) return;

      const docRef = doc(firestore, `${DATA_PATH}/products`, productToUpdate.id);
      updateDocumentNonBlocking(docRef, {
        ...updatedData,
        lastUpdated: new Date().toISOString().split('T')[0],
      });
    },
    [products, firestore]
  );

  const deleteProduct = useCallback(
    (instanceId: string) => {
      const productToDelete = products.find((p) => p.instanceId === instanceId);
      if (!productToDelete || !firestore || !productToDelete.id) return;

      const docRef = doc(firestore, `${DATA_PATH}/products`, productToDelete.id);
      deleteDocumentNonBlocking(docRef);
    },
    [products, firestore]
  );

  const transferStock = useCallback(
    async (
      productId: string,
      fromLocationId: string,
      toLocationId: string,
      quantity: number
    ) => {
      if (!firestore) return;

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
        const fromDocRef = doc(firestore, `${DATA_PATH}/products`, fromProduct.id);
        batch.update(fromDocRef, { stock: fromProduct.stock - quantity });
      }

      if (toProduct && toProduct.id) {
        const toDocRef = doc(firestore, `${DATA_PATH}/products`, toProduct.id);
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
        const newDocRef = doc(collection(firestore, `${DATA_PATH}/products`));
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
    [firestore, products, toast]
  );

  const updateProductStock = useCallback(
    async (productName: string, quantity: number, locationId?: string) => {
      if (!firestore) return;

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
        const docRef = doc(firestore, `${DATA_PATH}/products`, existingInstance.id);
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
        const productsRef = collection(firestore, `${DATA_PATH}/products`);
        addDocumentNonBlocking(productsRef, newProductData);
      }
    },
    [firestore, products, catalogProductsData, isMultiLocation, locations, toast]
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
    products,
    sales: salesData || [],
    users: [], // Users are removed
    catalogProducts: catalogProductsData || [],
    catalogCategories: catalogCategoriesData || [],
    locations,
    isMultiLocation,
    loading: productsLoading || catalogProductsLoading || catalogCategoriesLoading || salesLoading,
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
