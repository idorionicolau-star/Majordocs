
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
import type { Product, Location } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  useFirestore,
  useCollection,
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
} from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';
import { initialCatalog } from '@/lib/data';

interface InventoryContextType {
  products: Product[];
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
  const { user } = useUser();
  const { toast } = useToast();

  const productsCollectionRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/products`);
  }, [firestore, user]);

  const { data: productsData, isLoading: productsLoading } =
    useCollection<Product>(productsCollectionRef);
    
  const products = useMemo(() => {
    if (!productsData) return [];
    // Adiciona um instanceId único a cada produto para renderização na UI
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
    if (!productsCollectionRef || !user || !firestore) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "A base de dados não está pronta. Tente novamente.",
      });
      return;
    }
  
    // Verificação para não popular o catálogo se já existirem produtos
    if (products.length > 0) {
      toast({
        title: "Catálogo já existente",
        description: "O catálogo de produtos já foi carregado anteriormente.",
      });
      return;
    }
  
    toast({
      title: "A carregar catálogo...",
      description: "Por favor, aguarde enquanto os produtos são adicionados.",
    });
  
    const batch = writeBatch(firestore);
  
    for (const category in initialCatalog) {
      for (const subType in initialCatalog[category]) {
        const items = initialCatalog[category][subType];
        items.forEach((itemName: string) => {
          const docRef = doc(productsCollectionRef);
          const productData = {
            name: `${itemName} ${subType}`,
            category: category,
            subType: subType,
            price: 0,
            lowStockThreshold: 10,
            criticalStockThreshold: 5,
            unit: "un",
            stock: 0, 
            reservedStock: 0,
            lastUpdated: new Date().toISOString().split('T')[0],
            location: 'Principal', // Localização padrão
            instanceId: self.crypto.randomUUID(),
          };
          batch.set(docRef, productData);
        });
      }
    }
  
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
  }, [productsCollectionRef, user, firestore, toast, products]);

  const updateProduct = useCallback(
    (instanceId: string, updatedData: Partial<Product>) => {
      const productToUpdate = products.find((p) => p.instanceId === instanceId);
      if (!productToUpdate || !firestore || !user || !productToUpdate.id) return;

      const docRef = doc(
        firestore,
        `users/${user.uid}/products`,
        productToUpdate.id
      );
      updateDocumentNonBlocking(docRef, {
        ...updatedData,
        lastUpdated: new Date().toISOString().split('T')[0],
      });
    },
    [products, firestore, user]
  );

  const deleteProduct = useCallback(
    (instanceId: string) => {
      const productToDelete = products.find((p) => p.instanceId === instanceId);
      if (!productToDelete || !firestore || !user || !productToDelete.id) return;

      const docRef = doc(
        firestore,
        `users/${user.uid}/products`,
        productToDelete.id
      );
      deleteDocumentNonBlocking(docRef);
    },
    [products, firestore, user]
  );

  const transferStock = useCallback(
    async (
      productId: string,
      fromLocationId: string,
      toLocationId: string,
      quantity: number
    ) => {
      if (!firestore || !user) return;

      const fromProduct = products.find(
        (p) => p.id === productId && p.location === fromLocationId
      );
      const toProduct = products.find(
        (p) => p.id === productId && p.location === toLocationId
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
        // Decrease stock from source
        const fromDocRef = doc(
          firestore,
          `users/${user.uid}/products`,
          fromProduct.id
        );
        batch.update(fromDocRef, { stock: fromProduct.stock - quantity });
      }

      if (toProduct && toProduct.id) {
        // Increase stock in destination
        const toDocRef = doc(
          firestore,
          `users/${user.uid}/products`,
          toProduct.id
        );
        batch.update(toDocRef, { stock: toProduct.stock + quantity });
      } else {
        // Create new product instance in destination
        const newProductData = {
          ...fromProduct,
          location: toLocationId,
          stock: quantity,
          reservedStock: 0, // New instances start with 0 reserved
          lastUpdated: new Date().toISOString().split('T')[0],
          instanceId: self.crypto.randomUUID(),
        };
        delete newProductData.id; // Firestore will generate new ID
        const newDocRef = doc(
          collection(firestore, `users/${user.uid}/products`)
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
    [firestore, user, products, toast]
  );

  const updateProductStock = useCallback(
    async (productName: string, quantity: number, locationId?: string) => {
      if (!firestore || !user) return;

      const targetLocation =
        locationId ||
        (isMultiLocation && locations.length > 0
          ? locations[0].id
          : 'Principal');
      const productBase = products.find((p) => p.name === productName);

      const existingInstance = products.find(
        (p) => p.name === productName && p.location === targetLocation
      );

      if (existingInstance && existingInstance.id) {
        const docRef = doc(
          firestore,
          `users/${user.uid}/products`,
          existingInstance.id
        );
        updateDocumentNonBlocking(docRef, {
          stock: existingInstance.stock + quantity,
        });
      } else {
        if (!productBase) {
           toast({
            variant: 'destructive',
            title: 'Produto Base Não Encontrado',
            description: `O produto "${productName}" não existe no catálogo base. Adicione-o no catálogo antes de registar produção.`,
          });
          return;
        }
        const newProductData = {
          ...productBase,
          stock: quantity,
          reservedStock: 0,
          location: targetLocation,
          lastUpdated: new Date().toISOString().split('T')[0],
          instanceId: self.crypto.randomUUID(),
        };
        delete newProductData.id; // Let firestore generate the ID
        const productsRef = collection(
          firestore,
          `users/${user.uid}/products`
        );
        addDocumentNonBlocking(productsRef, newProductData);
      }
    },
    [firestore, user, products, isMultiLocation, locations, toast]
  );
  
  const clearProductsCollection = useCallback(async () => {
    if (!productsCollectionRef || !user) {
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
  }, [productsCollectionRef, user, firestore, toast]);

  const value: InventoryContextType = {
    products,
    locations,
    isMultiLocation,
    loading: productsLoading,
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
