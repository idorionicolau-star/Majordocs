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
} from 'firebase/firestore';
import { useUser } from '@/firebase/auth/use-user';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';

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

  const products = useMemo(() => productsData || [], [productsData]);

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
      const product: Omit<Product, 'id'> = {
        ...newProductData,
        instanceId: self.crypto.randomUUID(), // For unique key in UI, not the doc ID
        lastUpdated: new Date().toISOString().split('T')[0],
        location:
          newProductData.location ||
          (locations.length > 0 ? locations[0].id : 'Principal'),
        reservedStock: 0,
      };
      addDocumentNonBlocking(productsCollectionRef, product);
    },
    [productsCollectionRef, locations]
  );

  const updateProduct = useCallback(
    (instanceId: string, updatedData: Partial<Product>) => {
      const productToUpdate = products.find((p) => p.instanceId === instanceId);
      if (!productToUpdate || !firestore || !user) return;

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
      if (!productToDelete || !firestore || !user) return;

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

      // Decrease stock from source
      const fromDocRef = doc(
        firestore,
        `users/${user.uid}/products`,
        fromProduct.id
      );
      batch.update(fromDocRef, { stock: fromProduct.stock - quantity });

      if (toProduct) {
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

      if (!productBase) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: `Produto base "${productName}" não encontrado.`,
        });
        return;
      }

      const existingInstance = products.find(
        (p) => p.name === productName && p.location === targetLocation
      );

      if (existingInstance) {
        const docRef = doc(
          firestore,
          `users/${user.uid}/products`,
          existingInstance.id
        );
        updateDocumentNonBlocking(docRef, {
          stock: existingInstance.stock + quantity,
        });
      } else {
        const newProductData = {
          ...productBase,
          stock: quantity,
          reservedStock: 0,
          location: targetLocation,
          lastUpdated: new Date().toISOString().split('T')[0],
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
  };

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}
