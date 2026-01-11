
'use client';

import { useState, useMemo } from 'react';
import type { Product } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
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
  onValueChange: (value: string) => void;
}

export function CatalogProductSelector({ products, categories, selectedValue, onValueChange }: CatalogProductSelectorProps) {
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all') {
      return products;
    }
    return products.filter(p => p.category === categoryFilter);
  }, [products, categoryFilter]);

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
            <CommandInput placeholder="Pesquisar produto..." />
            <ScrollArea className="h-[200px]">
              <CommandList>
                <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                <CommandGroup>
                  {filteredProducts.sort((a,b) => a.name.localeCompare(b.name)).map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={(currentValue) => {
                        onValueChange(currentValue === selectedValue ? "" : product.name);
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
