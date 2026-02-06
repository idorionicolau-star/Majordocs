
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
import { cn, normalizeString, calculateSimilarity } from '@/lib/utils';
import { ScrollArea } from '../ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

  const [isSimilarityWarningOpen, setIsSimilarityWarningOpen] = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState<CatalogProduct[]>([]);
  const [potentialDuplicateName, setPotentialDuplicateName] = useState('');

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
                      const candidates = products.filter(p => calculateSimilarity(p.name, searchQuery) >= 0.7);
                      if (candidates.length > 0) {
                        setSimilarCandidates(candidates);
                        setPotentialDuplicateName(searchQuery);
                        setIsSimilarityWarningOpen(true);
                      } else {
                        setQuickCreateName(searchQuery);
                        setIsQuickCreateOpen(true);
                      }
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

      <Dialog open={isSimilarityWarningOpen} onOpenChange={setIsSimilarityWarningOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Produtos Semelhantes Encontrados</DialogTitle>
            <DialogDescription>
              Encontrámos produtos com nomes semelhantes a "{potentialDuplicateName}". Deseja usar um destes ou criar um novo mesmo assim?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            {similarCandidates.map(candidate => (
              <Button
                key={candidate.id}
                variant="outline"
                className="justify-start"
                onClick={() => {
                  setSearchQuery(candidate.name);
                  onValueChange(candidate.name, candidate);
                  setIsSimilarityWarningOpen(false);
                  setSimilarCandidates([]);
                }}
              >
                <Check className="mr-2 h-4 w-4 text-green-500" />
                Usar: {candidate.name}
              </Button>
            ))}
            <div className="border-t my-2"></div>
            <Button
              variant="destructive"
              onClick={() => {
                setQuickCreateName(potentialDuplicateName);
                setIsSimilarityWarningOpen(false);
                setIsQuickCreateOpen(true);
                setSimilarCandidates([]);
              }}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Criar "{potentialDuplicateName}" (Novo)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QuickCreateProductDialog
        open={isQuickCreateOpen}
        onOpenChange={setIsQuickCreateOpen}
        defaultName={quickCreateName}
        onSuccess={(newName) => {
          onValueChange(newName, undefined);
          setSearchQuery('');
        }}
      />
    </div>
  );
}
