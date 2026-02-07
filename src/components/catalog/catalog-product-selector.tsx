
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { Product } from '@/lib/types';
import { Button } from "@/components/ui/button";
import { Check, PlusCircle, ChevronsUpDown, Search } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  placeholder?: string;
}

export function CatalogProductSelector({ products, categories, selectedValue, onValueChange, placeholder = "Selecionar produto..." }: CatalogProductSelectorProps) {
  const [open, setOpen] = useState(false);
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

  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [quickCreateName, setQuickCreateName] = useState('');
  const [isSimilarityWarningOpen, setIsSimilarityWarningOpen] = useState(false);
  const [similarCandidates, setSimilarCandidates] = useState<CatalogProduct[]>([]);
  const [potentialDuplicateName, setPotentialDuplicateName] = useState('');

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
  };

  const handleSelect = useCallback((name: string, product?: CatalogProduct) => {
    onValueChange(name, product);
    setOpen(false);
    setSearchQuery('');
  }, [onValueChange]);

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 px-3 font-normal"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="h-4 w-4 shrink-0 opacity-50" />
              {selectedValue ? (
                <span className="truncate">{selectedValue}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-2 border-b">
            <Select onValueChange={setCategoryFilter} value={categoryFilter}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Filtrar por Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Pesquisar produto..."
              value={searchQuery}
              onValueChange={handleInputChange}
              className="h-9"
            />
            <CommandList>
              <ScrollArea className="h-[200px]" thumbClassName="bg-slate-400 dark:bg-slate-600">
                <CommandEmpty>
                  {searchQuery ? (
                    <div className="p-4 text-sm text-center text-muted-foreground">
                      Nenhum produto encontrado.
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-center text-muted-foreground">
                      Comece a digitar...
                    </div>
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {searchQuery.length > 0 && !filteredProducts.some(p => normalizeString(p.name) === normalizeString(searchQuery)) && (
                    <CommandItem
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
                        setOpen(false);
                      }}
                      className="cursor-pointer text-primary font-medium"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span>Criar "{searchQuery}"</span>
                    </CommandItem>
                  )}
                  {filteredProducts.sort((a, b) => a.name.localeCompare(b.name)).map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => handleSelect(product.name, product)}
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
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
                className="justify-start focus-visible:ring-0"
                onClick={() => {
                  handleSelect(candidate.name, candidate);
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
          setOpen(false);
        }}
      />
    </div>
  );
}
