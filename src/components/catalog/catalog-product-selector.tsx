
'use client';

import { useState, useMemo } from 'react';
import type { Product } from '@/lib/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
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

type CatalogProduct = Omit<Product, 'stock' | 'instanceId' | 'reservedStock' | 'location' | 'lastUpdated'>;
type CatalogCategory = { id: string; name: string };

interface CatalogProductSelectorProps {
  products: CatalogProduct[];
  categories: CatalogCategory[];
  selectedValue: string;
  onValueChange: (value: string) => void;
}

export function CatalogProductSelector({ products, categories, selectedValue, onValueChange }: CatalogProductSelectorProps) {
  const [open, setOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const filteredProducts = useMemo(() => {
    if (categoryFilter === 'all') {
      return products;
    }
    return products.filter(p => p.category === categoryFilter);
  }, [products, categoryFilter]);

  const selectedProductName = useMemo(() => {
    return products.find(p => p.name === selectedValue)?.name || "Selecione um produto...";
  }, [products, selectedValue]);

  return (
    <div className="flex gap-2">
      <Select onValueChange={setCategoryFilter} defaultValue="all">
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas</SelectItem>
          {categories.sort((a,b) => a.name.localeCompare(b.name)).map(cat => (
            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">{selectedProductName}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Pesquisar produto..." />
            <CommandList>
              <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
              <CommandGroup>
                {filteredProducts.sort((a,b) => a.name.localeCompare(b.name)).map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === selectedValue ? "" : product.name);
                      setOpen(false);
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
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
