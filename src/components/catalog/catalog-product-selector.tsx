
'use client';

import { useState, useMemo } from 'react';
import type { Product } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Check, PlusCircle } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;
type CatalogCategory = { id: string; name: string };

interface CatalogProductSelectorProps {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  selectedValue: string;
  onValueChange: (value: string, product?: CatalogProduct) => void;
}

export function CatalogProductSelector({ products, categories, selectedValue, onValueChange }: CatalogProductSelectorProps) {
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    let prods = products;
    if (categoryFilter !== 'all') {
      prods = prods.filter(p => p.category === categoryFilter);
    }
    if (searchQuery) {
        prods = prods.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return prods;
  }, [products, categoryFilter, searchQuery]);
  
  const selectedProduct = products.find(p => p.name === selectedValue);

  return (
    <div className="flex flex-col gap-2">
      <Select onValueChange={setCategoryFilter} defaultValue="all">
        <SelectTrigger>
          <SelectValue placeholder="Filtrar por Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Categorias</SelectItem>
          {categories.sort((a,b) => a.name.localeCompare(b.name)).map(cat => (
            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="rounded-md border">
        <Command>
            <CommandInput 
                placeholder="Pesquisar produto..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
            />
            <ScrollArea className="h-32">
              <CommandList>
                <CommandEmpty>
                  {searchQuery ? `Nenhum produto encontrado para "${searchQuery}".` : 'Nenhum produto encontrado.'}
                </CommandEmpty>
                <CommandGroup>
                  {searchQuery.length > 0 && !filteredProducts.some(p => p.name.toLowerCase() === searchQuery.toLowerCase()) && (
                     <CommandItem
                      key="create-new"
                      value={searchQuery}
                      onSelect={() => onValueChange(searchQuery, undefined)}
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span>Criar: "{searchQuery}"</span>
                    </CommandItem>
                  )}
                  {filteredProducts.sort((a,b) => a.name.localeCompare(b.name)).map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={(currentValue) => {
                        const selectedProd = products.find(p => p.name.toLowerCase() === currentValue.toLowerCase());
                        onValueChange(selectedProd?.name || "", selectedProd);
                        setSearchQuery('');
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedValue === product.name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {product.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </ScrollArea>
        </Command>
      </div>
    </div>
  );
}
