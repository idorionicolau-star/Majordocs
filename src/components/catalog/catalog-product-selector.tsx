
'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { cn, normalizeString } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import dynamic from 'next/dynamic';
// Dynamically import QuickCreateProductDialog to avoid circular dependency initialization issues
const QuickCreateProductDialog = dynamic(() => import('./quick-create-product-dialog').then(mod => mod.QuickCreateProductDialog), {
  loading: () => null,
  ssr: false
});

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
      const normalizedQuery = normalizeString(searchQuery);
      prods = prods.filter(p => normalizeString(p.name).includes(normalizedQuery));
    }
    return prods;
  }, [products, categoryFilter, searchQuery]);

  const selectedProduct = products.find(p => p.name === selectedValue);

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState('');

  // Import dynamically or at top? Top is better for React components.
  // Added import at top via separate instruction if possible, or just assume I can add it here if I replace the whole file or use multi-replace to add import. 
  // I'll assume I need to add import. I will do it in a separate edit or use multi_replace for safer editing.

  // Actually, I'll use multi_replace to handle imports and the component body.


  // Sync searchQuery with selectedValue when it changes externally (e.g. form reset)
  useEffect(() => {
    setSearchQuery(selectedValue || '');
  }, [selectedValue]);

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    // Check if the typed value matches a product exactly
    const match = products.find(p => p.name.toLowerCase() === val.toLowerCase());
    onValueChange(val, match);
  };

  return (
    <div className="flex flex-col gap-2">
      <Select onValueChange={setCategoryFilter} defaultValue="all">
        <SelectTrigger>
          <SelectValue placeholder="Filtrar por Categoria" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Categorias</SelectItem>
          {categories.sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="rounded-md border">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nome do produto..."
            value={searchQuery}
            onValueChange={handleInputChange}
          />
          <ScrollArea className="h-32">
            <CommandList>
              <CommandEmpty>
                {searchQuery ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    Nenhum produto encontrado. O nome será usado para um novo produto.
                  </div>
                ) : 'Comece a digitar...'}
              </CommandEmpty>
              <CommandGroup>
                {searchQuery.length > 0 && !filteredProducts.some(p => normalizeString(p.name) === normalizeString(searchQuery)) && (
                  <CommandItem
                    key="create-new"
                    value={`CREATE:${searchQuery}`}
                    onSelect={() => {
                      // Keep the typed name, just open the dialog to "Quick Create" if they want to add to catalog explicitly
                      setQuickCreateName(searchQuery);
                      setIsQuickCreateOpen(true);
                    }}
                    className="cursor-pointer text-blue-600 font-medium"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    <span>Adicionar "{searchQuery}" ao Catálogo</span>
                  </CommandItem>
                )}
                {filteredProducts.sort((a, b) => a.name.localeCompare(b.name)).map((product) => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    onSelect={() => {
                      // On click, we enforce the exact name and product object
                      setSearchQuery(product.name);
                      onValueChange(product.name, product);
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

      <QuickCreateProductDialog
        open={isQuickCreateOpen}
        onOpenChange={setIsQuickCreateOpen}
        defaultName={quickCreateName}
        onSuccess={(newName) => {
          // We set the value immediately. The product might not be in the 'products' list yet 
          // until the context updates, but we want the UI to reflect the selection.
          onValueChange(newName, undefined);
          setSearchQuery(''); // Clear search on success
        }}
      />
    </div>
  );
}
