
"use client";

import { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { products as initialProducts } from '@/lib/data';
import type { Product, Location } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface InventoryContextType {
  products: Product[];
  locations: Location[];
  isMultiLocation: boolean;
  addProduct: (newProductData: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => void;
  updateProduct: (instanceId: string, updatedData: Partial<Product>) => void;
  deleteProduct: (instanceId: string) => void;
  transferStock: (productId: string, fromLocationId: string, toLocationId: string, quantity: number) => void;
  updateProductStock: (productName: string, quantity: number, locationId?: string) => void;
}

export const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isMultiLocation, setIsMultiLocation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Simulate fetching initial data
    setProducts(initialProducts.map(p => ({...p, instanceId: self.crypto.randomUUID() })));

    if (typeof window !== 'undefined') {
      const multiLocationEnabled = localStorage.getItem('majorstockx-multi-location-enabled') === 'true';
      setIsMultiLocation(multiLocationEnabled);
      
      const storedLocations = localStorage.getItem('majorstockx-locations');
      if (storedLocations) {
        setLocations(JSON.parse(storedLocations));
      }
    }
  }, []);

  const addProduct = useCallback((newProductData: Omit<Product, 'id' | 'lastUpdated' | 'instanceId' | 'reservedStock'>) => {
    setProducts(prevProducts => {
       const product: Product = {
        ...newProductData,
        id: `PROD${(prevProducts.length + 1).toString().padStart(3, '0')}`,
        lastUpdated: new Date().toISOString().split('T')[0],
        location: newProductData.location || (locations.length > 0 ? locations[0].id : 'Principal'),
        instanceId: self.crypto.randomUUID(),
        reservedStock: 0,
      };
      return [product, ...prevProducts];
    });
  }, [locations]);

  const updateProduct = useCallback((instanceId: string, updatedData: Partial<Product>) => {
    setProducts(prevProducts => 
      prevProducts.map(p => 
        p.instanceId === instanceId 
          ? { ...p, ...updatedData, lastUpdated: new Date().toISOString().split('T')[0] } 
          : p
      )
    );
  }, []);

  const deleteProduct = useCallback((instanceId: string) => {
    setProducts(prevProducts => prevProducts.filter(p => p.instanceId !== instanceId));
  }, []);

  const transferStock = useCallback((productId: string, fromLocationId: string, toLocationId: string, quantity: number) => {
    setProducts(prevProducts => {
      let fromProductInstance: Product | undefined;
      let toProductInstance: Product | undefined;

      // First pass to find the instances and decrease stock from the source
      const tempProducts = prevProducts.map(p => {
          if (p.id === productId && p.location === fromLocationId) {
              fromProductInstance = p;
              return { ...p, stock: p.stock - quantity, lastUpdated: new Date().toISOString().split('T')[0] };
          }
           if (p.id === productId && p.location === toLocationId) {
              toProductInstance = p;
          }
          return p;
      });

      if (toProductInstance) {
          // Product already exists in destination, just update stock
          return tempProducts.map(p => 
              p.instanceId === toProductInstance!.instanceId 
              ? { ...p, stock: p.stock + quantity, lastUpdated: new Date().toISOString().split('T')[0] } 
              : p
          );
      } else if (fromProductInstance) {
          // Product does not exist in destination, create a new instance
          const newInstance: Product = {
              ...(fromProductInstance as Product), // We know it's defined if we get here
              instanceId: self.crypto.randomUUID(),
              location: toLocationId,
              stock: quantity,
              reservedStock: 0, // A new instance in a location starts with 0 reserved
              lastUpdated: new Date().toISOString().split('T')[0],
          };
          return [...tempProducts, newInstance];
      }
      return prevProducts; // Return original state if something went wrong
    });
  }, []);

  const updateProductStock = useCallback((productName: string, quantity: number, locationId?: string) => {
    setProducts(prevProducts => {
        const targetLocation = locationId || (isMultiLocation && locations.length > 0 ? locations[0].id : 'Principal');
        
        const productBase = prevProducts.find(p => p.name === productName);
        if (!productBase) {
            toast({ variant: "destructive", title: "Erro", description: `Produto base "${productName}" não encontrado no catálogo.`});
            return prevProducts;
        }

        const existingInstance = prevProducts.find(p => p.name === productName && p.location === targetLocation);

        if (existingInstance) {
            // Update stock of existing instance
            return prevProducts.map(p => 
                p.instanceId === existingInstance.instanceId
                ? { ...p, stock: p.stock + quantity, lastUpdated: new Date().toISOString().split('T')[0] }
                : p
            );
        } else {
            // Create a new product instance for the target location
            const newInstance: Product = {
                ...productBase,
                id: productBase.id, // Ensure it shares the same base ID
                instanceId: self.crypto.randomUUID(),
                stock: quantity,
                reservedStock: 0,
                location: targetLocation,
                lastUpdated: new Date().toISOString().split('T')[0],
            };
            return [...prevProducts, newInstance];
        }
    });
  }, [isMultiLocation, locations, toast]);


  const value: InventoryContextType = {
    products,
    locations,
    isMultiLocation,
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
